const WORKER_MODE = 'worker';
const SESSION_PREFIX = 'dariws_';
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
      ...extraHeaders
    }
  });
}

function bytesToBase64(value) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < value.length; index += chunkSize) {
    const chunk = value.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : textEncoder.encode(value);

  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return textDecoder.decode(bytes);
}

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function getWorkerConfig(env = {}) {
  return {
    githubToken: env.GITHUB_TOKEN || '',
    adminSecret: env.ADMIN_SECRET || '',
    sessionSecret: env.SESSION_SECRET || '',
    githubOwner: env.GITHUB_OWNER || '',
    githubRepo: env.GITHUB_REPO || '',
    githubBranch: env.GITHUB_BRANCH || 'main',
    manifestPath: env.GALLERY_MANIFEST_PATH || 'gallery.json'
  };
}

function isWorkerConfigured(config) {
  return Boolean(
    config.githubToken &&
    config.adminSecret &&
    config.sessionSecret &&
    config.githubOwner &&
    config.githubRepo &&
    config.manifestPath
  );
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function createSessionToken(sessionSecret, now = Date.now()) {
  const payload = {
    iat: now,
    exp: now + DEFAULT_SESSION_TTL_MS
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signValue(encodedPayload, sessionSecret);
  return `${SESSION_PREFIX}${encodedPayload}.${signature}`;
}

async function verifySessionToken(token, sessionSecret, now = Date.now()) {
  if (!token || !token.startsWith(SESSION_PREFIX)) return false;
  const raw = token.slice(SESSION_PREFIX.length);
  const [encodedPayload, signature] = raw.split('.');
  if (!encodedPayload || !signature) return false;

  const expectedSignature = await signValue(encodedPayload, sessionSecret);
  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    return Number(payload.exp) > now;
  } catch {
    return false;
  }
}

async function commitManifestToGitHub(images, message, config, fetchImpl) {
  const apiBase = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${config.manifestPath}`;
  const authHeaders = {
    authorization: `Bearer ${config.githubToken}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'dari-hanonah-worker',
    'x-github-api-version': '2022-11-28'
  };

  const headResponse = await fetchImpl(`${apiBase}?ref=${encodeURIComponent(config.githubBranch)}`, {
    headers: authHeaders
  });

  if (!headResponse.ok) {
    console.error('GitHub head request failed', headResponse.status, await headResponse.text());
    throw new Error(`github-head-${headResponse.status}`);
  }

  const headBody = await headResponse.json();
  const manifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    images
  };

  const putResponse = await fetchImpl(apiBase, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      message: message || 'chore(gallery): update via worker',
      branch: config.githubBranch,
      sha: headBody.sha,
      content: bytesToBase64(textEncoder.encode(JSON.stringify(manifest, null, 2)))
    })
  });

  if (!putResponse.ok) {
    console.error('GitHub put request failed', putResponse.status, await putResponse.text());
    throw new Error(`github-put-${putResponse.status}`);
  }

  return manifest;
}

export async function handleWorkerRequest(request, context = {}, env = {}) {
  const url = new URL(request.url);
  const fetchImpl = context.fetchImpl || fetch;
  const config = getWorkerConfig(env);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type'
      }
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    return jsonResponse({
      ok: true,
      mode: WORKER_MODE,
      configured: isWorkerConfigured(config)
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await parseJsonBody(request);
    if (!body?.password || !config.adminSecret || !config.sessionSecret) {
      return jsonResponse({ ok: false, error: 'invalid-login-config' }, 400);
    }

    if (body.password !== config.adminSecret) {
      return jsonResponse({ ok: false, error: 'invalid-credentials' }, 401);
    }

    return jsonResponse({
      ok: true,
      token: await createSessionToken(config.sessionSecret)
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/gallery/manifest') {
    if (!isWorkerConfigured(config)) {
      return jsonResponse({ ok: false, error: 'worker-not-configured' }, 503);
    }

    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const isValidSession = await verifySessionToken(token, config.sessionSecret);
    if (!isValidSession) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
    }

    const body = await parseJsonBody(request);
    if (!body || !Array.isArray(body.images)) {
      return jsonResponse({ ok: false, error: 'invalid-payload' }, 400);
    }

    try {
      const manifest = await commitManifestToGitHub(body.images, body.message, config, fetchImpl);
      return jsonResponse({ ok: true, manifest });
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: error.message || 'github-request-failed'
      }, 502);
    }
  }

  return jsonResponse({ ok: false, error: 'not-found' }, 404);
}

export default {
  async fetch(request, env) {
    return handleWorkerRequest(request, { fetchImpl: fetch }, env);
  }
};

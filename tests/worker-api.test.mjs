import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSessionToken,
  handleWorkerRequest
} from '../cloudflare/worker.mjs';

function createJsonRequest(url, body, headers = {}) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function readJson(response) {
  return response.json();
}

function createWorkerRequest(url, body, headers = {}) {
  return {
    method: 'POST',
    url,
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] || null;
      }
    },
    async json() {
      return body;
    }
  };
}

test('health endpoint reports worker mode and missing configuration', async () => {
  const response = await handleWorkerRequest(new Request('https://worker.example/api/health'), {
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  }, {});

  assert.equal(response.status, 200);
  assert.deepEqual(await readJson(response), {
    ok: true,
    mode: 'worker',
    configured: false
  });
});

test('login returns a bearer token when admin password is correct', async () => {
  const response = await handleWorkerRequest(createJsonRequest(
    'https://worker.example/api/auth/login',
    { password: 'super-secret' }
  ), {
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  }, {
    ADMIN_SECRET: 'super-secret',
    SESSION_SECRET: 'session-secret'
  });

  assert.equal(response.status, 200);
  const payload = await readJson(response);
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.token, 'string');
  assert.match(payload.token, /^dariws_/);
});

test('login succeeds without relying on Buffer globals', { concurrency: false }, async () => {
  const request = createWorkerRequest(
    'https://worker.example/api/auth/login',
    { password: 'super-secret' }
  );
  const originalBuffer = globalThis.Buffer;
  const bufferShim = {
    byteLength: (...args) => originalBuffer.byteLength(...args),
    concat: (...args) => originalBuffer.concat(...args)
  };

  try {
    globalThis.Buffer = bufferShim;

    const response = await handleWorkerRequest(request, {
      fetchImpl: async () => {
        throw new Error('fetch should not be called');
      }
    }, {
      ADMIN_SECRET: 'super-secret',
      SESSION_SECRET: 'session-secret'
    });

    assert.equal(response.status, 200);
    const payload = await readJson(response);
    assert.equal(payload.ok, true);
    assert.equal(typeof payload.token, 'string');
    assert.match(payload.token, /^dariws_/);
  } finally {
    globalThis.Buffer = originalBuffer;
  }
});

test('manifest endpoint updates gallery.json through GitHub contents api', async () => {
  const calls = [];
  const token = await createSessionToken('session-secret');
  const response = await handleWorkerRequest(createJsonRequest(
    'https://worker.example/api/gallery/manifest',
    {
      images: [
        {
          id: 'worker-a',
          src: 'https://cdn.example.com/worker-a.png',
          alt: 'worker-a',
          caption: 'worker-a'
        }
      ],
      message: 'feat(gallery): update from worker'
    },
    {
      authorization: `Bearer ${token}`
    }
  ), {
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });

      if (String(url).includes('?ref=main')) {
        return new Response(JSON.stringify({ sha: 'manifest-sha' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ content: { sha: 'next-sha' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  }, {
    ADMIN_SECRET: 'super-secret',
    SESSION_SECRET: 'session-secret',
    GITHUB_TOKEN: 'github-token',
    GITHUB_OWNER: 'feel5l',
    GITHUB_REPO: 'dari-hanonah-landing',
    GITHUB_BRANCH: 'main',
    GALLERY_MANIFEST_PATH: 'gallery.json'
  });

  assert.equal(response.status, 200);
  const payload = await readJson(response);
  assert.equal(payload.ok, true);
  assert.equal(calls.length, 2);
  assert.match(String(calls[0].url), /contents\/gallery\.json\?ref=main$/);
  assert.equal(calls[1].options.method, 'PUT');
});

test('manifest endpoint works without relying on Buffer globals', { concurrency: false }, async () => {
  const calls = [];
  const token = await createSessionToken('session-secret');
  const request = createWorkerRequest(
    'https://worker.example/api/gallery/manifest',
    {
      images: [
        {
          id: 'worker-b',
          src: 'https://cdn.example.com/worker-b.png',
          alt: 'worker-b',
          caption: 'worker-b'
        }
      ],
      message: 'feat(gallery): bufferless update'
    },
    {
      authorization: `Bearer ${token}`
    }
  );
  const originalBuffer = globalThis.Buffer;
  const bufferShim = {
    byteLength: (...args) => originalBuffer.byteLength(...args),
    concat: (...args) => originalBuffer.concat(...args)
  };

  try {
    globalThis.Buffer = bufferShim;

    const response = await handleWorkerRequest(request, {
      fetchImpl: async (url, options = {}) => {
        calls.push({ url, options });

        if (String(url).includes('?ref=main')) {
          return {
            ok: true,
            async json() {
              return { sha: 'manifest-sha' };
            }
          };
        }

        return {
          ok: true,
          async json() {
            return { content: { sha: 'next-sha' } };
          }
        };
      }
    }, {
      ADMIN_SECRET: 'super-secret',
      SESSION_SECRET: 'session-secret',
      GITHUB_TOKEN: 'github-token',
      GITHUB_OWNER: 'feel5l',
      GITHUB_REPO: 'dari-hanonah-landing',
      GITHUB_BRANCH: 'main',
      GALLERY_MANIFEST_PATH: 'gallery.json'
    });

    assert.equal(response.status, 200);
    const payload = await readJson(response);
    assert.equal(payload.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.method, 'PUT');
  } finally {
    globalThis.Buffer = originalBuffer;
  }
});

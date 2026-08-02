# Cloudflare Worker Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing Cloudflare Worker, wire the landing page to the real Worker URL, validate that gallery admin flows no longer need a browser-side GitHub PAT when Worker mode is active, and push the final changes to `main`.

**Architecture:** Keep the current static site on GitHub Pages and make the Cloudflare Worker the production write path for gallery admin operations. Use Wrangler CLI for deployment because Cloudflare MCP is not available in this session, keep the existing GitHub PAT code path as an internal fallback only, and verify the cutover through Worker tests, Playwright checks, and live endpoint validation.

**Tech Stack:** Static HTML, vanilla JavaScript, Cloudflare Workers, Wrangler CLI, GitHub Contents API, Node test runner, Playwright, Git

---

### Task 1: Reconfirm the Worker cutover baseline

**Files:**
- Read: `/workspace/cloudflare/worker.mjs`
- Read: `/workspace/cloudflare/wrangler.toml`
- Read: `/workspace/index.html`
- Test: `/workspace/tests/worker-api.test.mjs`
- Test: `/workspace/tests/landing.spec.ts`

- [ ] **Step 1: Run the Worker unit tests before any change**

```bash
npm run test:worker
```

Expected: PASS for `health`, `login`, and `manifest` update coverage.

- [ ] **Step 2: Run the targeted Worker-mode Playwright tests before any change**

```bash
npx playwright test tests/landing.spec.ts --grep "Cloudflare Worker|without a GitHub PAT"
```

Expected: PASS for the Worker service status and Worker-backed delete flow.

- [ ] **Step 3: Confirm the frontend still uses an empty production Worker base**

```js
const WORKER_API_BASE_KEY = 'dariWorkerApiBase';
const WORKER_SESSION_KEY = 'dariWorkerSessionToken';
const DEFAULT_WORKER_API_BASE = '';
```

Expected: `DEFAULT_WORKER_API_BASE` is still empty and needs a real deployment URL.

- [ ] **Step 4: Check for a clean enough git state before deployment work**

```bash
git status --short
git branch --show-current
git remote -v
```

Expected: current branch is `main`, remote is `origin`, and any existing local changes are understood before continuing.

### Task 2: Verify Cloudflare deployment prerequisites

**Files:**
- Read: `/workspace/cloudflare/README.md`
- Read: `/workspace/cloudflare/wrangler.toml`

- [ ] **Step 1: Verify Wrangler CLI is available**

```bash
npx wrangler --version
```

Expected: prints a Wrangler version and exits `0`.

- [ ] **Step 2: Verify Cloudflare authentication is already available**

```bash
npx wrangler whoami
```

Expected: prints the authenticated account details. If it fails with auth errors, stop and request the missing Cloudflare credential once.

- [ ] **Step 3: Verify the Worker config still points at the production repo**

```toml
name = "dari-hanonah-gallery"
main = "worker.mjs"
compatibility_date = "2026-08-02"

[vars]
GITHUB_OWNER = "feel5l"
GITHUB_REPO = "dari-hanonah-landing"
GITHUB_BRANCH = "main"
GALLERY_MANIFEST_PATH = "gallery.json"
```

Expected: owner, repo, branch, and manifest path match the live repository.

- [ ] **Step 4: Check whether required secrets are already configured**

```bash
npx wrangler secret list
```

Expected: `GITHUB_TOKEN`, `ADMIN_SECRET`, and `SESSION_SECRET` appear. If one or more are missing, stop and request only the missing secret values once.

### Task 3: Publish the Worker and capture its public URL

**Files:**
- Modify if needed: `/workspace/cloudflare/wrangler.toml`
- Read: `/workspace/cloudflare/worker.mjs`

- [ ] **Step 1: Deploy the Worker from the Cloudflare directory**

```bash
npx wrangler deploy
```

Run from: `/workspace/cloudflare`

Expected: successful deployment output that includes the public Worker URL.

- [ ] **Step 2: Record the exact deployed URL for the cutover**

```text
https://<actual-worker-subdomain>.workers.dev
```

Expected: a stable production URL captured from Wrangler output, with no placeholder value kept anywhere.

- [ ] **Step 3: Verify the Worker health endpoint immediately after deploy**

```bash
curl -fsS https://<actual-worker-subdomain>.workers.dev/api/health
```

Expected JSON:

```json
{
  "ok": true,
  "mode": "worker",
  "configured": true
}
```

- [ ] **Step 4: If health is not configured, repair the deployment before touching the frontend**

```text
Do not update index.html until /api/health returns configured=true.
```

Expected: either the deployment is healthy already or the missing Worker config is fixed first.

### Task 4: Cut the frontend over to the real Worker URL

**Files:**
- Modify: `/workspace/index.html`

- [ ] **Step 1: Replace the empty default Worker base with the real deployed URL**

```js
const WORKER_API_BASE_KEY = 'dariWorkerApiBase';
const WORKER_SESSION_KEY = 'dariWorkerSessionToken';
const DEFAULT_WORKER_API_BASE = 'https://<actual-worker-subdomain>.workers.dev';
```

Expected: production visitors automatically use Worker mode without needing localStorage setup.

- [ ] **Step 2: Preserve the current Worker-first persistence path**

```js
if (isWorkerModeEnabled()) {
  const response = await callWorkerApi('/api/gallery/manifest', {
    method: 'POST',
    body: JSON.stringify({
      images: entries,
      message: statusMessage || 'chore(gallery): update via worker'
    })
  });
}
```

Expected: no regression to the Worker persistence branch in `persistGalleryManifest()`.

- [ ] **Step 3: Preserve Worker login as the production admin path**

```js
if (isWorkerModeEnabled()) {
  const workerLogin = await loginWithWorker(password);
  if (workerLogin.ok) {
    isAdminLoggedIn = true;
    errorDiv.style.display = 'none';
    passwordInput.value = '';
    showAdminPanel();
    showToast('تم تسجيل الدخول بنجاح عبر Cloudflare Worker', 'success');
    return;
  }
}
```

Expected: admin auth still prefers the Worker when a base URL exists.

- [ ] **Step 4: Keep the GitHub PAT path as an internal fallback only**

```text
Do not delete the existing PAT code path unless it blocks the cutover. The production goal is to make it unnecessary when Worker mode is active, not to redesign the entire admin system.
```

Expected: the cutover stays focused and low risk.

### Task 5: Re-run focused tests after the cutover change

**Files:**
- Test: `/workspace/tests/worker-api.test.mjs`
- Test: `/workspace/tests/landing.spec.ts`

- [ ] **Step 1: Re-run Worker unit tests**

```bash
npm run test:worker
```

Expected: PASS.

- [ ] **Step 2: Re-run the targeted Worker-mode Playwright tests**

```bash
npx playwright test tests/landing.spec.ts --grep "Cloudflare Worker|without a GitHub PAT"
```

Expected: PASS with the frontend still recognizing Worker mode.

- [ ] **Step 3: Run the full Playwright suite if the targeted tests pass**

```bash
npm run test:e2e
```

Expected: PASS for the landing regression suite, or a small, understood failure surface that must be fixed before shipping.

- [ ] **Step 4: Fix any regression before continuing to git operations**

```text
Do not push or deploy partially verified code. If tests fail, repair the smallest failing area and rerun the relevant command until it passes.
```

Expected: all required tests pass before handoff.

### Task 6: Verify the live site and push the final state

**Files:**
- Modify if needed: `/workspace/README.md`
- Commit: `/workspace/index.html`
- Commit: `/workspace/cloudflare/worker.mjs`
- Commit: `/workspace/cloudflare/wrangler.toml`
- Commit: `/workspace/tests/worker-api.test.mjs`
- Commit: `/workspace/tests/landing.spec.ts`
- Commit: `/workspace/docs/superpowers/specs/2026-08-02-cloudflare-worker-production-cutover-design.md`
- Commit: `/workspace/docs/superpowers/plans/2026-08-02-cloudflare-worker-production-cutover.md`

- [ ] **Step 1: Review the final diff**

```bash
git status --short
git diff -- cloudflare/worker.mjs cloudflare/wrangler.toml index.html tests/worker-api.test.mjs tests/landing.spec.ts README.md docs/superpowers/specs/2026-08-02-cloudflare-worker-production-cutover-design.md docs/superpowers/plans/2026-08-02-cloudflare-worker-production-cutover.md
```

Expected: the diff is limited to the Worker production cutover and any required supporting docs or tests.

- [ ] **Step 2: Commit the final production cutover**

```bash
git add cloudflare/worker.mjs cloudflare/wrangler.toml index.html tests/worker-api.test.mjs tests/landing.spec.ts README.md docs/superpowers/specs/2026-08-02-cloudflare-worker-production-cutover-design.md docs/superpowers/plans/2026-08-02-cloudflare-worker-production-cutover.md
git commit -m "feat: cut over gallery admin to cloudflare worker"
```

Expected: one clear commit with the production cutover changes.

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

Expected: remote `main` receives the final commit.

- [ ] **Step 4: Verify the live site and deployed Worker from their public URLs**

```bash
curl -I https://feel5l.github.io/dari-hanonah-landing/
curl -fsS https://<actual-worker-subdomain>.workers.dev/api/health
```

Expected: the site responds successfully and the Worker health endpoint still reports `configured: true`.

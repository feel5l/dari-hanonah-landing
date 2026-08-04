# dari-hanonah-landing

Static HTML landing page for the "Dari Alhanonah" (داري الحنونة) daycare & kindergarten, deployed to GitHub Pages. A small Cloudflare Worker (`cloudflare/worker.mjs`) acts as an optional proxy for publishing the photo gallery manifest (`gallery.json`) without exposing GitHub secrets in the browser.

## Cursor Cloud specific instructions

### Components
- Landing page: `index.html` (single-file app, Arabic/RTL). Served as static files. `gallery.json` is the public gallery manifest it fetches at runtime.
- Cloudflare Worker: `cloudflare/worker.mjs` — gallery publishing proxy (endpoints `/api/health`, `/api/auth/login`, `/api/gallery/manifest`). Optional; the landing page also has a browser-only GitHub-PAT fallback.

### Run / test (commands live in `package.json` and `playwright.config.ts`)
- Serve the site for manual/GUI testing: `python3 -m http.server 4173` from the repo root, then open `http://127.0.0.1:4173/`.
- Worker unit tests: `npm run test:worker` (`node --test`, no browser or network needed — GitHub calls are stubbed).
- Landing-page e2e tests: `npm run test:e2e`. Playwright auto-starts its own `python3 -m http.server 4173` (via `webServer` in `playwright.config.ts`) and reuses an already-running one, so you do not have to start the server yourself for tests.

### Gallery images (performance)
- Uploaded images are downscaled + JPEG-compressed in the browser before being sent to the CDN or embedded as a base64 fallback (`compressImageForUpload` in `index.html`, max 1600px / quality 0.82). This keeps `gallery.json` small so the published site stays fast to load and reliable to commit.
- `gallery.json` embeds base64 images when no CDN (Cloudinary/ImgBB) upload succeeds. If it grows large again, recompress the existing entries with `node scripts/optimize-gallery-images.mjs` (reuses the Playwright Chromium; same parameters as the upload path).

### Notes / gotchas
- There is no linter or build step configured in this repo (no ESLint/Prettier/bundler). "Lint" and "build" are not applicable; the site ships `index.html` as-is.
- A `GET /favicon.ico 404` appears in the browser console — it is harmless and unrelated to app functionality.
- Admin/gallery flows: the admin password used by the UI is `dari2024`; the e2e tests stub GitHub/Worker network calls, so no real secrets are required to run them.
- Cloudflare Worker local dev (`npx wrangler dev` from `cloudflare/`) and deploy are optional and require Wrangler auth plus secrets (`GITHUB_TOKEN`, `ADMIN_SECRET`, `SESSION_SECRET`) — see `cloudflare/README.md`. Not needed for the unit tests or for running the landing page.

# dari-hanonah-landing
Landing page for Dari Alhanonah daycare &amp; kindergarten (static HTML for GitHub Pages).

## Gallery publishing modes

- `GitHub direct`: the existing browser-driven fallback path using a stored GitHub token.
- `Cloudflare Worker`: the recommended path that keeps GitHub secrets outside the browser and updates `gallery.json` through a Worker proxy.

## Cloudflare Worker files

- `cloudflare/worker.mjs`
- `cloudflare/wrangler.toml`
- `cloudflare/README.md`

To activate the Worker path in the frontend after deployment, set the deployed worker URL in `DEFAULT_WORKER_API_BASE` inside `index.html`.

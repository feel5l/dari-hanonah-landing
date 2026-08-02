# Cloudflare Worker Setup

This worker moves gallery manifest writes out of the browser and into Cloudflare.

## Required secrets

Run these commands from the `cloudflare` directory after authenticating with Wrangler:

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put ADMIN_SECRET
wrangler secret put SESSION_SECRET
```

## What each secret does

- `GITHUB_TOKEN`: GitHub token with `Contents: Read and write` on `feel5l/dari-hanonah-landing`
- `ADMIN_SECRET`: password accepted by `POST /api/auth/login`
- `SESSION_SECRET`: HMAC secret used to sign short-lived admin sessions

## Local development

```bash
cd cloudflare
npx wrangler dev
```

## Deployment

```bash
cd cloudflare
npx wrangler deploy
```

After deployment, copy the worker URL and set it in the landing page by updating `DEFAULT_WORKER_API_BASE` in `index.html`.

## Exposed endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/gallery/manifest`

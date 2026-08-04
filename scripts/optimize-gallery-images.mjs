// Maintenance script: recompress base64 images embedded in gallery.json.
//
// Historically the admin gallery stored full-resolution phone photos as
// base64 data URIs inside gallery.json, which grew to tens of MB and made
// the published site very slow to open and unreliable to save. This script
// downscales + re-encodes every embedded data-URI image using the SAME
// parameters the frontend now uses at upload time, so existing content
// becomes just as light as freshly uploaded content.
//
// It reuses the Playwright-managed Chromium (already a dev dependency) so
// the canvas encoding matches the browser exactly. Images already hosted on
// a CDN (http/https src) are left untouched.
//
// Usage:
//   node scripts/optimize-gallery-images.mjs [path-to-gallery.json]

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;
const OUTPUT_TYPE = 'image/jpeg';

const manifestPath = path.resolve(process.argv[2] || 'gallery.json');

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const images = Array.isArray(manifest.images) ? manifest.images : [];

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // The compression routine mirrors compressImageForUpload() in index.html.
  await page.addScriptTag({
    content: `
      window.__compress = async function (src, maxDimension, quality, outputType) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('decode-failed'));
          img.src = src;
        });
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) return null;
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        return canvas.toDataURL(outputType, quality);
      };
    `
  });

  let optimized = 0;
  let skipped = 0;

  for (const image of images) {
    const src = image && typeof image.src === 'string' ? image.src : '';
    if (!src.startsWith('data:image/')) {
      skipped += 1;
      continue;
    }

    const before = src.length;
    const next = await page.evaluate(
      async ([dataUrl, maxDimension, quality, outputType]) =>
        window.__compress(dataUrl, maxDimension, quality, outputType),
      [src, MAX_DIMENSION, QUALITY, OUTPUT_TYPE]
    );

    if (next && next.length < before) {
      image.src = next;
      optimized += 1;
      console.log(`  ✓ ${image.id || '(no id)'}: ${formatBytes(before)} → ${formatBytes(next.length)}`);
    } else {
      skipped += 1;
      console.log(`  • ${image.id || '(no id)'}: kept original (${formatBytes(before)})`);
    }
  }

  await browser.close();

  manifest.updatedAt = new Date().toISOString();
  const output = JSON.stringify(manifest, null, 2);
  const beforeTotal = Buffer.byteLength(raw);
  const afterTotal = Buffer.byteLength(output);

  await writeFile(manifestPath, output);

  console.log('');
  console.log(`Optimized ${optimized} image(s), skipped ${skipped}.`);
  console.log(`Manifest size: ${formatBytes(beforeTotal)} → ${formatBytes(afterTotal)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

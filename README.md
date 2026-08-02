# dari-hanonah-landing
Landing page for Dari Alhanonah daycare &amp; kindergarten (static HTML for GitHub Pages).

## Baseline scope
- Single static page: `/home/runner/work/dari-hanonah-landing/dari-hanonah-landing/index.html`
- Static assets: `/home/runner/work/dari-hanonah-landing/dari-hanonah-landing/assets/gallery/`

## Confirmed defects (before fix)
- **Critical:** forms had no real submission flow.
- **High:** invalid semantic pattern `<a><button>...</button></a>`.
- **Medium:** published instructional/placeholder text was visible to users.
- **Medium:** gallery used text placeholders instead of visual assets.

## Acceptance criteria
- Forms submit through a working user flow with required-field validation.
- All interactive elements use valid semantic HTML patterns.
- No placeholder/instructional publishing text remains in visible content.
- Gallery renders real production-ready assets with descriptive alt text.
- Internal anchors and contact links remain functional.

## Manual verification checklist
- Open page and verify RTL layout across desktop and mobile widths.
- Submit lead form with valid/invalid inputs and confirm validation behavior.
- Submit visit form and confirm required consent + required fields.
- Verify WhatsApp submission handoff opens correctly.
- Verify links: visit section anchor, WhatsApp, Instagram, TikTok, YouTube, phone.

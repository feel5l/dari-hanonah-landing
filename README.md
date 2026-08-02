# dari-hanonah-landing
Landing page for Dari Alhanonah daycare &amp; kindergarten (static HTML for GitHub Pages).

## Final project scope
- Single static page: `/home/runner/work/dari-hanonah-landing/dari-hanonah-landing/index.html`
- Static assets: `/home/runner/work/dari-hanonah-landing/dari-hanonah-landing/assets/gallery/`
- Primary conversion channel: WhatsApp lead capture from both page forms

## Business goals
- Increase qualified inquiries from mothers searching for daycare/kindergarten in Al Ahsa.
- Increase visit and seat-booking requests through clear CTA and WhatsApp handoff.
- Keep messaging focused on trust, safety, educational quality, and ease of contact.

## Content governance
- All visible Arabic copy in the landing page is treated as production-ready copy.
- Avoid placeholder/instructional text in user-facing sections.
- Keep a consistent tone: reassuring, practical, and parent-focused.

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

## Gallery asset standards
- Keep asset naming consistent and descriptive (e.g. `outdoor-yard.svg`, `classroom.svg`).
- Each gallery image must have a clear Arabic `alt` text that describes the scene.
- Keep gallery assets optimized for fast loading on mobile networks.

## Conversion flow standard
- Lead form and visit form both validate required fields before submission.
- WhatsApp handoff opens a prefilled message containing submitted details.
- Submission status messaging clearly tells users the next step to complete sending.

## SEO and discoverability baseline
- Maintain descriptive page metadata (title, description, canonical URL).
- Maintain social sharing metadata (Open Graph + Twitter tags).
- Keep semantic heading structure and organization details for discoverability.

## Manual verification checklist
- Open page and verify RTL layout across desktop and mobile widths.
- Submit lead form with valid/invalid inputs and confirm validation behavior.
- Submit visit form and confirm required consent + required fields.
- Verify WhatsApp submission handoff opens correctly.
- Verify links: visit section anchor, WhatsApp, Instagram, TikTok, YouTube, phone.

## Pre-launch checklist
- Re-check copy, links, phone number, and social URLs.
- Confirm no console errors in browser while interacting with forms.
- Verify gallery images render correctly and load lazily.
- Validate mobile-first usability (small screens, touch targets, readable text).

## Post-launch follow-up
- Track inquiry volume from form-triggered WhatsApp handoffs.
- Track click-through on primary CTA buttons.
- Collect parent feedback and update copy/sections based on repeated questions.

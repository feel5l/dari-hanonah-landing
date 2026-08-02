# Reliable Gallery Persistence And Delete Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded gallery images persist for all visitors across refreshes/devices and add a working admin edit mode with visible delete buttons.

**Architecture:** Keep `gallery.json` as the public source of truth for the gallery, but tighten the upload flow so the UI only reports global success after `gallery.json` is successfully updated and re-read. Add a focused gallery edit-mode layer inside `index.html` that injects delete buttons onto gallery items, toggles the mode for logged-in admins only, and routes delete/restore through the same manifest update path.

**Tech Stack:** Static HTML/vanilla JavaScript, GitHub Contents API, ImgBB CDN uploads, browser `localStorage`, Playwright end-to-end tests.

---

## File Structure

- **Modify:** `/workspace/index.html`
  - Contains the gallery rendering, upload flow, GitHub manifest persistence, admin dashboard, trash bin, and gallery CSS.
  - This file already includes partial manifest logic and partial delete-mode CSS, but the behavior is not fully wired.
- **Modify:** `/workspace/tests/landing.spec.ts`
  - Regression suite for the static page.
  - Extend it to assert real persistence semantics and visible admin delete controls.
- **Modify:** `/workspace/gallery.json`
  - Public manifest consumed by all visitors.
  - Keep shape stable: `{ version, updatedAt, images[] }`.

---

### Task 1: Lock Down The Broken Behavior With Tests

**Files:**
- Modify: `/workspace/tests/landing.spec.ts`
- Modify: `/workspace/index.html`

- [ ] **Step 1: Add a failing test for admin edit mode visibility**

```ts
test('shows gallery delete controls only after admin enables edit mode', async ({ page }) => {
  await page.goto('/');

  await page.locator('.upload-btn').click();
  await page.locator('#adminPasswordInput').fill('dari2024');
  await page.locator('#adminLoginModal button[type="submit"]').click();

  await expect(page.locator('#adminDashboardModal')).toBeVisible();
  await expect(page.locator('.gallery-delete-btn')).toHaveCount(0);

  await page.locator('.admin-tab[data-tab="upload"]').click();
  await page.locator('#toggleGalleryEditMode').click();

  await expect(page.locator('.gallery-grid .gallery-delete-btn').first()).toBeVisible();
});
```

- [ ] **Step 2: Add a failing test for “global save” semantics**

```ts
test('shows a publish failure message when manifest update does not complete', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN');
  });

  await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Bad credentials' })
    });
  });

  await page.locator('.upload-btn').click();
  await page.locator('#adminPasswordInput').fill('dari2024');
  await page.locator('#adminLoginModal button[type="submit"]').click();
  await page.locator('.admin-tab[data-tab="upload"]').click();

  await page.locator('#imageUploadAdmin').setInputFiles({
    name: 'upload-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnQm4sAAAAASUVORK5CYII=',
      'base64'
    )
  });

  await expect(page.locator('.toast.error, .toast.warning')).toContainText('لم يتم نشر الصورة للجميع');
});
```

- [ ] **Step 3: Add a failing test for successful manifest-backed persistence**

```ts
test('re-renders uploaded manifest images after a full reload', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    window.galleryManifest.images = [
      ...window.galleryManifest.images,
      {
        id: 'upload-test-1',
        src: 'https://example.com/uploaded-image.png',
        alt: 'Uploaded image',
        caption: 'صورة جديدة'
      }
    ];
  });

  await page.reload();

  await expect(page.locator('.gallery-grid img[src="https://example.com/uploaded-image.png"]')).toBeVisible();
});
```

- [ ] **Step 4: Run the narrowed test set and confirm failure**

Run:

```bash
env -u CI npx playwright test tests/landing.spec.ts -g "gallery delete controls|publish failure|manifest-backed persistence"
```

Expected:

```text
3 failed
```

- [ ] **Step 5: Commit the red tests**

```bash
git add /workspace/tests/landing.spec.ts
git commit -m "test: cover gallery persistence and delete mode"
```

---

### Task 2: Make Manifest Persistence Reliable Instead Of Optimistic

**Files:**
- Modify: `/workspace/index.html:2718-3118`
- Test: `/workspace/tests/landing.spec.ts`

- [ ] **Step 1: Replace optimistic manifest writes with explicit verification helpers**

Update the manifest section in `/workspace/index.html` to add a fetch-then-verify flow:

```js
async function fetchPublishedGalleryManifest() {
  const response = await fetch(`${GITHUB_CONFIG.manifestPath}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Manifest HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.images)) {
    throw new Error('Manifest shape invalid');
  }

  return data;
}

async function verifyManifestContainsEntries(expectedEntries) {
  const freshManifest = await fetchPublishedGalleryManifest();
  const freshIds = new Set(freshManifest.images.map((img) => img.id));

  return expectedEntries.every((entry) => freshIds.has(entry.id));
}

async function persistGalleryManifest(entries, statusMessage) {
  replaceGalleryManifest({
    version: 1,
    updatedAt: new Date().toISOString(),
    images: entries
  });

  saveGalleryManifestToLocalStorage(galleryManifest);

  const commitResult = await commitGalleryManifestToRepo(galleryManifest, statusMessage);
  if (!commitResult.committed) {
    return { committed: false, published: false, reason: commitResult.reason || 'commit-failed' };
  }

  return { committed: true, published: true };
}
```

- [ ] **Step 2: Add a stricter upload completion gate**

In `handleImageUpload(event)`, keep the CDN upload behavior but change the success branch to require manifest publication:

```js
let publishResult = { committed: false, published: false, reason: 'no-images' };

if (newEntries.length > 0) {
  const next = galleryManifest.images.concat(newEntries);
  publishResult = await persistGalleryManifest(next, `feat(gallery): add ${newEntries.length} image(s)`);
}

if (newEntries.length > 0 && !publishResult.published) {
  showToast('تم رفع الصورة سحابيًا لكن لم يتم نشر الصورة للجميع', 'error');
} else if (newEntries.length > 0) {
  showToast('تم حفظ الصورة ونشرها للجميع ✓', 'success');
}
```

- [ ] **Step 3: Prevent false-positive gallery rendering on failed publish**

Only append a newly uploaded gallery item to the DOM after publication succeeds:

```js
const pendingEntries = [];

if (imageUrl) {
  const entry = buildManifestEntryFromFile(file, imageUrl);
  pendingEntries.push(entry);
}

// after persistGalleryManifest()
if (publishResult.published) {
  pendingEntries.forEach((entry) => appendGalleryItem(entry));
}
```

- [ ] **Step 4: Re-load the manifest after successful publish so the UI matches the real source of truth**

```js
if (publishResult.published) {
  await loadGalleryManifest();

  document.querySelectorAll('.gallery-item.custom').forEach((item) => item.remove());
  renderGalleryFromManifest(galleryManifest.images);
}
```

- [ ] **Step 5: Run the focused tests and confirm they pass**

Run:

```bash
env -u CI npx playwright test tests/landing.spec.ts -g "publish failure|manifest-backed persistence"
```

Expected:

```text
2 passed
```

- [ ] **Step 6: Commit the persistence fix**

```bash
git add /workspace/index.html /workspace/tests/landing.spec.ts
git commit -m "fix: require manifest publish for gallery persistence"
```

---

### Task 3: Wire A Real Admin Edit Mode Into The Gallery

**Files:**
- Modify: `/workspace/index.html:2799-3245`
- Test: `/workspace/tests/landing.spec.ts`

- [ ] **Step 1: Add explicit edit-mode state and gallery helpers**

Near the gallery/admin state in `/workspace/index.html`, define:

```js
let isGalleryEditMode = false;

function injectDeleteButton(item, imageId) {
  if (!item || !imageId || item.querySelector('.gallery-delete-btn')) return;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'gallery-delete-btn';
  deleteButton.textContent = '🗑️';
  deleteButton.setAttribute('aria-label', 'حذف الصورة');
  deleteButton.onclick = async function (event) {
    event.stopPropagation();
    await deleteImage(imageId);
  };

  item.appendChild(deleteButton);
}

function syncGalleryEditMode() {
  const items = document.querySelectorAll('.gallery-grid .gallery-item');

  items.forEach((item) => {
    const imageId = item.dataset.id;
    item.classList.toggle('edit-mode', isGalleryEditMode);

    if (isAdminLoggedIn && imageId) {
      injectDeleteButton(item, imageId);
    }
  });
}
```

- [ ] **Step 2: Make appended/restored items carry stable IDs**

Update `appendGalleryItem(entry)` so every rendered item can be deleted later:

```js
function appendGalleryItem(entry) {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;

  const item = document.createElement('div');
  item.className = 'gallery-item custom';
  item.dataset.id = entry.id || '';

  item.innerHTML = `
    <img src="${entry.src}" alt="${entry.alt || 'صورة'}" loading="lazy">
    <div class="gallery-overlay">
      <span class="gallery-caption">${entry.caption || 'صورة'}</span>
    </div>
  `;

  if (isAdminLoggedIn && entry.id) {
    injectDeleteButton(item, entry.id);
  }

  item.onclick = function () {
    if (isGalleryEditMode) return;
    const allItems = document.querySelectorAll('.gallery-item');
    const index = Array.from(allItems).indexOf(item);
    if (typeof openGalleryModal === 'function') openGalleryModal(index);
  };

  grid.appendChild(item);
  syncGalleryEditMode();
}
```

- [ ] **Step 3: Add an actual edit-mode toggle to the admin upload tab**

Inject a control into the upload tab markup in `/workspace/index.html`:

```html
<div class="admin-info-text">
  فعّل وضع التحرير لإظهار أزرار حذف الصور داخل المعرض.
</div>
<button
  type="button"
  id="toggleGalleryEditMode"
  class="btn btn-danger"
  onclick="toggleGalleryEditMode()"
>
  تفعيل وضع التحرير
</button>
```

And add the toggle handler:

```js
function toggleGalleryEditMode() {
  if (!isAdminLoggedIn) {
    showToast('سجّل الدخول أولاً', 'error');
    return;
  }

  isGalleryEditMode = !isGalleryEditMode;
  syncGalleryEditMode();

  const toggle = document.getElementById('toggleGalleryEditMode');
  if (toggle) {
    toggle.textContent = isGalleryEditMode ? 'إيقاف وضع التحرير' : 'تفعيل وضع التحرير';
  }
}
```

- [ ] **Step 4: Re-run edit-mode synchronization at the right lifecycle points**

Add calls in these places:

```js
function showAdminPanel() {
  // existing modal logic...
  syncGalleryEditMode();
}

function adminLogout() {
  isGalleryEditMode = false;
  syncGalleryEditMode();
  // existing logout logic...
}

document.addEventListener('DOMContentLoaded', async function () {
  await loadGalleryManifest();
  renderGalleryFromManifest(galleryManifest.images);
  syncGalleryEditMode();
});
```

- [ ] **Step 5: Run the edit-mode test and confirm it passes**

Run:

```bash
env -u CI npx playwright test tests/landing.spec.ts -g "delete controls only after admin enables edit mode"
```

Expected:

```text
1 passed
```

- [ ] **Step 6: Commit the edit-mode implementation**

```bash
git add /workspace/index.html /workspace/tests/landing.spec.ts
git commit -m "feat: add admin gallery edit mode"
```

---

### Task 4: Make Delete And Restore Respect The Same Source Of Truth

**Files:**
- Modify: `/workspace/index.html:3165-3298`
- Test: `/workspace/tests/landing.spec.ts`

- [ ] **Step 1: Extend delete flow to fail loudly when manifest removal fails**

Update `deleteImage(imageId)`:

```js
const removeResult = await removeImageFromManifestById(imageId);
if (!removeResult.committed) {
  showToast('تعذر حذف الصورة من المعرض المنشور', 'error');
  return false;
}

itemToRemove.remove();
trashBin.push(trashItem);
saveTrashBinToStorage();
renderTrashBinTab();
syncGalleryEditMode();
showToast('تم نقل الصورة إلى سلة المحذوفات', 'success');
return true;
```

- [ ] **Step 2: Re-render after restore so the visible grid matches the manifest**

Update `restoreImage(imageId)`:

```js
const next = galleryManifest.images.concat([restoredImage]);
const restoreResult = await persistGalleryManifest(next, `feat(gallery): restore ${restoredImage.id}`);

if (!restoreResult.published) {
  showToast('تعذر إعادة الصورة إلى المعرض المنشور', 'error');
  return false;
}

await loadGalleryManifest();
document.querySelectorAll('.gallery-item.custom').forEach((item) => item.remove());
renderGalleryFromManifest(galleryManifest.images);
renderTrashBinTab();
syncGalleryEditMode();
showToast('تم استعادة الصورة بنجاح', 'success');
```

- [ ] **Step 3: Add a restore/delete regression test**

In `/workspace/tests/landing.spec.ts`, add:

```ts
test('deletes a manifest-backed gallery image in admin edit mode', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    window.galleryManifest.images = [
      ...window.galleryManifest.images,
      {
        id: 'delete-me',
        src: 'https://example.com/delete-me.png',
        alt: 'Delete me',
        caption: 'Delete me'
      }
    ];
  });

  await page.reload();

  await page.locator('.upload-btn').click();
  await page.locator('#adminPasswordInput').fill('dari2024');
  await page.locator('#adminLoginModal button[type="submit"]').click();
  await page.locator('.admin-tab[data-tab="upload"]').click();
  await page.locator('#toggleGalleryEditMode').click();

  await page.locator('.gallery-grid .gallery-item[data-id="delete-me"] .gallery-delete-btn').click();

  await expect(page.locator('.gallery-grid .gallery-item[data-id="delete-me"]')).toHaveCount(0);
});
```

- [ ] **Step 4: Run the delete-path tests**

Run:

```bash
env -u CI npx playwright test tests/landing.spec.ts -g "delete controls|deletes a manifest-backed gallery image"
```

Expected:

```text
2 passed
```

- [ ] **Step 5: Commit the delete/restore alignment**

```bash
git add /workspace/index.html /workspace/tests/landing.spec.ts
git commit -m "fix: align gallery delete flow with published manifest"
```

---

### Task 5: Full Regression, Publish, And Manual Verification

**Files:**
- Modify: `/workspace/index.html`
- Modify: `/workspace/tests/landing.spec.ts`
- Modify: `/workspace/gallery.json`

- [ ] **Step 1: Run the full regression suite**

Run:

```bash
env -u CI npx playwright test
```

Expected:

```text
9 passed
```

If the suite count increases after adding tests, the expected output should match the new total with all tests passing.

- [ ] **Step 2: Confirm the working tree is clean**

Run:

```bash
git status --short
```

Expected:

```text
<no output>
```

- [ ] **Step 3: Push the final branch**

Run:

```bash
git push origin main
```

Expected:

```text
main -> main
```

- [ ] **Step 4: Manually verify the published behavior**

Use this checklist against the deployed site:

```text
1. Open the published URL.
2. Log in as admin.
3. Save a valid GitHub PAT in the settings tab.
4. Upload one image and wait for the success toast that says it was published for everyone.
5. Refresh the page and confirm the image remains.
6. Open the site from another browser/device and confirm the same image exists.
7. Enable edit mode and verify the delete icon is visible on gallery items.
8. Delete the uploaded image and confirm it disappears after refresh.
```

- [ ] **Step 5: Create the release commit if verification changed any code**

```bash
git add /workspace/index.html /workspace/tests/landing.spec.ts /workspace/gallery.json
git commit -m "fix: make gallery persistence and delete mode reliable"
```

Skip this step if no additional code changed during manual verification.

---

## Self-Review

- **Spec coverage:** Covers both reported failures: uploaded images disappearing after refresh/other devices and missing delete icon/edit mode.
- **Placeholder scan:** No `TODO`, `TBD`, or vague "handle edge cases" language remains in task steps.
- **Type consistency:** Uses the same concrete names throughout the plan: `galleryManifest`, `persistGalleryManifest`, `toggleGalleryEditMode`, `isGalleryEditMode`, `injectDeleteButton`, and `gallery-delete-btn`.


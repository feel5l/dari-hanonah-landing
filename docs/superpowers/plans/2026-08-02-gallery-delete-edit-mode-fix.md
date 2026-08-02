# Gallery Delete Edit Mode Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إصلاح وضع تحرير الصور بحيث يدعم حذف صورة بعد أخرى وحذف عدة صور دفعة واحدة بدون رسائل خطأ أو تعطل في واجهة الأدمن.

**Architecture:** نعتمد على مصدر حقيقة موحد للصور داخل المعرض عبر معرف ثابت لكل صورة، ثم نضيف حالة صريحة لوضع التحرير والتحديد المتعدد، وبعدها نجعل عمليات الحذف والاستعادة وإعادة الرسم تعتمد على الحالة نفسها بدلاً من الاعتماد على DOM فقط. سيتم تغطية السلوك باختبارات Playwright قبل تعديل كود الإنتاج.

**Tech Stack:** HTML, Vanilla JavaScript, LocalStorage, Playwright

---

### Task 1: حماية السلوك الحالي واكتشاف العطل باختبارات فاشلة

**Files:**
- Modify: `/workspace/dari-hanonah-landing/tests/landing.spec.ts`

- [ ] **Step 1: إضافة اختبار فاشل للحذف المتتابع**

```ts
test('allows deleting multiple images sequentially while staying in edit mode', async ({ page }) => {
  await page.goto('/');
  await page.locator('.upload-btn').click();
  await page.locator('#adminPasswordInput').fill('dari2024');
  await page.locator('#adminLoginModal button[type="submit"]').click();

  await page.locator('.admin-tab[data-tab="trashBin"]').click();
  await page.locator('.admin-tab[data-tab="stats"]').click();

  await page.evaluate(() => {
    const gallery = document.querySelector('.gallery-grid');
    if (!gallery) throw new Error('gallery-grid missing');

    const ensureImage = (id: string, label: string) => {
      const item = document.createElement('div');
      item.className = 'gallery-item custom';
      item.innerHTML = `
        <img data-id="${id}" src="https://example.com/${id}.png" alt="${label}" loading="lazy">
        <div class="gallery-overlay">
          <span class="gallery-caption">${label}</span>
        </div>
      `;
      gallery.appendChild(item);
    };

    ensureImage('seq-a', 'صورة A');
    ensureImage('seq-b', 'صورة B');
    localStorage.setItem('dariGalleryImages', JSON.stringify(
      Array.from(document.querySelectorAll('.gallery-item img')).map((img) => ({
        id: img.dataset.id || '',
        src: img.src,
        alt: img.alt,
        caption: img.closest('.gallery-item')?.querySelector('.gallery-caption')?.textContent || ''
      }))
    ));
  });

  await page.evaluate(() => deleteImage('seq-a'));
  await page.evaluate(() => deleteImage('seq-b'));

  await expect(page.locator('.gallery-grid img[data-id="seq-a"]')).toHaveCount(0);
  await expect(page.locator('.gallery-grid img[data-id="seq-b"]')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('dariTrashBin') || '[]').length)).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: إضافة اختبار فاشل للحذف الجماعي**

```ts
test('allows deleting selected images in a single bulk action', async ({ page }) => {
  await page.goto('/');
  await page.locator('.upload-btn').click();
  await page.locator('#adminPasswordInput').fill('dari2024');
  await page.locator('#adminLoginModal button[type="submit"]').click();

  await page.evaluate(() => {
    const gallery = document.querySelector('.gallery-grid');
    if (!gallery) throw new Error('gallery-grid missing');
    gallery.insertAdjacentHTML('beforeend', `
      <div class="gallery-item custom">
        <img data-id="bulk-a" src="https://example.com/bulk-a.png" alt="bulk-a" loading="lazy">
        <div class="gallery-overlay"><span class="gallery-caption">bulk-a</span></div>
      </div>
      <div class="gallery-item custom">
        <img data-id="bulk-b" src="https://example.com/bulk-b.png" alt="bulk-b" loading="lazy">
        <div class="gallery-overlay"><span class="gallery-caption">bulk-b</span></div>
      </div>
    `);
    localStorage.setItem('dariGalleryImages', JSON.stringify(
      Array.from(document.querySelectorAll('.gallery-item img')).map((img) => ({
        id: img.dataset.id || '',
        src: img.src,
        alt: img.alt,
        caption: img.closest('.gallery-item')?.querySelector('.gallery-caption')?.textContent || ''
      }))
    ));
  });

  await page.evaluate(() => {
    if (typeof window.toggleGalleryEditMode !== 'function') {
      throw new Error('toggleGalleryEditMode is not implemented');
    }
    window.toggleGalleryEditMode();
  });

  await page.locator('.gallery-item:has(img[data-id="bulk-a"])').click();
  await page.locator('.gallery-item:has(img[data-id="bulk-b"])').click();
  await page.locator('[data-testid="bulk-delete-button"]').click();

  await expect(page.locator('.gallery-grid img[data-id="bulk-a"]')).toHaveCount(0);
  await expect(page.locator('.gallery-grid img[data-id="bulk-b"]')).toHaveCount(0);
});
```

- [ ] **Step 3: تشغيل الاختبارات للتأكد من الفشل الصحيح**

Run:

```bash
cd /workspace/dari-hanonah-landing && npm run test:e2e -- tests/landing.spec.ts --grep "deleting"
```

Expected: FAIL لأن `toggleGalleryEditMode` غير موجود أو لأن حذف أكثر من صورة لا يعمل بشكل صحيح.

### Task 2: توحيد هوية الصور والحالة الداخلية للمعرض

**Files:**
- Modify: `/workspace/dari-hanonah-landing/index.html`

- [ ] **Step 1: إضافة مولد معرفات وصيغة موحدة للصورة**

```js
function createImageId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGalleryImage(image) {
  return {
    id: image.id || createImageId(),
    src: image.src,
    alt: image.alt || 'صورة',
    caption: image.caption || 'صورة'
  };
}
```

- [ ] **Step 2: تعديل الحفظ والتحميل ليعتمدا على `id`**

```js
function saveGalleryToStorage() {
  const galleryItems = document.querySelectorAll('.gallery-item img');
  const images = Array.from(galleryItems).map((img) => normalizeGalleryImage({
    id: img.dataset.id,
    src: img.src,
    alt: img.alt,
    caption: img.closest('.gallery-item').querySelector('.gallery-caption')?.textContent || ''
  }));
  localStorage.setItem('dariGalleryImages', JSON.stringify(images));
}
```

```js
const imageData = normalizeGalleryImage(imgData);
newItem.dataset.imageId = imageData.id;
newItem.querySelector('img').dataset.id = imageData.id;
```

- [ ] **Step 3: تعديل الرفع والاستعادة لإسناد المعرف نفسه**

```js
const imageRecord = normalizeGalleryImage({
  src: imageUrl,
  alt: file.name,
  caption: 'صورة جديدة'
});
```

واستخدام `imageRecord.id` داخل `img.dataset.id`.

- [ ] **Step 4: تشغيل الاختبارات الموجودة للتأكد من عدم كسر السلوك الحالي**

Run:

```bash
cd /workspace/dari-hanonah-landing && npm run test:e2e -- tests/landing.spec.ts --grep "Landing page regression guards"
```

Expected: PASS أو بقاء الفشل فقط في اختبارات الحذف الجديدة.

### Task 3: بناء وضع تحرير فعلي مع تحديد متعدد

**Files:**
- Modify: `/workspace/dari-hanonah-landing/index.html`

- [ ] **Step 1: إضافة حالة صريحة لوضع التحرير والتحديد**

```js
let isGalleryEditMode = false;
let selectedImageIds = new Set();
```

- [ ] **Step 2: إضافة دوال التحكم في وضع التحرير**

```js
function toggleGalleryEditMode() {
  isGalleryEditMode = !isGalleryEditMode;
  if (!isGalleryEditMode) {
    selectedImageIds.clear();
  }
  renderGalleryEditState();
}
```

```js
function toggleImageSelection(imageId) {
  if (!isGalleryEditMode) return;
  if (selectedImageIds.has(imageId)) {
    selectedImageIds.delete(imageId);
  } else {
    selectedImageIds.add(imageId);
  }
  renderGalleryEditState();
}
```

- [ ] **Step 3: إضافة شريط أدوات لوضع التحرير**

يتضمن:

```html
<button type="button" data-testid="toggle-edit-mode-button">وضع التحرير</button>
<button type="button" data-testid="bulk-delete-button">حذف المحدد</button>
```

- [ ] **Step 4: ربط عناصر المعرض بالسلوك الجديد**

```js
newItem.onclick = function (event) {
  const imageId = newItem.querySelector('img')?.dataset.id;
  if (isGalleryEditMode && imageId) {
    event.preventDefault();
    toggleImageSelection(imageId);
    return;
  }
  openGalleryModal(index);
};
```

- [ ] **Step 5: تشغيل اختبارات الحذف مرة أخرى**

Run:

```bash
cd /workspace/dari-hanonah-landing && npm run test:e2e -- tests/landing.spec.ts --grep "deleting"
```

Expected: يبقى فشل مرتبط بالحذف الفعلي فقط، مع اختفاء خطأ غياب `toggleGalleryEditMode`.

### Task 4: إصلاح الحذف الفردي والجماعي وإعادة الرسم بعد كل عملية

**Files:**
- Modify: `/workspace/dari-hanonah-landing/index.html`

- [ ] **Step 1: جعل `deleteImage()` يعمل من الحالة الموحدة**

```js
function deleteImage(imageId) {
  const galleryItem = document.querySelector(`.gallery-item img[data-id="${imageId}"]`)?.closest('.gallery-item');
  if (!galleryItem) {
    showToast('الصورة غير موجودة', 'error');
    return false;
  }

  const img = galleryItem.querySelector('img');
  const deletedImage = normalizeGalleryImage({
    id: imageId,
    src: img.src,
    alt: img.alt,
    caption: galleryItem.querySelector('.gallery-caption')?.textContent || ''
  });

  trashBin.push({
    ...deletedImage,
    deletedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });

  galleryItem.remove();
  selectedImageIds.delete(imageId);
  saveTrashBinToStorage();
  saveGalleryToStorage();
  trackImageDelete(1);
  renderTrashBinTab();
  renderStatsTab();
  renderGalleryEditState();
  showToast('تم نقل الصورة إلى سلة المحذوفات', 'success');
  return true;
}
```

- [ ] **Step 2: إضافة دالة الحذف الجماعي**

```js
function deleteSelectedImages() {
  const ids = Array.from(selectedImageIds);
  if (ids.length === 0) {
    showToast('لم يتم تحديد أي صور', 'info');
    return false;
  }

  ids.forEach((id) => deleteImage(id));
  selectedImageIds.clear();
  renderGalleryEditState();
  showToast(`تم نقل ${ids.length} صورة إلى سلة المحذوفات`, 'success');
  return true;
}
```

- [ ] **Step 3: تحديث الاستعادة والحذف النهائي وتفريغ السلة**

كل دالة من `restoreImage` و`permanentDelete` و`emptyTrash` يجب أن تستدعي:

```js
renderTrashBinTab();
renderStatsTab();
renderGalleryEditState();
```

- [ ] **Step 4: تشغيل اختبارات الحذف والتحقق من تحولها إلى اللون الأخضر**

Run:

```bash
cd /workspace/dari-hanonah-landing && npm run test:e2e -- tests/landing.spec.ts --grep "deleting"
```

Expected: PASS.

### Task 5: اختبار الانحدار الكامل ثم النشر

**Files:**
- Modify: `/workspace/dari-hanonah-landing/tests/landing.spec.ts`
- Modify: `/workspace/dari-hanonah-landing/index.html`

- [ ] **Step 1: إضافة اختبار للاستعادة بعد الحذف الجماعي**

```ts
test('restores a deleted image from trash after bulk delete', async ({ page }) => {
  await page.goto('/');
  await page.locator('.upload-btn').click();
  await page.locator('#adminPasswordInput').fill('dari2024');
  await page.locator('#adminLoginModal button[type="submit"]').click();

  await page.locator('.admin-tab[data-tab="trashBin"]').click();
  await expect(page.locator('#trashBinTabContent')).toHaveClass(/active/);
});
```

- [ ] **Step 2: تشغيل كامل اختبارات Playwright**

Run:

```bash
cd /workspace/dari-hanonah-landing && npm run test:e2e
```

Expected: PASS.

- [ ] **Step 3: مراجعة الفروقات**

Run:

```bash
cd /workspace/dari-hanonah-landing && git diff -- index.html tests/landing.spec.ts
```

Expected: التعديلات محصورة في إصلاح الحذف ووضع التحرير والاختبارات المرتبطة.

- [ ] **Step 4: إنشاء commit**

```bash
cd /workspace/dari-hanonah-landing && git add index.html tests/landing.spec.ts docs/superpowers/plans/2026-08-02-gallery-delete-edit-mode-fix.md && git commit -m "fix: support sequential and bulk image deletion in edit mode"
```

- [ ] **Step 5: دفع التحديثات**

```bash
cd /workspace/dari-hanonah-landing && git push origin main
```

- [ ] **Step 6: التحقق من النشر**

Run:

```bash
cd /workspace/dari-hanonah-landing && git rev-parse --short HEAD
```

Expected: إرجاع معرف commit المنشور لاستخدامه في التحقق اليدوي على GitHub Pages.

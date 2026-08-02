import { test, expect } from '@playwright/test';

async function forceGitHubPatMode(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dariWorkerApiBase', '__disabled__');
    localStorage.removeItem('dariWorkerSessionToken');
  });
}

test.describe('Landing page regression guards', () => {
  test('preserves critical CTA links and contact form hook', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toHaveClass(/fr-landing/);
    await expect(page.locator('a[href="#contact"]').first()).toBeVisible();
    await expect(page.locator('a[href="https://wa.me/966546425459"]').first()).toBeVisible();

    const contactForm = page.locator('#contactForm');
    await expect(contactForm).toBeVisible();
    await expect(contactForm).toHaveAttribute('onsubmit', 'handleFormSubmit(event)');
  });

  test('shows desktop navigation and hides the mobile menu button on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    await expect(page.locator('.nav-links')).toBeVisible();
    await expect(page.locator('.mobile-menu-btn')).toBeHidden();
  });

  test('shows the mobile menu button and opens the mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const mobileMenuButton = page.locator('.mobile-menu-btn');
    const mobileMenu = page.locator('#mobileMenu');

    await expect(mobileMenuButton).toBeVisible();
    await expect(page.locator('.nav-links')).toBeHidden();
    await expect(mobileMenu).not.toHaveClass(/active/);

    await mobileMenuButton.click();
    await expect(mobileMenu).toHaveClass(/active/);
  });

  test('submits the contact form and shows the success state without changing the hook', async ({ page }) => {
    await page.goto('/');

    await page.locator('#motherName').fill('أم محمد');
    await page.locator('#phone').fill('0501234567');
    await page.locator('#childAge').selectOption('3-4years');
    await page.locator('#programType').selectOption('kindergarten');
    await page.locator('#notes').fill('أرغب في زيارة تعريفية هذا الأسبوع');

    const submitButton = page.locator('.form-submit');
    const successMessage = page.locator('#successMessage');

    await expect(successMessage).toBeHidden();
    await submitButton.click();
    await expect(submitButton).toHaveClass(/loading/);
    await expect(successMessage).toHaveClass(/show/, { timeout: 5000 });
    await expect(page.locator('#contactForm')).toHaveAttribute('onsubmit', 'handleFormSubmit(event)');
  });

  test('allows admin users to reach the upload tab and choose an image without client-side failure', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'default-1', src: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80', alt: 'أطفال في الحضانة', caption: 'أنشطة ترفيهية' },
        { id: 'default-2', src: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80', alt: 'طفلة سعيدة', caption: 'سعادة الأطفال' },
        { id: 'default-3', src: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=600&q=80', alt: 'تعلم القراءة', caption: 'تعلم القراءة' },
        { id: 'default-4', src: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=600&q=80', alt: 'أنشطة فنية', caption: 'أنشطة فنية' },
        { id: 'default-5', src: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&q=80', alt: 'لعب الأطفال', caption: 'لعب الأطفال' },
        { id: 'default-6', src: 'https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=600&q=80', alt: 'تعلم الكتابة', caption: 'تعلم الكتابة' },
        { id: 'default-7', src: 'https://images.unsplash.com/photo-1505377057305-6f60de705370?w=600&q=80', alt: 'أنشطة رياضية', caption: 'أنشطة رياضية' },
        { id: 'default-8', src: 'https://images.unsplash.com/photo-1602507343582-9c2b7f3b0a1e?w=600&q=80', alt: 'وقت القصة', caption: 'وقت القصة' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'upload-sha' }) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      manifest = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'upload-next-sha' } }) });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN');
    });

    await page.locator('.upload-btn').click();
    await expect(page.locator('#adminLoginModal')).toBeVisible();

    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();

    await expect(page.locator('#adminDashboardModal')).toBeVisible();
    await expect(page.locator('#uploadTabContent')).not.toHaveClass(/active/);

    await page.locator('.admin-tab[data-tab="upload"]').click();
    await expect(page.locator('#uploadTabContent')).toHaveClass(/active/);

    await page.locator('#imageUploadAdmin').setInputFiles({
      name: 'upload-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnQm4sAAAAASUVORK5CYII=', 'base64')
    });

    await expect(page.locator('#uploadProgressAdmin')).toBeVisible();
    await expect(page.locator('.toast.success').last()).toContainText('تم حفظ الصورة ونشرها للجميع');
    await expect(page.locator('.gallery-grid .gallery-item')).toHaveCount(9, { timeout: 10000 });
  });

  test('shows the upload tab inside the admin dashboard on mobile without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await forceGitHubPatMode(page);
    await page.goto('/');

    await page.locator('.upload-btn').click();
    await expect(page.locator('#adminLoginModal')).toBeVisible();

    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();

    const uploadTab = page.locator('.admin-tab[data-tab="upload"]');
    await expect(page.locator('#adminDashboardModal')).toBeVisible();
    await expect(uploadTab).toBeVisible();
    await expect(uploadTab).toBeInViewport();
  });

  test('renders the gallery from the public gallery.json manifest', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.galleryManifest && Array.isArray(window.galleryManifest.images));

    const manifestImages = await page.evaluate(() => window.galleryManifest.images);
    expect(manifestImages.length).toBeGreaterThan(0);

    const gridSrcs = await page.locator('.gallery-grid .gallery-item img').evaluateAll(
      (imgs) => imgs.map((img) => img.getAttribute('src'))
    );
    expect(gridSrcs.length).toBe(manifestImages.length);
    manifestImages.forEach((entry) => {
      expect(gridSrcs).toContain(entry.src);
    });
  });

  test('exposes the GitHub settings tab so the admin can configure persistence', async ({ page }) => {
    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();

    await expect(page.locator('#adminDashboardModal')).toBeVisible();
    await page.locator('.admin-tab[data-tab="settings"]').click();
    await expect(page.locator('#settingsTabContent')).toHaveClass(/active/);
    await expect(page.locator('#githubPatStatus')).toBeVisible();
    await expect(page.locator('#githubPatInput')).toBeVisible();
  });

  test('persists a configured GitHub PAT across reloads via localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN'));
    await page.reload();
    const stored = await page.evaluate(() => localStorage.getItem('dariGithubPat'));
    expect(stored).toBe('github_pat_TEST_FAKE_TOKEN');
  });

  test('shows invalid token status when GitHub PAT validation fails', async ({ page }) => {
    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Bad credentials' })
      });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="settings"]').click();

    await page.locator('#githubPatInput').fill('github_pat_TEST_FAKE_TOKEN');
    await page.locator('#githubPatForm button[type="submit"]').click();

    await expect(page.locator('#githubPatStatus')).toContainText('غير صالح');
  });

  test('blocks edit mode when GitHub PAT is invalid', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'invalid-edit-a', src: 'https://example.com/invalid-edit-a.png', alt: 'invalid-edit-a', caption: 'invalid-edit-a' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Bad credentials' })
      });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN'));
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="upload"]').click();
    await page.locator('#toggleGalleryEditMode').click();

    await expect(page.locator('.toast.error').last()).toContainText('صلاحية');
    await expect(page.locator('.gallery-grid .gallery-delete-btn')).toHaveCount(0);
  });

  test('shows worker service status when a Cloudflare Worker endpoint is configured', async ({ page }) => {
    await page.route('https://worker.example/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, mode: 'worker', configured: true })
      });
    });

    await page.route('https://worker.example/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, token: 'dariws_worker-token' })
      });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariWorkerApiBase', 'https://worker.example'));
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="settings"]').click();

    await expect(page.locator('#githubPatStatus')).toContainText('Worker');
  });

  test('shows a clear admin login error when the worker login request fails', async ({ page }) => {
    await page.route('https://dari-hanonah-gallery.gemini-linkin40.workers.dev/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, mode: 'worker', configured: true })
      });
    });

    await page.route('https://dari-hanonah-gallery.gemini-linkin40.workers.dev/api/auth/login', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();

    await expect(page.locator('#adminLoginError')).toBeVisible();
    await expect(page.locator('#adminLoginError')).toContainText('تعذر الاتصال');
  });

  test('deletes a gallery image through the configured worker endpoint without a GitHub PAT', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'worker-delete-a', src: 'https://example.com/worker-delete-a.png', alt: 'worker-delete-a', caption: 'worker-delete-a' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://worker.example/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, mode: 'worker', configured: true })
      });
    });

    await page.route('https://worker.example/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, token: 'dariws_worker-token' })
      });
    });

    await page.route('https://worker.example/api/gallery/manifest', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      manifest = {
        version: 1,
        updatedAt: '2026-08-02T00:00:00Z',
        images: payload.images || []
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, manifest })
      });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariWorkerApiBase', 'https://worker.example'));
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="upload"]').click();
    await page.locator('#toggleGalleryEditMode').click();
    await page.locator('[data-testid="single-delete-button"][data-image-id="worker-delete-a"]').click();

    await expect(page.locator('.gallery-grid img[data-id="worker-delete-a"]')).toHaveCount(0);
  });

  test('shows gallery delete controls only after admin enables edit mode', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'edit-mode-a', src: 'https://example.com/edit-mode-a.png', alt: 'edit-mode-a', caption: 'edit-mode-a' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'edit-mode-sha' }) });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN'));
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();

    await expect(page.locator('#adminDashboardModal')).toBeVisible();
    await expect(page.locator('.gallery-delete-btn')).toHaveCount(0);

    await page.locator('.admin-tab[data-tab="upload"]').click();
    await page.locator('#toggleGalleryEditMode').click();

    await expect(page.locator('.gallery-grid .gallery-delete-btn').first()).toBeVisible();
  });

  test('allows deleting multiple images sequentially while staying in edit mode', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'seq-a', src: 'https://example.com/seq-a.png', alt: 'seq-a', caption: 'seq-a' },
        { id: 'seq-b', src: 'https://example.com/seq-b.png', alt: 'seq-b', caption: 'seq-b' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'seq-sha' }) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      manifest = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'seq-next-sha' } }) });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN'));
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="upload"]').click();
    await page.locator('#toggleGalleryEditMode').click();
    await expect(page.locator('[data-testid="single-delete-button"][data-image-id="seq-a"]')).toBeVisible();

    await page.locator('[data-testid="single-delete-button"][data-image-id="seq-a"]').click();
    await expect(page.locator('.gallery-grid img[data-id="seq-a"]')).toHaveCount(0);
    await page.locator('[data-testid="single-delete-button"][data-image-id="seq-b"]').click();

    await expect(page.locator('.gallery-grid img[data-id="seq-b"]')).toHaveCount(0);
    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('dariTrashBin') || '[]').length))
      .toBeGreaterThanOrEqual(2);
  });

  test('allows deleting selected images in a single bulk action', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'bulk-a', src: 'https://example.com/bulk-a.png', alt: 'bulk-a', caption: 'bulk-a' },
        { id: 'bulk-b', src: 'https://example.com/bulk-b.png', alt: 'bulk-b', caption: 'bulk-b' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'bulk-sha' }) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      manifest = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'bulk-next-sha' } }) });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN'));
    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="upload"]').click();
    await page.locator('#toggleGalleryEditMode').click();

    await page.locator('.gallery-item:has(img[data-id="bulk-a"])').click();
    await page.locator('.gallery-item:has(img[data-id="bulk-b"])').click();
    await expect(page.locator('[data-testid="bulk-delete-button"]')).toBeEnabled();
    await page.locator('[data-testid="bulk-delete-button"]').click();

    await expect(page.locator('.gallery-grid img[data-id="bulk-a"]')).toHaveCount(0);
    await expect(page.locator('.gallery-grid img[data-id="bulk-b"]')).toHaveCount(0);
    await expect
      .poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('dariTrashBin') || '[]').length))
      .toBeGreaterThanOrEqual(2);
  });

  test('does not keep the uploaded image in the gallery when manifest publish fails', async ({ page }) => {
    await forceGitHubPatMode(page);
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
      name: 'publish-failure.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnQm4sAAAAASUVORK5CYII=', 'base64')
    });

    await expect(page.locator('.toast.error, .toast.warning')).toContainText('المفتاح غير صالح');
    await expect(page.locator('.gallery-grid img[alt="publish-failure.png"]')).toHaveCount(0);
  });

  test('keeps a manifest-backed uploaded image after a full reload', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'default-1', src: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80', alt: 'أطفال في الحضانة', caption: 'أنشطة ترفيهية' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'fake-sha' }) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      manifest = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'next-sha' } }) });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN');
    });

    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="upload"]').click();

    await page.locator('#imageUploadAdmin').setInputFiles({
      name: 'persisted-upload.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnQm4sAAAAASUVORK5CYII=', 'base64')
    });

    await expect(page.locator('.toast.success').last()).toContainText('تم حفظ الصورة ونشرها للجميع');
    await page.reload();
    await expect(page.locator('.gallery-grid img[alt="persisted-upload.png"]')).toBeVisible();
  });

  test('deletes a manifest-backed gallery image in admin edit mode', async ({ page }) => {
    let manifest = {
      version: 1,
      updatedAt: '2026-08-02T00:00:00Z',
      images: [
        { id: 'delete-me', src: 'https://example.com/delete-me.png', alt: 'Delete me', caption: 'Delete me' }
      ]
    };

    await page.route('**/gallery.json?t=*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json?ref=main', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'delete-sha' }) });
    });

    await page.route('https://api.github.com/repos/feel5l/dari-hanonah-landing/contents/gallery.json', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      manifest = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 'delete-next-sha' } }) });
    });

    await forceGitHubPatMode(page);
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('dariGithubPat', 'github_pat_TEST_FAKE_TOKEN');
    });

    await page.locator('.upload-btn').click();
    await page.locator('#adminPasswordInput').fill('dari2024');
    await page.locator('#adminLoginModal button[type="submit"]').click();
    await page.locator('.admin-tab[data-tab="upload"]').click();
    await page.locator('#toggleGalleryEditMode').click();

    await page.locator('.gallery-grid .gallery-item[data-id="delete-me"] .gallery-delete-btn').click();

    await expect(page.locator('.gallery-grid .gallery-item[data-id="delete-me"]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.gallery-grid .gallery-item[data-id="delete-me"]')).toHaveCount(0);
  });
});

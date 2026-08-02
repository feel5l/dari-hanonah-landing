import { test, expect } from '@playwright/test';

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
    await page.goto('/');

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
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnQm4sAAAAASUVORK5CYII=',
        'base64'
      )
    });

    await expect(page.locator('#uploadProgressAdmin')).toBeVisible();
    await expect(page.locator('.gallery-grid .gallery-item')).toHaveCount(9, { timeout: 10000 });
  });
});

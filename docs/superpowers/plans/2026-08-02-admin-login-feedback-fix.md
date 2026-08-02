# Admin Login Feedback Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin login button always show visible progress or a clear failure message instead of appearing unresponsive on mobile.

**Architecture:** Keep the current login flow in `index.html`, but add a small UI state layer around submit handling: loading, disabled controls, timeout-aware Worker login, and explicit error rendering. Update Playwright to cover the Worker failure state without changing the production login path.

**Tech Stack:** Static HTML, vanilla JavaScript, Cloudflare Worker API, Playwright

---

### Task 1: Add a failing regression test for silent admin login failure

**Files:**
- Modify: `/workspace/tests/landing.spec.ts`

- [ ] **Step 1: Add a Worker login failure test**

```ts
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
```

- [ ] **Step 2: Run only the new failing test**

```bash
npx playwright test tests/landing.spec.ts --grep "clear admin login error"
```

Expected: FAIL before implementation because the UI does not surface the network failure clearly enough.

### Task 2: Add explicit loading and failure states to admin login

**Files:**
- Modify: `/workspace/index.html`

- [ ] **Step 1: Add helper functions for login UI state**

```js
    function setAdminLoginBusyState(isBusy) {
      const passwordInput = document.getElementById('adminPasswordInput');
      const submitButton = document.querySelector('#adminLoginModal button[type="submit"]');

      if (passwordInput) passwordInput.disabled = isBusy;
      if (submitButton) {
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy ? 'جاري الدخول...' : 'دخول';
      }
    }

    function showAdminLoginError(message) {
      const errorDiv = document.getElementById('adminLoginError');
      if (!errorDiv) return;
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    function clearAdminLoginError() {
      const errorDiv = document.getElementById('adminLoginError');
      if (!errorDiv) return;
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }
```

- [ ] **Step 2: Wrap the Worker login path with visible busy/error handling**

```js
    async function adminLogin() {
      const passwordInput = document.getElementById('adminPasswordInput');
      if (!passwordInput) return;

      const password = passwordInput.value;
      clearAdminLoginError();
      setAdminLoginBusyState(true);

      try {
        if (isWorkerModeEnabled()) {
          const workerLogin = await Promise.race([
            loginWithWorker(password),
            new Promise((_, reject) => setTimeout(() => reject(new Error('worker-login-timeout')), 8000))
          ]);

          if (workerLogin.ok) {
            isAdminLoggedIn = true;
            passwordInput.value = '';
            showAdminPanel();
            showToast('تم تسجيل الدخول بنجاح عبر Cloudflare Worker', 'success');
            return;
          }

          showAdminLoginError(workerLogin.message || 'تعذر تسجيل الدخول');
          return;
        }

        if (password === ADMIN_PASSWORD) {
          isAdminLoggedIn = true;
          passwordInput.value = '';
          showAdminPanel();
          showToast('تم تسجيل الدخول بنجاح', 'success');
          return;
        }

        showAdminLoginError('كلمة المرور غير صحيحة');
      } catch (error) {
        showAdminLoginError('تعذر الاتصال بخدمة الدخول، حاول مرة أخرى');
      } finally {
        setAdminLoginBusyState(false);
      }
    }
```

- [ ] **Step 3: Reset the login UI state when closing the modal**

```js
    function closeAdminLogin() {
      const modal = document.getElementById('adminLoginModal');
      if (modal) modal.style.display = 'none';

      const passwordInput = document.getElementById('adminPasswordInput');
      if (passwordInput) passwordInput.value = '';

      clearAdminLoginError();
      setAdminLoginBusyState(false);
    }
```

- [ ] **Step 4: Run the focused test again**

```bash
npx playwright test tests/landing.spec.ts --grep "clear admin login error"
```

Expected: PASS.

### Task 3: Re-run the targeted and full regression checks

**Files:**
- Test: `/workspace/tests/landing.spec.ts`
- Test: `/workspace/tests/worker-api.test.mjs`

- [ ] **Step 1: Re-run Worker login related Playwright coverage**

```bash
npx playwright test tests/landing.spec.ts --grep "worker|admin login"
```

Expected: PASS.

- [ ] **Step 2: Re-run the full e2e suite**

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 3: Re-run Worker unit tests**

```bash
npm run test:worker
```

Expected: PASS.

- [ ] **Step 4: Commit the focused fix**

```bash
git add index.html tests/landing.spec.ts
git commit -m "fix: show clear admin login feedback"
```

Expected: one small commit for this login UX fix.

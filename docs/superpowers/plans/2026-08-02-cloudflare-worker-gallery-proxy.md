# Cloudflare Worker Gallery Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** نقل عمليات حفظ وحذف معرض الصور من المتصفح مباشرة إلى Cloudflare Worker وسيط يحتفظ بأسرار GitHub خارج الواجهة.

**Architecture:** سنضيف Worker مستقل يتحدث مع GitHub Contents API باستخدام أسرار محفوظة في Cloudflare، ونضيف طبقة عميل في الواجهة يمكنها استخدام الـ Worker عند ضبطه مع إبقاء المسار الحالي كاحتياط حتى لا ينكسر الموقع قبل النشر النهائي. سيتم اختبار منطق الـ Worker واستهلاك الواجهة له اختباريًا قبل أي تفعيل فعلي.

**Tech Stack:** HTML, Vanilla JavaScript, Cloudflare Workers, GitHub Contents API, Playwright, Node test runner

---

### Task 1: إضافة اختبارات فاشلة لمسار Worker

**Files:**
- Create: `/workspace/dari-hanonah-landing/tests/worker-api.test.mjs`
- Modify: `/workspace/dari-hanonah-landing/package.json`

- [ ] **Step 1: كتابة اختبار فاشل لتحقق الصحة عبر Worker**
- [ ] **Step 2: كتابة اختبار فاشل لتحديث manifest عبر Worker**
- [ ] **Step 3: إضافة أمر تشغيل الاختبارات**
- [ ] **Step 4: تشغيل الاختبارات والتأكد من فشلها**

### Task 2: إنشاء Worker محلي قابل للنشر

**Files:**
- Create: `/workspace/dari-hanonah-landing/cloudflare/worker.mjs`
- Create: `/workspace/dari-hanonah-landing/cloudflare/wrangler.toml`
- Create: `/workspace/dari-hanonah-landing/cloudflare/README.md`

- [ ] **Step 1: إنشاء دوال GitHub client داخل Worker**
- [ ] **Step 2: إنشاء endpoints للتحقق وقراءة وكتابة المعرض**
- [ ] **Step 3: تمرير الأسرار من env بدل أي قيم صريحة**
- [ ] **Step 4: تشغيل اختبارات Worker والتأكد من نجاحها**

### Task 3: دمج الواجهة مع Worker دون كسر الوضع الحالي

**Files:**
- Modify: `/workspace/dari-hanonah-landing/index.html`
- Modify: `/workspace/dari-hanonah-landing/tests/landing.spec.ts`

- [ ] **Step 1: إضافة طبقة client تتحدث مع Worker عند ضبط عنوانه**
- [ ] **Step 2: تعديل تبويب الإعدادات لشرح وضع Worker بدل مطالبة المستخدم بمفتاح GitHub**
- [ ] **Step 3: جعل الحذف والرفع والتحقق تستخدم Worker عند توفره**
- [ ] **Step 4: إبقاء المسار الحالي كاحتياط لحين توفر نشر Worker**
- [ ] **Step 5: تشغيل اختبارات Playwright المستهدفة**

### Task 4: التحقق النهائي وتجهيز التسليم

**Files:**
- Modify: `/workspace/dari-hanonah-landing/README.md`

- [ ] **Step 1: تشغيل جميع الاختبارات**
- [ ] **Step 2: توثيق أسرار Cloudflare المطلوبة وخطوات النشر**
- [ ] **Step 3: مراجعة الفروقات**
- [ ] **Step 4: إنشاء commit واضح**

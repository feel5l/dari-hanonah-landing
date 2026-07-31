# خطة تنفيذ: نظام حذف الصور ولوحة تحكم المسؤول

**التاريخ:** 2025-01-20  
**المشروع:** داري الحنونة - موقع الحضانة  
**الهدف:** إضافة نظام حذف الصور مع سلة محذوفات ولوحة تحكم لإدارة المحتوى

---

## 📋 ملخص المهام

### الميزات المطلوبة:
1. ✅ حذف الصور (خاص بالمسؤول فقط)
2. ✅ سلة محذوفات (Recycle Bin) مع استعادة
3. ✅ لوحة تحكم لإظهار/إخفاء الأقسام
4. ✅ حفظ الإعدادات في التخزين السحابي

---

## 🏗️ الهيكل العام

```
المعرض (Gallery)
    ├── عرض الصور (مع زر حذف عند تسجيل الدخول)
    ├── زر "وضع التحرير" (للمسؤول فقط)
    └── نافذة معاينة الصور

لوحة التحكم (Admin Dashboard)
    ├── تسجيل الدخول (كلمة المرور)
    ├── قسم رفع الصور
    ├── قسم حذف الصور (مع سلة المحذوفات)
    ├── قسم إعدادات الأقسام
    └── قسم الإحصائيات

التخزين (Storage)
    ├── Cloud Storage (ImgBB API)
    ├── LocalStorage (Backup + Settings)
    └── Trash Bin Data Structure
```

---

## 📁 الملفات المعدلة/الجديدة

### الملف الرئيسي:
- **`/workspace/dari-hanonah-landing/index.html`** - التعديلات الرئيسية

### الأقسام الجديدة في index.html:
1. **نظام المصادقة** - تسجيل الدخول بالباسورد
2. **وضع التحرير** - تفعيل/تعطيل وضع الحذف
3. **نافذة سلة المحذوفات** - عرض واستعادة الصور المحذوفة
4. **لوحة إعدادات الأقسام** - إظهار/إخفاء الأقسام
5. **قسم الإحصائيات** - عرض الإحصائيات

---

## 🔧 التفاصيل التقنية

### 1. نظام المصادقة (Authentication)

```javascript
// كلمة المرور الموحدة
const ADMIN_PASSWORD = 'dari2024';

// حالة المصادقة
let isAdminLoggedIn = false;

// التحقق من كلمة المرور
function verifyPassword(input) {
  return input === ADMIN_PASSWORD;
}
```

### 2. هيكل بيانات الصور

```javascript
// الصور النشطة
const galleryImages = [
  {
    id: 'img_001',
    src: 'https://i.ibb.co/xxx/xxx.jpg',
    alt: 'وصف الصورة',
    caption: 'عنوان الصورة',
    uploadedAt: '2025-01-20T10:30:00Z',
    isCustom: true // true للصور المرفوعة، false للصور الافتراضية
  }
];

// سلة المحذوفات
const trashBin = [
  {
    id: 'img_001',
    src: 'https://i.ibb.co/xxx/xxx.jpg',
    alt: 'وصف الصورة',
    deletedAt: '2025-01-20T10:30:00Z',
    expiresAt: '2025-02-19T10:30:00Z', // +30 يوم
    originalData: { /* نسخة من البيانات الكاملة */ }
  }
];
```

### 3. هيكل إعدادات الأقسام

```javascript
// إعدادات إظهار/إخفاء الأقسام
const sectionSettings = {
  hero: { visible: true, title: 'الرئيسية' },
  about: { visible: true, title: 'من نحن' },
  programs: { visible: true, title: 'البرامج' },
  gallery: { visible: true, title: 'معرض الصور' },
  testimonials: { visible: true, title: 'آراء الأمهات' },
  faq: { visible: false, title: 'الأسئلة الشائعة' }, // مخفي افتراضياً
  contact: { visible: true, title: 'تواصل معنا' }
};

// الإحصائيات
const siteStats = {
  visits: 152,
  inquiries: 12,
  imagesUploaded: 24,
  imagesDeleted: 3,
  lastUpdated: '2025-01-20T10:30:00Z'
};
```

### 4. وظائف حذف واستعادة الصور

```javascript
// حذف صورة (نقل إلى سلة المحذوفات)
function deleteImage(imageId) {
  const imageIndex = galleryImages.findIndex(img => img.id === imageId);
  if (imageIndex === -1) return false;
  
  const image = galleryImages[imageIndex];
  
  // نسخة للسلة
  const trashItem = {
    ...image,
    deletedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    originalData: { ...image }
  };
  
  // إضافة للسلة
  trashBin.push(trashItem);
  
  // حذف من المعرض
  galleryImages.splice(imageIndex, 1);
  
  // حفظ التغييرات
  saveToLocalStorage();
  
  return true;
}

// استعادة صورة من السلة
function restoreImage(imageId) {
  const trashIndex = trashBin.findIndex(img => img.id === imageId);
  if (trashIndex === -1) return false;
  
  const image = trashBin[trashIndex];
  
  // استعادة البيانات الأصلية
  const restoredImage = image.originalData || image;
  delete restoredImage.deletedAt;
  delete restoredImage.expiresAt;
  delete restoredImage.originalData;
  
  // إضافة للمعرض
  galleryImages.push(restoredImage);
  
  // حذف من السلة
  trashBin.splice(trashIndex, 1);
  
  // حفظ التغييرات
  saveToLocalStorage();
  
  return true;
}

// حذف نهائي من السلة
function permanentDelete(imageId) {
  const trashIndex = trashBin.findIndex(img => img.id === imageId);
  if (trashIndex === -1) return false;
  
  trashBin.splice(trashIndex, 1);
  saveToLocalStorage();
  
  return true;
}

// تنظيف السلة (حذف الصور منتهية الصلاحية)
function cleanupTrashBin() {
  const now = new Date().toISOString();
  const expiredIndices = [];
  
  trashBin.forEach((item, index) => {
    if (item.expiresAt < now) {
      expiredIndices.push(index);
    }
  });
  
  // حذف من الأخير إلى الأول
  expiredIndices.reverse().forEach(index => {
    trashBin.splice(index, 1);
  });
  
  if (expiredIndices.length > 0) {
    saveToLocalStorage();
  }
  
  return expiredIndices.length;
}
```

### 5. نظام تتبع الإحصائيات

```javascript
// تحديث الإحصائيات
function updateStats(type, value = 1) {
  if (!siteStats[type]) {
    siteStats[type] = 0;
  }
  siteStats[type] += value;
  siteStats.lastUpdated = new Date().toISOString();
  
  saveToLocalStorage();
}

// تتبع الزيارات
function trackVisit() {
  // التحقق من عدم احتساب نفس الجلسة
  const sessionKey = 'dari_session_tracked';
  if (sessionStorage.getItem(sessionKey)) {
    return; // تم تتبع هذه الجلسة مسبقاً
  }
  
  // تتبع الزيارة
  updateStats('visits', 1);
  
  // وضع علامة على الجلسة
  sessionStorage.setItem(sessionKey, 'true');
}

// تتبع الاستفسارات
function trackInquiry() {
  updateStats('inquiries', 1);
}

// تتبع رفع الصور
function trackImageUpload(count = 1) {
  updateStats('imagesUploaded', count);
}

// تتبع حذف الصور
function trackImageDelete(count = 1) {
  updateStats('imagesDeleted', count);
}
```

### 6. إدارة إعدادات الأقسام

```javascript
// تبديل حالة إظهار/إخفاء قسم
function toggleSection(sectionKey, visible) {
  if (sectionSettings[sectionKey]) {
    sectionSettings[sectionKey].visible = visible;
    
    // تحديث DOM
    updateSectionVisibility(sectionKey, visible);
    
    // حفظ الإعدادات
    saveToLocalStorage();
    
    return true;
  }
  return false;
}

// تحديث إظهار/إخفاء في DOM
function updateSectionVisibility(sectionKey, visible) {
  const sectionId = getSectionId(sectionKey);
  const section = document.getElementById(sectionId);
  
  if (section) {
    if (visible) {
      section.style.display = '';
      section.classList.remove('section-hidden');
    } else {
      section.style.display = 'none';
      section.classList.add('section-hidden');
    }
  }
}

// ربط مفاتيح الإعدادات بمعرفات HTML
function getSectionId(sectionKey) {
  const sectionMap = {
    hero: 'hero',
    about: 'about',
    programs: 'programs',
    gallery: 'gallery',
    testimonials: 'testimonials',
    faq: 'faq',
    contact: 'contact'
  };
  
  return sectionMap[sectionKey] || sectionKey;
}

// تطبيق جميع إعدادات الأقسام عند التحميل
function applyAllSectionSettings() {
  Object.keys(sectionSettings).forEach(sectionKey => {
    const visible = sectionSettings[sectionKey].visible;
    updateSectionVisibility(sectionKey, visible);
  });
}
```

### 7. الحفظ والتحميل من LocalStorage

```javascript
// مفتاح التخزين
const STORAGE_KEY = 'dariHanonah_adminData';

// حفظ جميع البيانات
function saveToLocalStorage() {
  const data = {
    galleryImages,
    trashBin,
    sectionSettings,
    siteStats,
    lastSaved: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to LocalStorage:', error);
    return false;
  }
}

// تحميل جميع البيانات
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      
      // استعادة البيانات
      if (data.galleryImages) galleryImages = data.galleryImages;
      if (data.trashBin) trashBin = data.trashBin;
      if (data.sectionSettings) sectionSettings = data.sectionSettings;
      if (data.siteStats) siteStats = data.siteStats;
      
      // تنظيف السلة
      cleanupTrashBin();
      
      return true;
    }
  } catch (error) {
    console.error('Error loading from LocalStorage:', error);
  }
  return false;
}

// تهيئة البيانات عند التحميل
function initializeData() {
  // تحميل من LocalStorage
  const loaded = loadFromLocalStorage();
  
  if (!loaded) {
    // استخدام البيانات الافتراضية
    console.log('Using default data');
  }
  
  // تطبيق إعدادات الأقسام
  applyAllSectionSettings();
  
  // تتبع الزيارة
  trackVisit();
  
  // تحديث واجهة المستخدم
  updateGalleryUI();
  updateStatsUI();
}

// تحديث واجهة المعرض
function updateGalleryUI() {
  // إعادة بناء معرض الصور
  renderGallery();
}

// تحديث واجهة الإحصائيات
function updateStatsUI() {
  // تحديث عرض الإحصائيات إذا كانت ظاهرة
  const statsContainer = document.getElementById('adminStats');
  if (statsContainer) {
    renderStats(statsContainer);
  }
}
```

---

## 🎯 خطة التنفيذ خطوة بخطوة

### المرحلة 1: إعداد البنية التحتية (30 دقيقة)

**المهام:**
1. ✅ إنشاء هيكل البيانات (galleryImages, trashBin, sectionSettings, siteStats)
2. ✅ إنشاء دوال الحفظ والتحميل من LocalStorage
3. ✅ إنشاء دالة initializeData() للتهيئة
4. ✅ إضافة CSS classes للأقسام المخفية (.section-hidden)

### المرحلة 2: نظام حذف الصور (45 دقيقة)

**المهام:**
1. ✅ إضافة زر "وضع التحرير" في معرض الصور (يظهر فقط للمسؤول)
2. ✅ إضافة أيقونة حذف (🗑️) على كل صورة في وضع التحرير
3. ✅ نافذة تأكيد الحذف مع السبب (اختياري)
4. ✅ نقل الصورة إلى trashBin مع تاريخ الحذف وتاريخ الانتهاء (+30 يوم)
5. ✅ حفظ التغييرات في LocalStorage
6. ✅ Toast notification: "تم نقل الصورة إلى سلة المحذوفات"

### المرحلة 3: سلة المحذوفات (45 دقيقة)

**المهام:**
1. ✅ إنشاء نموذج (Modal) جديد لسلة المحذوفات
2. ✅ عرض قائمة الصور المحذوفة مع:
   - الصورة المصغرة
   - تاريخ الحذف
   - أيام متبقية قبل الحذف النهائي
3. ✅ أزرار العمليات:
   - "🔄 استعادة" - إرجاع الصورة للمعرض
   - "🗑️ حذف نهائي" - حذف فوري بدون إمكانية الاستعادة
4. ✅ زر "🧹 تفريغ السلة" - حذف جميع الصور نهائياً
5. ✅ دالة cleanupTrashBin() تُنفذ تلقائياً عند التحميل لحذف الصور منتهية الصلاحية

### المرحلة 4: لوحة التحكم الرئيسية (60 دقيقة)

**المهام:**
1. ✅ إعادة تصميم نافذة المصادقة:
   - إدخال كلمة المرور
   - زر "دخول"
   - رابط "نسيت كلمة المرور" (اختياري)
2. ✅ بعد تسجيل الدخول، عرض لوحة التحكم مع Tabs:
   - 📤 رفع صور
   - 🗑️ سلة المحذوفات
   - ⚙️ إعدادات الأقسام
   - 📊 الإحصائيات
3. ✅ تسجيل الخروج

### المرحلة 5: إعدادات الأقسام (45 دقيقة)

**المهام:**
1. ✅ إنشاء قائمة بجميع الأقسام القابلة للإخفاء:
   - كل قسم: اسم + Toggle Switch (ON/OFF)
   - أيقونة عين 👁️ (مرئي) أو 🚫 (مخفي)
2. ✅ عند تغيير الحالة:
   - تحديث sectionSettings
   - تطبيق التغيير فوراً على DOM (إخفاء/إظهار القسم)
   - حفظ في LocalStorage
3. ✅ Toast notification: "تم تحديث الإعدادات"
4. ✅ زر "🔄 استعادة الإعدادات الافتراضية"

### المرحلة 6: نظام الإحصائيات (30 دقيقة)

**المهام:**
1. ✅ إنشاء دوال تتبع:
   - trackVisit() - تتبع الزيارات (مرة واحدة لكل جلسة)
   - trackInquiry() - تتبع الاستفسارات (عند إرسال نموذج التواصل)
   - trackImageUpload() - تتبع رفع الصور
   - trackImageDelete() - تتبع حذف الصور
2. ✅ عرض الإحصائيات في لوحة التحكم:
   - بطاقات إحصائية (Stats Cards)
   - أيقونات توضيحية
   - أرقام كبيرة وواضحة
3. ✅ زر "🔄 تحديث الإحصائيات"
4. ✅ (اختياري) رسم بياني بسيط للزيارات (مخزن محلياً)

### المرحلة 7: التكامل والاختبار (45 دقيقة)

**المهام:**
1. ✅ التأكد من عمل جميع الميزات معاً:
   - رفع صورة → تظهر في المعرض
   - حذف صورة → تنتقل للسلة
   - استعادة صورة → تعود للمعرض
   - حذف نهائي → تختفي نهائياً
2. ✅ اختبار تسجيل الدخول/الخروج
3. ✅ اختبار إظهار/إخفاء الأقسام
4. ✅ اختبار الحفظ والتحميل من LocalStorage
5. ✅ اختبار on Mobile (Responsive Design)
6. ✅ إصلاح أي Bugs

### المرحلة 8: التوثيق والCommit (15 دقيقة)

**المهام:**
1. ✅ كتابة ملخص للتغييرات في README.md (اختياري)
2. ✅ Commit للتغييرات مع رسالة واضحة:
   ```
   feat: Add image deletion, trash bin, and admin dashboard
   
   - Add image deletion with admin authentication
   - Add trash bin with 30-day retention
   - Add admin dashboard with section visibility controls
   - Add site statistics tracking
   - Save all settings to LocalStorage
   ```
3. ✅ Push للـ Repository (إذا كان متصلاً)

---

## 🎨 تصميم واجهة المستخدم (UI/UX)

### نموذج المصادقة (Login Modal)

```
┌─────────────────────────────────────┐
│           🔐 تسجيل الدخول           │
├─────────────────────────────────────┤
│                                     │
│  كلمة المرور:                       │
│  ┌─────────────────────────────┐   │
│  │  ••••••••                   │   │
│  └─────────────────────────────┘   │
│                                     │
│        ┌─────────────┐             │
│        │   دخول      │             │
│        └─────────────┘             │
│                                     │
└─────────────────────────────────────┘
```

### لوحة التحكم الرئيسية (Admin Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ لوحة تحكم داري الحنونة                    [خروج 🔓]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 📤 رفع   │ │ 🗑️ سلة   │ │ ⚙️ إعدادات│ │ 📊 إحصائيات│      │
│  │   صور   │ │  المحذوفات│ │   الأقسام │ │            │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  📊 إحصائيات الموقع:                                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   👁️ 152     │  │   📨 12      │  │   🖼️ 24      │      │
│  │   زيارة     │  │  استفسار   │  │   صورة      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### نافذة سلة المحذوفات (Trash Bin Modal)

```
┌─────────────────────────────────────────────────────────────┐
│  🗑️ سلة المحذوفات                    [× إغلاق]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ الصور المحذوفة تُحذف نهائياً بعد 30 يوماً                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [🖼️]  صورة أنشطة صيفية                    25 يوم │   │
│  │       [🔄 استعادة]  [🗑️ حذف نهائي]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [🖼️]  صورة حفل تخرج                         18 يوم │   │
│  │       [🔄 استعادة]  [🗑️ حذف نهائي]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [🖼️]  صورة رحلة المزرعة                      5 أيام │   │
│  │       [🔄 استعادة]  [🗑️ حذف نهائي]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [🧹 تفريغ السلة (حذف 3 صور نهائياً)]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### قسم إعدادات الأقسام (Section Settings)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ إعدادات إظهار/إخفاء الأقسام          [× إغلاق]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👁️  Hero الرئيسي                    [☑️]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👁️  من نحن                           [☑️]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👁️  البرامج                          [☑️]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👁️  معرض الصور                       [☑️]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🚫  الأسئلة الشائعة          [☐] [تفعيل]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👁️  تواصل معنا                       [☑️]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [🔄 استعادة الإعدادات الافتراضية]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ قائمة المهام (Task List)

### ✅ المرحلة 1: البنية التحتية
- [ ] 1.1 إنشاء هيكل البيانات في JavaScript
- [ ] 1.2 إنشاء دوال LocalStorage (save/load)
- [ ] 1.3 إضافة CSS للأقسام المخفية (.section-hidden)
- [ ] 1.4 Commit: "chore: Setup data structure and localStorage"

### ✅ المرحلة 2: نظام الحذف والاستعادة
- [ ] 2.1 إضافة زر "وضع التحرير" للمعرض
- [ ] 2.2 إضافة أيقونة الحذف على الصور
- [ ] 2.3 نافذة تأكيد الحذف
- [ ] 2.4 دالة deleteImage() - نقل للسلة
- [ ] 2.5 دالة restoreImage() - استعادة من السلة
- [ ] 2.6 دالة permanentDelete() - حذف نهائي
- [ ] 2.7 Toast notifications للتأكيد
- [ ] 2.8 Commit: "feat: Add image deletion and trash bin system"

### ✅ المرحلة 3: سلة المحذوفات
- [ ] 3.1 إنشاء نموذج سلة المحذوفات (Modal)
- [ ] 3.2 عرض قائمة الصور المحذوفة
- [ ] 3.3 عرض أيام البقاء لكل صورة
- [ ] 3.4 أزرار: استعادة - حذف نهائي
- [ ] 3.5 زر "تفريغ السلة"
- [ ] 3.6 تأكيد قبل التفريغ: "هل أنت متأكد من حذف X صورة نهائياً؟"
- [ ] 3.7 دالة cleanupTrashBin() - حذف منتهية الصلاحية
- [ ] 3.8 Commit: "feat: Add trash bin UI with restore and permanent delete"

### ✅ المرحلة 4: لوحة التحكم الرئيسية
- [ ] 4.1 إعادة تصميم نافذة المصادقة
- [ ] 4.2 إنشاء هيكل Tabs للوحة التحكم
- [ ] 4.3 Tab: رفع الصور (الموجود حالياً)
- [ ] 4.4 Tab: سلة المحذوفات
- [ ] 4.5 Tab: إعدادات الأقسام
- [ ] 4.6 Tab: الإحصائيات
- [ ] 4.7 زر تسجيل الخروج
- [ ] 4.8 Commit: "feat: Add main admin dashboard with tabs"

### ✅ المرحلة 5: إعدادات الأقسام
- [ ] 5.1 إنشاء قائمة بجميع الأقسام
- [ ] 5.2 Toggle Switch لكل قسم (☑️/☐)
- [ ] 5.3 أيقونة عين 👁️ / 🚫 حسب الحالة
- [ ] 5.4 تطبيق التغيير فوراً على DOM
- [ ] 5.5 حفظ الإعدادات تلقائياً
- [ ] 5.6 زر "استعادة الإعدادات الافتراضية"
- [ ] 5.7 Commit: "feat: Add section visibility controls"

### ✅ المرحلة 6: نظام الإحصائيات
- [ ] 6.1 إنشاء دوال تتبع الإحصائيات
- [ ] 6.2 trackVisit() - تتبع الزيارات
- [ ] 6.3 trackInquiry() - تتبع الاستفسارات
- [ ] 6.4 trackImageUpload() - تتبع رفع الصور
- [ ] 6.5 trackImageDelete() - تتبع حذف الصور
- [ ] 6.6 إنشاء واجهة عرض الإحصائيات (Stats Cards)
- [ ] 6.7 أيقونات توضيحية لكل إحصائية
- [ ] 6.8 زر تحديث الإحصائيات
- [ ] 6.9 Commit: "feat: Add site statistics tracking and display"

### ✅ المرحلة 7: التكامل والاختبار
- [ ] 7.1 اختبار رفع صورة → عرض في المعرض
- [ ] 7.2 اختبار تفعيل وضع التحرير
- [ ] 7.3 اختبار حذف صورة → نقل للسلة
- [ ] 7.4 اختبار استعادة صورة من السلة
- [ ] 7.5 اختبار الحذف النهائي
- [ ] 7.6 اختبار تفريغ السلة
- [ ] 7.7 اختبار إخفاء/إظهار أقسام
- [ ] 7.8 اختبار على Mobile (Responsive)
- [ ] 7.9 اختبار حفظ/استرجاع من LocalStorage
- [ ] 7.10 إصلاح أي Bugs
- [ ] 7.11 Commit: "test: Integration testing and bug fixes"

### ✅ المرحلة 8: التوثيق والنشر
- [ ] 8.1 تحديث README.md بالميزات الجديدة (اختياري)
- [ ] 8.2 إنشاء Commit نهائي
- [ ] 8.3 Push إلى GitHub
- [ ] 8.4 Commit: "docs: Update documentation with new features"

---

## ⏱️ الوقت المقدر

| المرحلة | الوقت | الحالة |
|---------|-------|--------|
| 1 - البنية التحتية | 30 د | ⏳ |
| 2 - نظام الحذف | 45 د | ⏳ |
| 3 - سلة المحذوفات | 45 د | ⏳ |
| 4 - لوحة التحكم | 60 د | ⏳ |
| 5 - إعدادات الأقسام | 45 د | ⏳ |
| 6 - الإحصائيات | 30 د | ⏳ |
| 7 - التكامل والاختبار | 45 د | ⏳ |
| 8 - التوثيق | 15 د | ⏳ |
| **المجموع** | **~6.5 ساعات** | |

---

## ✅ متطلبات ما قبل التنفيذ

- [ ] Git repository مهيأ
- [ ] Node.js مثبت (اختياري للاختبارات)
- [ ] المتصفح الحديث (Chrome/Firefox/Edge)
- [ ] LocalStorage مفعل في المتصفح

---

## 🚀 خطة البدء

**الخطوة 1:** إنشاء branch جديد  
```bash
git checkout -b feature/image-deletion-admin-dashboard
```

**الخطوة 2:** البدء بالمرحلة 1 (البنية التحتية)

**الخطوة 3:** تنفيذ كل مرحلة بالترتيب مع commit بعد كل مرحلة

**الخطوة 4:** دمج الـ branch بعد الانتهاء

---

هل أبدأ التنفيذ الآن؟ 🚀

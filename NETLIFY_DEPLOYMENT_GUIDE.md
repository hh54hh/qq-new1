# دليل إصلاح مشاكل النشر على Netlify

## المشكلة الشائعة: خطأ HTTP 502 في API

### الأعراض

- الواجهة الأمامية تعمل بشكل طبيعي
- جميع نداءات API ترجع خطأ 502
- رسائل خطأ في Functions logs

### الأسباب المحتملة والحلول

#### 1. مشكلة في إعداد Netlify Functions

**التحقق:**

```bash
# في Netlify Dashboard -> Functions
# تأكد من أن Functions Directory = "netlify/functions"
# تأكد من وجود الملفات التالية:
- netlify/functions/api.ts
- netlify/functions/test.ts (للاختبار)
```

**الحل:**

- تأكد من صحة ملف `netlify.toml`
- تأكد من أن build command يبني Functions بشكل صحيح

#### 2. مشكلة في serverless-http adapter

**المشكلة:** Express app لا يتحول بشكل صحيح إلى serverless function

**الحل الجديد المطبق:**

- تم إصلاح path handling في الـ function
- تم إضافة proper initialization
- تم تحسين CORS handling

#### 3. مشكلة في dependencies

**التحقق:**

```bash
npm ls serverless-http
npm ls @netlify/functions
```

**الحل:**

```bash
npm install serverless-http @netlify/functions
```

#### 4. مشكلة في Build Configuration

**تحقق من `netlify.toml`:**

```toml
[build]
  command = "npm ci && npm run build"
  functions = "netlify/functions"
  publish = "dist/spa"

[functions]
  node_bundler = "esbuild"
  external_node_modules = ["@supabase/supabase-js", "pg", "bcryptjs", "jsonwebtoken", "serverless-http", "express", "cors", "multer"]

[functions.api]
  timeout = 30
```

### خطوات التشخيص

#### 1. اختبار Function البسيطة

```
GET /.netlify/functions/test
```

إذا لم تعمل، المشكلة في أساسيات Functions.

#### 2. اختبار API Function

```
GET /.netlify/functions/api/ping
```

إذا لم تعمل، المشكلة في Express adapter.

#### 3. مراجعة Functions Logs

في Netlify Dashboard:

- Site Settings → Functions → View function logs
- ابحث عن error messages

#### 4. اختبار محلي

```bash
netlify dev
```

يجب أن تعمل Functions محلياً قبل النشر.

### أكواد الاختبار للمطور

في Developer Console (F12):

```javascript
// اختبار Function البسيطة
fetch("/.netlify/functions/test")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);

// اختبار API ping
fetch("/.netlify/functions/api/ping")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);

// اختبار redirect
fetch("/api/ping")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

### الإصلاحات المطبقة

#### 1. تحسين Netlify Function Handler

- إصلاح path transformation
- تحسين error handling
- إضافة detailed logging

#### 2. تحسين Express Server

- دعم dual routing (/api و root paths)
- تحسين serverless configuration
- إصلاح CORS headers

#### 3. إضافة Test Function

- Function بسيطة للتحقق من أن Netlify Functions تعمل

### خطوات النشر الصحيحة

1. **التأكد من البناء المحلي:**

```bash
npm run build
```

2. **التأكد من الـ dependencies:**

```bash
npm ci
```

3. **رفع التحديثات:**

```bash
git add .
git commit -m "Fix Netlify deployment issues"
git push
```

4. **مراقبة الـ deployment:**

- افتح Netlify Dashboard
- راقب build logs
- راقب function logs

### إذا استمرت المشاكل

#### أعد النشر الكامل:

1. في Netlify Dashboard: Site Settings → Build & Deploy
2. Clear cache and deploy site
3. أو من Git: Force new deploy

#### اتصل بالدعم:

- راجع [Netlify Status](https://status.netlify.com/)
- تأكد من عدم وجود مشاكل في الخدمة

### متغيرات البيئة

تأكد من إعداد المتغيرات في Netlify:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### معلومات إضافية

- Node.js version: 18+
- Timeout: 30 seconds للـ functions
- Memory: حسب خطة Netlify
- Cold start: أول طلب قد يستغرق وقتاً أطول

### استكشاف الأخطاء المتقدم

إذا استمرت المشاكل، تحقق من:

1. **Build logs** في Netlify Dashboard
2. **Function logs** بعد محاولة API call
3. **Network tab** في Developer Tools
4. **Console errors** في الصفحة

### تحديث الكود المطبق

تم تطبيق الإصلاحات التالية:

1. **netlify/functions/api.ts**: تحسين serverless handler
2. **server/index.ts**: إضافة dual routing support
3. **netlify.toml**: تحسين configuration
4. **netlify/functions/test.ts**: إضافة test function

يجب أن تحل هذه الإصلاحات مشكلة HTTP 502 في API endpoints.

# إصلاح مشاكل النشر على Netlify

## المشكلة الحالية

خطأ HTTP 404 في API endpoints عند النشر على Netlify.

## الحلول المقترحة

### 1. التحقق من Netlify Functions

```bash
# في Netlify Dashboard، تحقق من:
# - Site Settings → Functions
# - Functions Directory: netlify/functions
# - Build Command: npm ci && npm run build
# - Publish Directory: dist/spa
```

### 2. اختبار API endpoints يدوياً

```javascript
// في Developer Console (F12):
fetch("/.netlify/functions/api/ping")
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
```

### 3. التحقق من إعادة التوجيه

في ملف `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true
```

### 4. متغيرات البيئة (اختيارية)

إذا كنت تريد استخدام قاعدة بيانات مختلفة، أضف في Netlify Dashboard:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## خطوات الإصلاح

1. **فحص Functions logs في Netlify Dashboard**

   - انتقل إلى Functions tab
   - راجع الأخطاء في Real-time logs

2. **إعادة النشر**

   ```bash
   # حذف .netlify directory وإعادة النشر
   rm -rf .netlify
   # ثم push التغييرات أو إعادة النشر يدوياً
   ```

3. **اختبار محلي**
   ```bash
   npm run dev
   # تأكد أن كل شيء يعمل محلياً قبل النشر
   ```

## أرقام الدعم

للدعم الفني: 07800657822

## روابط مفيدة

- [Netlify Functions Documentation](https://docs.netlify.com/functions/)
- [صفحة التشخيص](/system-diagnostic)
- [صفحة التشخيص البديلة](/diagnostic)

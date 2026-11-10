# ميزان البر

دفتر شخصي تزن فيه برّك بوالديك وتقصيرك معهما، حجراً بحجر. تطبيق ويب يُثبَّت على الجوال ويعمل دون اتصال.

## التطوير

```bash
npm install
npm run dev        # http://localhost:5173
```

افتح `/?demo` لتجربة الواجهة ببيانات وهمية دون حساب، أو `/?demo=empty` لميزان فارغ.

## البناء والنشر

```bash
npm run build      # الناتج في dist/
npm run icons      # إعادة توليد الأيقونات بعد تعديل scripts/make-icons.mjs
```

كل دفعة إلى `main` تُنشر تلقائياً على GitHub Pages عبر `.github/workflows/deploy.yml`.

## البنية

| المسار | المحتوى |
| --- | --- |
| `src/scale/model.js` | قواعد الميزان والأوزان |
| `src/scale/physics.js` | المحاكاة الفيزيائية (planck) |
| `src/scale/painter.js` | الرسم على Canvas |
| `src/scale/engine.js` | ربط المحاكاة بالرسم واللمس |
| `src/data/firebase.js` | الحساب والبيانات على Firebase |
| `src/store.js` | حالة التطبيق |
| `src/ui/` | مكوّنات الواجهة |

# دليل نشر «إنجازاتي» على متجر آبل (App Store)

البناء يتم سحابياً عبر EAS Build — **لا تحتاج جهاز ماك قوياً ولا Xcode**، فقط حساب مطوّر آبل.

---

## المتطلب الوحيد المدفوع: حساب Apple Developer

1. افتح <https://developer.apple.com/programs/enroll/>
2. سجّل بحساب Apple ID الخاص بك واشترك في **Apple Developer Program** (99 دولار/سنة).
3. الموافقة تصل عادة خلال ٢٤–٤٨ ساعة.

> بدون هذا الحساب لا يمكن رفع أي تطبيق على متجر آبل.

---

## الخطوة ١ — رفع مفاتيح Supabase لبيئة البناء (مرة واحدة)

ملف `.env` لا يُرفع مع البناء السحابي، لذا نسجّل القيمتين في EAS:

```bash
cd ~/Desktop/enjazaty-app
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL \
  --value "$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d= -f2-)" \
  --visibility plaintext --scope project --non-interactive
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "$(grep EXPO_PUBLIC_SUPABASE_ANON_KEY .env | cut -d= -f2-)" \
  --visibility plaintext --scope project --non-interactive
```

## الخطوة ٢ — بناء التطبيق (بعد تفعيل حساب المطوّر)

```bash
npx eas-cli build --platform ios --profile production
```

- سيسألك عن تسجيل الدخول بحساب **Apple Developer** → وافق؛ تُنشأ الشهادات
  وملفات التوقيع تلقائياً.
- البناء يستغرق ١٥–٣٠ دقيقة على خوادم Expo، وينتهي برابط ملف `.ipa`.

## الخطوة ٣ — الرفع إلى App Store Connect

```bash
npx eas-cli submit --platform ios --latest
```

يرفع آخر بناء مباشرة إلى حسابك في App Store Connect.

## الخطوة ٤ — بطاقة المتجر (App Store Connect)

افتح <https://appstoreconnect.apple.com> → My Apps → التطبيق:

| الحقل | القيمة المقترحة |
|-------|------------------|
| الاسم | إنجازاتي |
| اللغة الأساسية | العربية |
| الفئة | Productivity (الإنتاجية) |
| الوصف | مساحة ذكية لإدارة وتوثيق واعتماد الإنجازات المهنية… |
| رابط سياسة الخصوصية | `https://enjazaty-app.expo.app/privacy` |
| رابط الدعم | `https://enjazaty-app.expo.app/contact` |

- **لقطات الشاشة**: مطلوبة لجهاز iPhone بحجم 6.7″ (مثل iPhone 15 Pro Max)
  وأخرى لـ iPad 12.9″ (لأن التطبيق يدعم الأجهزة اللوحية). التقطها من
  TestFlight أو المحاكي.
- **App Privacy**: صرّح بجمع «البريد الإلكتروني، الاسم، المحتوى الذي ينشئه
  المستخدم» مرتبطة بالحساب، لأغراض تشغيل التطبيق فقط، بلا تتبّع (No Tracking).
- **حساب للمراجعة**: أنشئ حساب موظف تجريبياً واذكر بريده وكلمة مروره في
  حقل Review Notes ليتمكن فريق آبل من الدخول.

## الخطوة ٥ — TestFlight ثم الإرسال للمراجعة

1. بعد `submit` يظهر البناء في **TestFlight** خلال دقائق — جرّبه على جهازك.
2. في صفحة الإصدار اختر البناء → **Add for Review** → **Submit to App Review**.
3. مراجعة آبل تستغرق عادة ١–٣ أيام.

## تحديثات لاحقة

عدّل الكود ثم:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

رقم البناء يزيد تلقائياً (`autoIncrement`)، ورقم الإصدار الظاهر (1.0.0)
يُعدَّل في `app.json → expo.version` عند إصدار نسخة جديدة.

---

## أندرويد لاحقاً (للمعلومية)

نفس الطريقة بحساب Google Play Console (رسوم 25 دولار لمرة واحدة):
`npx eas-cli build --platform android --profile production` ثم
`npx eas-cli submit --platform android --latest`.

# إنجازاتي · Enjazaty

تطبيق إنتاجية إداري لإدارة إنجازات الموظفين، يعمل كتطبيق **ويب** و **Android** و **iOS** من قاعدة كود واحدة.

A bilingual (Arabic-first / English) administrative productivity app for managing
employee achievements — running on **Web**, **Android**, and **iOS** from a
single codebase.

---

## ✨ المزايا · Features

- اختيار اللغة (العربية / الإنجليزية) مع دعم **RTL** أولاً.
- تسجيل الدخول بالبريد وكلمة المرور عبر **Supabase Auth**.
- اختيار نوع المستخدم: **مسؤول (Admin)** أو **موظف (Employee)**.
- معرّف مستخدم فريد (User ID) لكل حساب.
- شاشة رئيسية ذكية لإدارة مساحة العمل مع إحصائيات حية.
- صلاحيات **RBAC**: المسؤول يدير الموظفين والأقسام والتحليلات، الموظف يدير إنجازاته.
- مجلدات وأقسام، رفع صور/فيديو/ملفات/روابط إلى **Supabase Storage**.
- ملاحظات نصية وصور وملصقات تشجيعية + تقييمات بالنجوم.
- شريط تنقل سفلي ثابت: مساحة العمل، الملفات، النشاط، الإشعارات/التحليلات، الحساب.

## 🎨 الثيم · Theme

| | اللون |
|---|---|
| Primary Saffron | `#F4B000` |
| Primary Dark | `#D99A00` |
| Background | `#FFFFFF` |
| Soft Background | `#FFF8E6` |
| Text Dark | `#1F2937` |
| Muted Text | `#6B7280` |
| Border | `#F3E2B3` |
| Success | `#16A34A` |
| Danger | `#DC2626` |

## 🧱 التقنيات · Tech stack

- **Expo** + **React Native** (Android / iOS)
- **React Native Web** (نسخة الويب)
- **TypeScript**
- **Expo Router** (التنقل الملفي / file-based routing)
- **Supabase** (Auth + Postgres database + Storage)

---

## 🚀 التشغيل · Getting started

### 1) المتطلبات · Prerequisites
- Node.js 18+
- حساب Supabase مجاني · a free Supabase project

### 2) إعداد قاعدة البيانات · Set up the database
1. أنشئ مشروعاً جديداً في [Supabase](https://supabase.com).
2. من **SQL Editor** نفّذ محتوى الملف [`supabase/schema.sql`](./supabase/schema.sql)
   (ينشئ الجداول الثمانية + سياسات RLS + حاوية التخزين `attachments`).
3. من **Authentication → Providers** فعّل **Email**.

### 3) متغيرات البيئة · Environment variables
```bash
cp .env.example .env
```
ثم عبّئ القيم من **Supabase → Project Settings → API**:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

### 4) التثبيت والتشغيل · Install & run
```bash
npm install
npx expo start
```
- اضغط `w` لفتح نسخة **الويب**.
- اضغط `a` لمحاكي **Android** أو `i` لمحاكي **iOS** (أو امسح رمز QR بتطبيق Expo Go).

### 5) التصدير للنشر · Export for production
```bash
# تصدير حزمة الويب الثابتة (مجلد dist/) · static web bundle
npx expo export

# للويب فقط · web only
npx expo export --platform web
```

لبناء حِزم Android/iOS الأصلية استخدم **EAS Build**:
```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

---

## 🗂️ بنية المشروع · Project structure

```
enjazaty-app/
├─ app/                      # شاشات Expo Router · file-based routes
│  ├─ _layout.tsx            # المزودات العامة (Auth + Language)
│  ├─ index.tsx              # موجّه البداية · entry redirect
│  ├─ language.tsx           # 1) اختيار اللغة
│  ├─ (auth)/                # 2) تسجيل الدخول  3) إنشاء الحساب
│  ├─ (tabs)/                # شريط التنقل السفلي الثابت
│  │  ├─ workspace.tsx       # 4) الرئيسية / مساحة العمل
│  │  ├─ files.tsx           # 5) الملفات والمجلدات
│  │  ├─ activity.tsx        # سجل النشاط / كل الإنجازات
│  │  ├─ notifications.tsx   # 11) الإشعارات + التحليلات للمسؤول
│  │  └─ account.tsx         # 12) الحساب والإعدادات
│  ├─ achievement/           # 6) إضافة إنجاز  7) تفاصيل إنجاز
│  ├─ employees/             # 8) قائمة الموظفين  9) ملف الموظف
│  └─ notes/                 # 10) الملاحظات والتقييم
├─ src/
│  ├─ components/            # مكونات واجهة قابلة لإعادة الاستخدام
│  ├─ context/               # AuthContext + LanguageContext
│  ├─ i18n/                  # جداول الترجمة (ar / en)
│  ├─ lib/                   # supabase, api, storage, format
│  ├─ theme/                 # الألوان والمسافات
│  └─ types/                 # أنواع قاعدة البيانات
├─ supabase/schema.sql       # مخطط قاعدة البيانات + RLS + التخزين
├─ assets/                   # الأيقونات وشاشة البداية
├─ app.json                  # إعداد Expo
└─ .env.example              # نموذج متغيرات البيئة
```

## 🔐 الصلاحيات · Roles

| القدرة · Capability | Admin | Employee |
|---|:---:|:---:|
| إدارة الموظفين · Manage employees | ✅ | — |
| إنشاء الأقسام/المجلدات · Departments/folders | ✅ | ✅ |
| إضافة الإنجازات والمرفقات · Add achievements | ✅ | ✅ |
| التقييم بالنجوم · Star evaluations | ✅ | — |
| رؤية التحليلات · View analytics | ✅ | — |

> الصلاحيات مطبّقة على مستويين: واجهة المستخدم **و** سياسات Row Level Security في
> قاعدة البيانات (`supabase/schema.sql`).

## 📦 الجداول · Database tables
`users_profile` · `departments` · `folders` · `achievements` · `attachments` ·
`notes` · `evaluations` · `notifications`

---

تم بناؤه بحب لإدارة الإنجازات. · Built to celebrate achievements.

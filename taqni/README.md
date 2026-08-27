# تقني (Taqni) — v1 scaffold

Digitizes the work of the Educational Technology Guidance department
(starting with one coordinator "هنادي" and the designers under her
supervision, extensible later to every technology coordinator in the
Mubarak Al-Kabeer educational region, up to the supervisor and department
manager).

This is an **independent** Expo (React Native, web + mobile) app with an
**independent Supabase project** — it does not reuse Enjazaty's Supabase
project, RLS policies, or shared code, even though it lives in the same git
repo/branch for workflow reasons. See the root `CLAUDE.md` for what
Enjazaty is; this directory is unrelated to it.

## Stack

- Expo SDK 51, expo-router v3.5, React Native 0.74.5, TypeScript, React
  Native Web (mirrors the sibling Enjazaty app's proven setup).
- Supabase JS v2 (Auth + Postgres + Storage), RLS on every table.
- `src/i18n/translations.ts` — every string in Arabic (default, RTL) and
  English, one file, same convention as Enjazaty.
- `src/theme/colors.ts` — indigo theme (`#5B5FC7` primary / `#4649A3` dark,
  used only for the Header per spec).

## One-time setup (owner)

1. Create a **new, separate** Supabase project (do not reuse Enjazaty's).
2. In the Supabase SQL editor, run in order:
   - `supabase/schema.sql` — tables, RLS, the one-email-one-role-forever
     trigger.
   - `supabase/seed_schools.sql` — the 113 placeholder schools (see below).
3. Copy `.env.example` to `.env` inside `taqni/` and fill in the new
   project's URL + anon key.
4. `cd taqni && npm install`.

## What's real vs. stubbed in this v1

Built and working, wired to Supabase:

- Role hierarchy in the DB (`designer`, `coordinator`, `supervisor`,
  `dept_manager`, `general_manager`) with RLS + a DB trigger enforcing
  "one email = one role, forever" — mirrors Enjazaty's `migration_v8.sql`
  pattern, applied independently to this database.
- Role-aware, dynamic-field registration (designer vs.
  coordinator/supervisor) and login, both open/direct — no manual approval.
  A newly-registered designer gets an internal `status='pending'`
  classification only (NOT an access gate — the app works normally).
- Bottom-tab shell (`مدارسي`/`زياراتي`(`سجلاتي` for designers)/`أنشطة`/`بحث`/`حسابي`)
  that reads the tab label dynamically from the signed-in user's role.
- `مدارسي`: real school list (simple, ungrouped, per spec) + a real school
  detail screen: designers roster (+ assign existing designer), folders
  (+ add), that school's visits, that school's activities, a Google Maps
  link field, and a report-content picker sheet.
- `زياراتي`/`سجلاتي` with its 3 fixed sub-tabs, all reading/writing real
  rows: كالندر (calendar events, with a local push-notification reminder
  scheduled via `expo-notifications` when a future date/time is set), خطة
  الزيارات (schedule a visit: school/date/type/optional time), تقارير
  الزيارة (list of recorded visit reports).
- أنشطة: the two required sections (coordinator's own vs. supervised
  schools' activities), add-activity form.
- بحث: live search across schools + designers by name.
- حسابي: profile summary, language toggle, logout.

Deliberately simplified/stubbed for a future iteration (flagged in code
where relevant):

- **Detailed visit checklist items** (تنظيم/اكتمال السجلات، تنظيم غرفة/ورشة
  التقنيات، الأداء المهني، الإنتاج، المشاركات، تكليفات إضافية, etc.) — the
  `visit_reports.content` column is a flexible `jsonb` blob so this can grow
  without a migration each time, but the actual per-item form UI is not
  built yet. Same for the single evaluation table per school listing every
  designer with last-year/this-year scores.
- **New-hire 4-period evaluation window** (auto-computed from appointment
  date + job title, only shown at schools with an actual new hire) — the
  `appointment_date` column exists on `users_profile` but the computation
  and conditional display are not implemented.
- **Electronic signature / approval** — not built; Enjazaty's
  `SignatureView` pattern is the model to port when this is prioritized.
  `t('signaturePlaceholder')` exists as a translated placeholder string.
- **Photo upload with compression** for activities — no Supabase Storage
  bucket or upload UI yet; `t('photoUploadPlaceholder')` is a placeholder
  string only.
- **Server-side push dispatch** (e.g. notifying the coordinator when a
  designer adds a calendar entry) — only the LOCAL on-device reminder via
  `expo-notifications` is implemented (`src/lib/notifications.ts`); there is
  no push token registration/server function yet.
- **Report builder** — the "تقرير" button on a school opens a real
  content-selection sheet (زيارات/أنشطة/مصممين checkboxes) but "إنشاء
  التقرير" doesn't generate a document yet (shows a "coming soon" alert).
- **dept_manager / general_manager roles** — enum values and DB rows are
  supported (so promoting the system to include them later needs no schema
  change), but there is intentionally no registration/login UI for them, per
  spec ("غير مفعّل بالإطلاق عند الإطلاق").
- **113 school names are placeholder data** (`روضة/مدرسة مبارك الكبير
  الابتدائية/المتوسطة/الثانوية N`, numbered) — see `supabase/seed_schools.sql`.
  Replace with the real list once provided; the numeric counts (32/31/25/25)
  match the spec.

## Decisions made where the spec was ambiguous

- **Registration flow**: implemented as a single form per role (no separate
  email-OTP verification step like Enjazaty), assuming Supabase email
  confirmations will be turned OFF for this project too (same reasoning as
  Enjazaty: the free tier can't send OTP). If confirmations are ever turned
  on, `AuthContext.signUp` will need a verify-otp step added.
- **"المنطقة" for a designer** vs. **"المنطقة التعليمية" for
  coordinator/supervisor**: modeled as two different fields per the spec's
  wording — a short free-text `region` for the designer, and a longer
  free-text `educational_region` (pre-filled with the example wording from
  the spec, editable) for coordinator/supervisor.
- **"إضافة مصمم" on a school**: implemented as searching existing designer
  profiles by name and linking them via a `school_assignments` join table
  (rather than only trusting each designer's own `school_id`), so a
  designer can be associated with more than one school later without a
  schema change.
- **Visit types and the "استطلاعية = one sheet per designer" rule**: the
  `visits` table has a nullable `designer_id` so a survey visit can be
  scoped to one designer while guidance/evaluation/activity visits stay
  scoped to the whole school; the actual per-type form differences are not
  built out beyond the shared school/date/type/time fields (see "stubbed"
  above).
- **`designer_records`**: kept intentionally generic (school, designer,
  date, notes) since the spec says the unified form is not final yet.

## Verification run for this scaffold

```
npm install
npx tsc --noEmit
npx expo export --platform web
```

See the commit message / PR description for the actual output of these
three commands at scaffold time.

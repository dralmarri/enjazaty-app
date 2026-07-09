# Enjazaty (إنجازاتي) — Project Guide & Handoff

> This file briefs the AI coding assistant (and the new owner) on what this app
> is, how it is wired, and the EXACT steps to change or update it. The owner is
> a non-developer — the assistant should do the technical work and explain each
> action in plain language.

---

## 1. What the app is

**Enjazaty (إنجازاتي)** is an achievements-management app for schools/education
administration in Arabic (RTL-first, with English support). Employees record
their achievements with attachments; supervisors/admins review, evaluate, and
electronically sign them; reports can be printed and shared.

It runs as one codebase on **Web + iOS + Android** (React Native / Expo). The
live website is the primary product today:

- **Live site:** https://enjazaty-app.expo.app (custom domain **enjazaty.net** points
  here via Cloudflare Pages — see §2 and §4A)

Theme is "saffron": primary `#F4B000`, dark `#D99A00`, background `#FFFFFF`,
soft `#FFF8E6`, text `#1F2937`, border `#F3E2B3`. **All buttons use the saffron
theme — never red buttons.**

---

## 2. The technology, in plain words

| Piece | What it does | Where it lives |
|-------|--------------|----------------|
| **The app code** | The screens and logic | This GitHub repository |
| **Expo / EAS** | Builds the app and hosts the website | Expo org **`enjazaty`** (expo.dev) |
| **Supabase** | Database, user logins, file storage, 2 server functions | project `qsnpkrynyqyrfiuuoyme` |
| **Zoho Office Integrator** | Lets users edit Word/Excel/PowerPoint inside the app | Zoho account (API key stored in Supabase) |
| **GitHub Actions** | Publishes the website automatically on every change | `.github/workflows/deploy-web.yml` |
| **Cloudflare Pages** | Free custom-domain hosting for **enjazaty.net**, serving the same exported website | Cloudflare account, project `enjazaty-app-1` |

Key identifiers:
- Supabase URL: `https://qsnpkrynyqyrfiuuoyme.supabase.co`
- Expo owner (organization): `enjazaty` — set in `app.json` as `"owner"`
- EAS project id: `733fc2a8-a7b1-4359-8525-0d86d9ecf3c7` (in `app.json`)

---

## 3. Tech stack (for the assistant)

- Expo SDK **51**, expo-router v3.5, React Native 0.74.5, React Native Web, TypeScript.
- Supabase JS v2 (Auth + Postgres + Storage), Row Level Security on every table.
- Edge Functions (Deno) `doc-session` / `doc-save` for in-app document editing.
- Web is exported as a **single-page app** (`app.json → web.output: "single"`).
- Auto-deploy: push to the working branch → GitHub Actions → `eas deploy --prod`.

**Working branch:** `claude/injazati-full-app-tzdu5l` (this is the main branch;
the deploy workflow and everyone build from it).

### Repo layout
- `app/` — screens (expo-router file routes). Tabs in `app/(tabs)/`, auth in `app/(auth)/`.
- `src/components/` — shared UI (Button, Card, SignatureView, AchievementRow, …).
- `src/lib/` — data + logic (`api.ts` = all Supabase queries, `achievementFiles.ts`
  = print/share/save on the real file, `documents.ts`, `webpdf.ts`, `storage.ts`).
- `src/context/` — `AuthContext` (login/role), `LanguageContext` (ar/en, RTL).
- `src/i18n/translations.ts` — ALL text, Arabic + English. Add every new string to
  **both** `ar` and `en`.
- `src/theme/colors.ts` — the saffron palette + spacing/radius.
- `supabase/` — `schema.sql` + `migration_v2..v8.sql` (database setup) and
  `functions/` (the two edge functions).
- `docs/` — `handover.md` (ownership transfer), `app-store-guide.md` (iOS).

---

## 4. How to UPDATE the app — exact steps

### A) A normal change (a screen, text, colour, bug fix) → publishes the website

This is 95% of updates. The assistant does this:

1. Make the code change.
2. **Verify** before committing (always):
   ```bash
   npx tsc --noEmit            # types must pass (exit 0)
   npx expo export --platform web && node scripts/inject-pwa.js   # must end with "App exported to: dist"
   ```
3. Commit and push to the working branch:
   ```bash
   git add -A
   git commit -m "clear message of what changed"
   git push origin claude/injazati-full-app-tzdu5l
   ```
4. That push **auto-triggers deployment**. Within ~5 minutes the live site updates.
   - Watch it: GitHub repo → **Actions** tab → the run turns green ✅.
   - To deploy manually: **Actions → Deploy web to production → Run workflow**.

The owner does not need a Mac for this — pushing is enough. Every push also
publishes to **enjazaty.net** via Cloudflare Pages (same `dist/` output, no
extra steps) — see the one-time setup below.

### A2) enjazaty.net custom domain (Cloudflare Pages) — already set up

Custom domains require a **paid** Expo/EAS plan on `enjazaty-app.expo.app`, so
instead the site is mirrored to free Cloudflare Pages hosting, which supports
custom domains on its free tier. `deploy-web.yml` deploys to both EAS Hosting
(free subdomain, unchanged) and Cloudflare Pages (custom domain) on every push.

**Current setup (done, for reference if it ever needs to be recreated):**

- Cloudflare Pages project: **`enjazaty-app-1`** (must exactly match
  `deploy-web.yml`'s `projectName:` field).
- GitHub repo secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are
  set (Settings → Secrets and variables → Actions → Repository secrets).
  The token was created at **My Profile → API Tokens → Create Token** using
  the "Edit Cloudflare Workers" template (covers Pages permissions).
- The GitHub Actions step deploys via the Cloudflare API (`cloudflare/pages-action`),
  **not** Cloudflare's own Git integration — that Git integration was
  intentionally disconnected (Settings → Builds & deployments → Git
  repository → Disconnect) to avoid two competing deploy paths. If Cloudflare's
  Git integration ever gets reconnected, either disconnect it again, or set its
  build command to `npm install && npx expo export --platform web && node scripts/inject-pwa.js`
  with output directory `dist` and remove the `cloudflare/pages-action` step
  from `deploy-web.yml` instead (don't run both at once).
- Custom domains `enjazaty.net` and `www.enjazaty.net` are configured on the
  Cloudflare Pages project (Custom domains tab) and verified — DNS/SSL are live.
- Production branch on GitHub is `claude/injazati-full-app-tzdu5l` (the one
  and only branch `deploy-web.yml` triggers on — other branches from earlier
  work were merged into it and deleted to avoid branch drift).

`https://enjazaty.net` now serves the same site as
`https://enjazaty-app.expo.app`, and every push to the working branch updates both.

### B) A database change (new column, new rule, new permission)

Some changes need SQL run against Supabase. The assistant writes a new file
`supabase/migration_vN.sql` (next number), then the **owner runs it once**:

1. Open https://supabase.com/dashboard → project **enjazaty** → **SQL Editor**.
2. Paste the full contents of the new `migration_vN.sql` file.
3. Click **Run**. Success shows "Success. No rows returned".

Migrations are written to be safe to re-run. Never edit the database by hand —
always through a migration file so there's a record.

### C) A change to the document-editor server functions

Only if `supabase/functions/doc-session` or `doc-save` change. Needs a Mac once:

```bash
npx supabase login
npx supabase functions deploy doc-session --project-ref qsnpkrynyqyrfiuuoyme
npx supabase functions deploy doc-save --no-verify-jwt --project-ref qsnpkrynyqyrfiuuoyme
```

### D) Publishing the mobile app to Apple / Google (occasional)

See `docs/app-store-guide.md`. Short version (needs a Mac + paid developer account):

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

No Xcode needed — EAS builds in the cloud.

---

## 5. Secrets & configuration (never commit real secrets)

- **`.env`** (local only, not in git) holds:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://qsnpkrynyqyrfiuuoyme.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<the anon key from Supabase → Settings → API>
  ```
- **GitHub → Settings → Secrets and variables → Actions** must contain:
  `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (the last two are for the
  enjazaty.net custom domain — see §4A2).
- **Supabase → Edge Functions secrets:** `ZOHO_OI_API_KEY`, `DOC_SAVE_SECRET`.

---

## 6. Important rules already built in (don't break these)

- **Email confirmation is OFF** in Supabase Auth (the free tier can't send OTP).
  Signups log in immediately, then complete their profile.
- **One email = one role, forever** (`migration_v8.sql`): an employee email can
  never become an admin; a new role needs a new email. Enforced by a DB trigger.
- **Hierarchical permissions** (`migration_v7.sql`): a supervisor sees everyone
  below them in the chain (any depth), and nothing outside their chain. Uses the
  recursive `in_supervision_chain()` function.
- **Signatures** are stored as drawn strokes and MUST render through
  `SignatureView` (it draws them). Never print the raw stroke text.
- **Print / Share / Save** on an achievement act on the **original attached file**
  (its storage URL), never on an HTML rendering of the app page
  (`src/lib/achievementFiles.ts`).
- **Web output must stay `"single"`** in `app.json`, or EAS Hosting shows
  "Route Not Found".

---

## 7. Assistant working agreement

- Match the existing code style; keep Arabic + English strings in sync.
- ALWAYS run `npx tsc --noEmit` and `npx expo export --platform web && node scripts/inject-pwa.js` before pushing.
- The site is a PWA (`public/manifest.json`, `public/sw.js`, `public/icons/`, `scripts/inject-pwa.js`).
  Because `web.output` is `"single"`, `app/+html.tsx` is NOT used for the production HTML — Expo Router
  emits a fixed generic `dist/index.html` in single mode, so `scripts/inject-pwa.js` patches PWA tags
  (manifest link, theme-color, apple-touch-icon, service worker registration) into it after export.
  Keep this script in sync with any future `app/+html.tsx` changes since single-mode ignores that file.
- Commit to `claude/injazati-full-app-tzdu5l` with a clear message; the push
  publishes the site automatically.
- When a change needs the owner to do something (run SQL, add a secret, build for
  iOS), say so explicitly in simple, numbered steps.
- Be careful with anything destructive (deleting data, dropping tables). Confirm first.

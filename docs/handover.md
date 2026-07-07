# Enjazaty — Full Ownership Handover Guide

This project depends on **five services**. To hand everything to the new owner,
each must be transferred (or re-keyed) into her accounts. Do them in this order.

Legend: **[You]** = current owner · **[Her]** = new owner (the sister).

---

## 0) Accounts she must create first

Before starting, **[Her]** creates free accounts on:

- GitHub — <https://github.com/signup>
- Supabase — <https://supabase.com>
- Expo — <https://expo.dev/signup>
- Zoho — <https://www.zoho.com/officeintegrator/> (only for document editing)
- Apple Developer — only if/when publishing to the App Store (99 USD/yr)

Have her GitHub **username**, Supabase **org name**, and Expo **username** ready.

---

## 1) GitHub repository (the code)

**[You]**
1. Open `github.com/dralmarri/enjazaty-app` → **Settings**.
2. Scroll to the bottom → **Danger Zone** → **Transfer ownership**.
3. Type the repository name to confirm, then enter **[Her]** GitHub username.
4. Confirm.

**[Her]**
5. She gets an email / notification → **Accept transfer**.
6. The repo now lives at `github.com/<her-username>/enjazaty-app`.

> ⚠️ GitHub **does NOT transfer Actions secrets**. After the transfer she must
> re-add the three secrets (see step 6 below) or auto-deploy will fail.

---

## 2) Supabase (database, login, files, document functions)

This holds all data, user accounts, uploaded files, and the two edge functions.
Best path keeps the same URL + keys, so no code changes are needed.

**[Her]** creates a Supabase **Organization** (Dashboard → top-left org switcher
→ New organization).

**[You]**
1. Open the project → **Project Settings** → **General**.
2. **Transfer project** → choose **[Her]** organization → confirm.
   - If transfer isn't offered on the free plan, use the fallback:
     **Organization → Team → Invite** her as an **Owner**, then she can remove you.
3. The project URL (`https://qsnpkrynyqyrfiuuoyme.supabase.co`) and the anon key
   stay the same → `.env` and the GitHub secrets don't change.

> The edge-function secrets (`ZOHO_OI_API_KEY`, `DOC_SAVE_SECRET`) travel with
> the project. Only `ZOHO_OI_API_KEY` needs re-keying if she uses her own Zoho
> account (step 4).

---

## 3) Expo / EAS (web hosting + mobile builds)

The live site `enjazaty-app.expo.app` and the mobile build project live here.

**[You]**
1. Open <https://expo.dev> → your account → project **enjazaty-app**.
2. **Project settings** → **Transfer project** → to **[Her]** account (or to a
   shared Expo **Organization** she owns).
3. After transfer, the hosting URL stays with the project.

**[Her]**
4. Create her own deploy token: <https://expo.dev/settings/access-tokens> →
   **Create token** (used as the `EXPO_TOKEN` GitHub secret in step 6).

---

## 4) Zoho Office Integrator (in-app document editing)

Simplest: she uses her **own** Zoho key (no account transfer needed).

**[Her]**
1. Sign up at <https://www.zoho.com/officeintegrator/> → copy her **API key**.
2. Update the Supabase secret and redeploy the function (from a Mac, once):
   ```bash
   REF=qsnpkrynyqyrfiuuoyme
   npx supabase login
   npx supabase secrets set ZOHO_OI_API_KEY="<her-key>" --project-ref $REF
   npx supabase functions deploy doc-session --project-ref $REF
   ```
   (Keeping the current key also works — swap only if she wants her own.)

---

## 5) Apple Developer (only when publishing to App Store)

- **Not published yet** → nothing to transfer. She simply builds under her own
  Apple Developer account: `npx eas-cli build --platform ios --profile production`.
- **Already published under your account** → in App Store Connect open the app →
  **App Information** → **Transfer App** → enter her team, she accepts.

See `docs/app-store-guide.md` for the full submission walkthrough.

---

## 6) Re-add the deploy secrets (in HER repo)

**[Her]** — in `github.com/<her-username>/enjazaty-app` → **Settings** →
**Secrets and variables** → **Actions** → **New repository secret**, add:

| Name | Value |
|------|-------|
| `EXPO_TOKEN` | her Expo token from step 3.4 |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://qsnpkrynyqyrfiuuoyme.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the Supabase anon key (Supabase → Settings → API) |

Then **Actions** tab → **Deploy web to production** → **Run workflow** to confirm
a green ✅ deploy under her ownership.

---

## 7) The `.env` file (for local work on a Mac)

`.env` is intentionally NOT in git. To run/build locally she creates it:

```bash
echo "EXPO_PUBLIC_SUPABASE_URL=https://qsnpkrynyqyrfiuuoyme.supabase.co" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>" >> .env
```

---

## Handover checklist

- [ ] GitHub repo transferred and accepted
- [ ] Supabase project/org under her account
- [ ] Expo project transferred; she has her own `EXPO_TOKEN`
- [ ] Zoho key set (hers or existing) + `doc-session` redeployed
- [ ] Three GitHub Actions secrets re-added in her repo
- [ ] Manual **Run workflow** shows a green deploy
- [ ] `.env` recreated on her Mac (only if she builds locally)
- [ ] Apple: nothing now; App Transfer later if already published

Once all boxes are checked, she fully owns the code, the data, the live website,
the mobile build pipeline, and every credential. You can then remove yourself
from each service.

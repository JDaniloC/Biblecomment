# Mobile (Android)

## Status — chosen path: **TWA of the PWA**

The Android app is a **Trusted Web Activity (TWA)** wrapping the existing
PWA at `https://biblecomment.com.br`, generated with **PWABuilder.com**
and distributed via **Google Play App Signing**.

A TWA runs the real PWA in Chrome (your service worker / offline / push,
full web-platform fidelity), **chromeless** (no address bar), and is a
Play-Store app. It is strictly better than a remote-WebView shell for a
server-rendered site like this one.

### `capacitor/` scaffold is PARKED

The Capacitor project in this folder (`android/`, `capacitor.config.ts`,
`assets/`, `src/`) is the Phase-0 foundation. It is **not** the shipping
Android app — it was a bare Android-System-WebView pointing at the remote
URL, which adds little over the installed PWA. Keep it only as a starting
point **if** we later need native-bridge plugins (camera, biometrics,
native file share, background tasks). For "ship the web app to Play
Store", the TWA below is the path.

---

## Runbook — PWABuilder + Play App Signing

Prereq (done in repo): the prod manifest is valid and now served as
`application/manifest+json`; `/.well-known/assetlinks.json` is served as
`application/json` (see `netlify.toml`).

1. **Generate** — go to <https://www.pwabuilder.com>, enter
   `https://biblecomment.com.br`, **Package For Stores → Android**.
   - Package ID: `br.com.biblecomment.app`
     (must match `package_name` in `assetlinks.json` — change both if you
     change one).
   - Colors: theme `#1075d3`, background `#ffffff`, splash `#ffffff`
     (matches the web theme; light/dark handled by the site).
   - Download the zip: it contains the **`.aab`**, the generated
     **signing keystore** (store it in a password manager — losing it
     blocks future updates unless on Play App Signing), and a sample
     `assetlinks.json`.

2. **Play Console** — create the app, **enroll in Play App Signing**,
   upload the `.aab` (Internal testing track is enough to validate).
   Then open **Setup → App integrity → App signing**. You get TWO
   SHA-256 fingerprints:
   - **App signing key certificate** (Google-managed) — what matters for
     installs from Play.
   - **Upload key certificate** — for builds you sign/test locally.

3. **Digital Asset Links** — put **both** SHA-256 values into
   `nextjs/public/.well-known/assetlinks.json`, replacing
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` and
   `REPLACE_WITH_UPLOAD_KEY_SHA256`. Commit + deploy (Netlify). Verify:
   `https://biblecomment.com.br/.well-known/assetlinks.json` returns the
   real JSON with `Content-Type: application/json`, and Google's
   Statement List Tester
   (<https://developers.google.com/digital-asset-links/tools/generator>)
   passes for the domain + package.

4. **Validate chromeless** — install from Play Internal Testing on a
   device. The app must open with **no browser address bar**. If a URL
   bar appears, the assetlinks fingerprint/package doesn't match
   (recheck step 3, and that the deployed file isn't redirected/HTML).

### Notes

- Multiple `sha256_cert_fingerprints` are allowed (we list both Play +
  upload). Extra/old fingerprints don't break verification.
- No JDK/Android SDK needed for PWABuilder (it builds in the cloud).
  Local env (JAVA_HOME = Android Studio JBR, ANDROID_HOME set) is only
  needed for the parked Capacitor path or signing the `.aab` locally.

---

## Bumping for a new release (1.0.0 → 1.0.1 and onward)

Most code changes do NOT require a new AAB — the TWA pulls
`https://biblecomment.com.br` live, so any web-side update (new pages,
fixes, polish) reaches existing installs on the next launch.

A new release is only required when:

- You change a manifest field that Bubblewrap **bakes** into the AAB at
  generation time: theme/background color, splash screen, icons,
  `start_url`, `scope`, app name, or `package_name`.
- You change Android-only config (permissions, intent filters, target
  SDK bump — Google forces this annually).
- You want to **force re-verification of `/.well-known/assetlinks.json`
  on existing installs**. Chrome caches the Digital Asset Links result
  for up to 24h; a release pushed via Play forces immediate re-check on
  the next launch. (This is what motivated the `1.0.1` bump after the
  `assetlinks.json` SHA-256 fix.)

### Path A — Bubblewrap CLI (recommended, repeatable, ~30s per release)

**One-time setup** (run once on your dev machine):

```bash
npm i -g @bubblewrap/cli
bubblewrap doctor           # confirms JDK + Android SDK are wired up
```

**One-time project init** (creates a `twa-manifest.json` you re-use):

```bash
# Pick a directory OUTSIDE the nextjs/ tree, e.g. mobile/twa/
mkdir -p mobile/twa && cd mobile/twa
bubblewrap init --manifest https://www.biblecomment.com.br/manifest.webmanifest
```

Prompts:

- Accept package id `br.com.biblecomment.app` (must match
  `assetlinks.json`).
- Accept host `www.biblecomment.com.br`.
- When asked about the signing key, choose **"I already have a signing
  key"** and point it at the `signing.keystore` from the first PWABuilder
  release (kept in the password manager). Provide the password + alias.

Result: a `twa-manifest.json` in the directory. Stash a copy of it in the
password manager alongside the keystore — it's not secret but losing it
forces re-init.

**Per-release** (every time you cut a new version):

1. Edit `twa-manifest.json`:

   ```json
   {
     "appVersionName": "1.0.1",
     "appVersionCode": 2,
     ...
   }
   ```

   - `appVersionCode` must increment by ≥1 every release (Play rejects
     re-used codes).
   - `appVersionName` is the user-facing string (semver is fine).

2. Build:

   ```bash
   bubblewrap build
   # Prompts for the keystore password.
   # Produces app-release-bundle.aab (for Play) and
   # app-release-signed.apk (for ad-hoc sideloading).
   ```

3. Upload in Play Console:

   - **Test and release → Internal testing → Create new release**
   - Upload `app-release-bundle.aab`
   - Release name: `1.0.1`
   - Release notes (PT-BR): the user-facing changelog
   - Save → Review release → Rollout to Internal Testing

4. Wait for review (minutes to a few hours).

5. Promote: Internal → Closed (optional) → Open (optional) → Production.
   For minor fixes you can promote straight to Production after a short
   internal soak. For larger changes, give it 24h in Internal first.

### Path B — PWABuilder cloud (slower but no local install)

Use this if you don't want Bubblewrap installed locally.

1. Go to <https://www.pwabuilder.com> → enter
   `https://biblecomment.com.br` → **Package For Stores → Android**.
2. In the config screen:
   - **App version name**: `1.0.1`
   - **App version code**: `2`
   - Everything else identical to the first release (colors, package
     id, etc.).
3. **Signing key**: pick **"Use my own signing key"** and upload the
   existing `signing.keystore` + password + alias. **Do NOT let
   PWABuilder generate a new key** — Play rejects AABs signed with a
   different upload key.
4. Download the zip → upload the `.aab` to Play Console exactly like
   Path A step 3 onwards.

Trade-off: PWABuilder cloud build takes ~1–2 min vs ~10s local. You also
depend on the site being up, which is rare but real.

### Common pitfalls

- **`versionCode` collision** — Play refuses uploads with a code already
  used by ANY past release (including ones you withdrew). When in doubt,
  bump higher rather than reusing.
- **Wrong keystore** — signing with anything other than the keystore
  Play has registered as the upload key returns
  `Your Android App Bundle was signed with the wrong key`. Always pull
  from the password manager.
- **Upload key vs App Signing key** — you sign with the **upload** key;
  Google re-signs with the **App Signing** key (managed by Play App
  Signing). That's why `assetlinks.json` lists both SHA-256s.
- **Don't release straight to Production** for changes you haven't
  validated on a device. Internal testing track is cheap insurance.

### Release notes lengths

Play caps release notes at **500 characters per locale**. Keep the
PT-BR copy as the canonical version; only add other locales if/when you
localize the listing.

---

## PWA capabilities shipped (PWABuilder follow-up)

The TWA inherits these from the PWA automatically:

- **Service worker** — offline shell only. Visited chapter pages are
  **not** cached because `/verses/*` is server-rendered with
  session-derived props (per-user verse badges, "marcar como lido",
  prioritization), and a shared SW cache entry would leak across
  users on a shared device. Navigations fall back to `/offline` when
  the network drops; `/api/*` always goes to the network. A future
  revision can opt back into offline chapter reading via an anonymous
  variant + cookie-aware cache key. (`nextjs/public/sw.js`)
- **Web Push** — opt-in toggle in the notifications panel; fires on the
  existing in-app notification events (discussion answer, mentions, new
  follower, badge). Requires VAPID env (below); disabled gracefully when
  absent.
- **Manifest**: `id`, `screenshots`, `shortcuts` (Ler/Buscar/Discussões/
  Comunidades), `share_target` (shared text → `/search?q=`),
  `launch_handler` (navigate-existing).

### Web Push setup

1. `npx web-push generate-vapid-keys`
2. Set in Netlify env (never commit the private key):
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_SUBJECT`.
3. Deploy. Users enable via the bell → notifications panel toggle.

### Deferred manifest items (need Play listing / external)

- `related_applications` + `prefer_related_applications` — point the PWA
  at the published Play app (do **after** the TWA is live so the install
  prompt offers the native app).
- `iarc_rating_id` — from the IARC/Play content-rating questionnaire at
  store submission.

### Explicitly skipped (YAGNI for a pt-BR Bible reading/comment app)

`widgets`, `edge_side_panel`, `note_taking`, `window-controls-overlay`,
`tabbed`, `file_handlers`, `protocol_handlers`, `scope_extensions`,
`display_override` — no user value for this product; maintainer cost >
benefit. Revisit only if a concrete need appears.

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

# Local release pipeline (no EAS Build)

Builds the release `.aab` **on your machine** and uploads to Google Play — zero EAS
cloud build credits. App id: `com.zepvalue.zippyfit`.

## How it fits together

- `android/` is **generated** by `expo prebuild` and gitignored. Treat it as disposable —
  regenerate with `expo prebuild -p android --clean`, never hand-edit it. The day you
  edit a native file by hand, you've ejected the managed workflow.
- Release signing is injected on every prebuild by the
  [`withAndroidReleaseSigning`](../plugins/withAndroidReleaseSigning.js) config plugin,
  which reads the keystore from **Gradle properties stored outside the repo**. No secret
  ever lives in git.

## One-time setup

### 1. Generate an upload keystore (keep it safe — losing it loses the app)

```bash
keytool -genkeypair -v -keystore ~/.zippyfit-upload.jks \
  -alias zippyfit-upload -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Tell Gradle where it is (user-global, survives `prebuild --clean`)

Add to `~/.gradle/gradle.properties` (NOT in this repo):

```properties
ZIPPYFIT_UPLOAD_STORE_FILE=/Users/<you>/.zippyfit-upload.jks
ZIPPYFIT_UPLOAD_STORE_PASSWORD=<store password>
ZIPPYFIT_UPLOAD_KEY_ALIAS=zippyfit-upload
ZIPPYFIT_UPLOAD_KEY_PASSWORD=<key password>
```

### 3. Google Play service-account key

In Play Console → Setup → API access, create/link a service account with the
"Release apps to testing tracks" permission, download its JSON key, and save it as
`mobile/fastlane/play-store-key.json` (gitignored).

### 4. First upload is manual

`supply` can only update an app that already has at least one build. For a brand-new
listing, build once and upload that first `.aab` by hand in Play Console:

```bash
bundle install            # once, installs pinned fastlane
bundle exec fastlane android build
# → upload android/app/build/outputs/bundle/release/app-release.aab in Play Console
```

## Every release after that

```bash
bundle exec fastlane android deploy   # builds + uploads to the internal track as a draft
```

Promote internal → production from Play Console when you're happy.

## iOS (later)

The `ios` lane is a stub. Shipping iOS needs a Mac + Xcode, an App Store Connect API key,
and `match`/`gym`/`pilot` wiring. Do it when you actually want the App Store listing —
$99/yr vs Android's $25 one-time.

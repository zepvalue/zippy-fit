// Expo config plugin: inject an Android release signingConfig on every prebuild.
//
// The native `android/` dir is gitignored and regenerated via `expo prebuild --clean`,
// so signing config can't live in committed gradle files — it would be wiped. This
// plugin re-applies it each prebuild. No secrets live here: the keystore path and
// passwords are read from Gradle properties you set OUTSIDE the repo (see fastlane/README.md):
//
//   ZIPPYFIT_UPLOAD_STORE_FILE, ZIPPYFIT_UPLOAD_STORE_PASSWORD,
//   ZIPPYFIT_UPLOAD_KEY_ALIAS, ZIPPYFIT_UPLOAD_KEY_PASSWORD
//
// When those properties are absent (e.g. a teammate without the keystore), the release
// build falls back to the debug signing Expo generates, so prebuild never breaks.

const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('ZIPPYFIT_UPLOAD_STORE_FILE')) {
                storeFile file(ZIPPYFIT_UPLOAD_STORE_FILE)
                storePassword ZIPPYFIT_UPLOAD_STORE_PASSWORD
                keyAlias ZIPPYFIT_UPLOAD_KEY_ALIAS
                keyPassword ZIPPYFIT_UPLOAD_KEY_PASSWORD
            }
        }`;

function applyReleaseSigning(gradle) {
  // Idempotent: prebuild may run this against already-patched contents.
  if (gradle.includes('ZIPPYFIT_UPLOAD_STORE_FILE')) {
    return gradle;
  }

  // 1. Add a `release` signingConfig alongside the generated `debug` one.
  const signingConfigsAnchor = /signingConfigs\s*\{/;
  if (!signingConfigsAnchor.test(gradle)) {
    throw new Error(
      '[withAndroidReleaseSigning] could not find signingConfigs block in build.gradle'
    );
  }
  gradle = gradle.replace(
    signingConfigsAnchor,
    (match) => `${match}\n${RELEASE_SIGNING_CONFIG}\n`
  );

  // 2. Point the release buildType at it. The "signed-apk-android" caution comment
  //    Expo emits sits only above the release block's signingConfig, so it uniquely
  //    targets release (not the identical debug buildType line).
  const releaseBuildTypeAnchor =
    /(signed-apk-android\.\s*\n\s*)signingConfig signingConfigs\.debug/;
  if (!releaseBuildTypeAnchor.test(gradle)) {
    throw new Error(
      '[withAndroidReleaseSigning] could not find release buildType signingConfig; ' +
        'Expo template may have changed — re-check the regex.'
    );
  }
  gradle = gradle.replace(
    releaseBuildTypeAnchor,
    '$1signingConfig signingConfigs.release'
  );

  return gradle;
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error(
        '[withAndroidReleaseSigning] expected a Groovy build.gradle, got ' +
          config.modResults.language
      );
    }
    config.modResults.contents = applyReleaseSigning(config.modResults.contents);
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;

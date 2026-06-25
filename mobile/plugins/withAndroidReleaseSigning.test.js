const { applyReleaseSigning } = require('./withAndroidReleaseSigning');

// Mirrors the relevant slice of the Expo SDK 54 `android/app/build.gradle` template.
// Both buildTypes carry an identical `signingConfig signingConfigs.debug` line — the
// release one is distinguished only by the preceding "signed-apk-android" caution comment.
const TEMPLATE = `android {
    namespace 'com.zepvalue.zippyfit'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
        }
    }
}
`;

describe('applyReleaseSigning', () => {
  it('adds a release signingConfig that reads from off-repo Gradle properties', () => {
    const out = applyReleaseSigning(TEMPLATE);
    expect(out).toContain("if (project.hasProperty('ZIPPYFIT_UPLOAD_STORE_FILE'))");
    expect(out).toContain('storeFile file(ZIPPYFIT_UPLOAD_STORE_FILE)');
    expect(out).toContain('keyAlias ZIPPYFIT_UPLOAD_KEY_ALIAS');
  });

  it('points the release buildType at signingConfigs.release', () => {
    const out = applyReleaseSigning(TEMPLATE);
    expect(out).toContain('signingConfig signingConfigs.release');
  });

  it('leaves the debug buildType signing untouched', () => {
    const out = applyReleaseSigning(TEMPLATE);
    // Exactly one debug buildType reference should remain (the release one was rewritten).
    const debugRefs = out.match(/signingConfig signingConfigs\.debug/g) || [];
    expect(debugRefs).toHaveLength(1);
  });

  it('is idempotent — a second pass is a no-op', () => {
    const once = applyReleaseSigning(TEMPLATE);
    const twice = applyReleaseSigning(once);
    expect(twice).toBe(once);
  });

  it('throws if the signingConfigs block is missing', () => {
    expect(() => applyReleaseSigning('android {\n}\n')).toThrow(/signingConfigs block/);
  });

  it('throws if the release buildType anchor is missing', () => {
    const noReleaseAnchor = `android {
    signingConfigs {
        debug {}
    }
    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}
`;
    expect(() => applyReleaseSigning(noReleaseAnchor)).toThrow(
      /release buildType signingConfig/
    );
  });
});

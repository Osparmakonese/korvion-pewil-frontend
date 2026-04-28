import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Pewil mobile.
 *
 * Wraps the existing CRA build (output: `build/`) into native iOS and
 * Android shells so we can ship App Store + Play Store binaries without
 * a separate codebase. The web app at pewil.org continues to be the
 * single source of truth — the native shell just hosts the same JS.
 *
 * Setup commands (run on a developer machine with Xcode + Android Studio):
 *
 *   npm install --save-dev @capacitor/cli
 *   npm install @capacitor/core @capacitor/ios @capacitor/android
 *   npx cap add ios
 *   npx cap add android
 *   npm run build
 *   npx cap sync
 *   npx cap open ios       # opens Xcode, sign + archive there
 *   npx cap open android   # opens Android Studio, sign + bundle there
 *
 * See PEWIL_CAPACITOR_SETUP.md (workspace root) for the full distribution
 * walkthrough including signing certificates and store-listing copy.
 */
const config: CapacitorConfig = {
  appId: 'org.pewil.app',
  appName: 'Pewil',
  webDir: 'build',

  // Production: bundle the JS into the native app so it runs offline.
  // For local development, uncomment the `server` block below to point
  // the native shell at `npm start` running on your dev machine — that
  // gives you live reload while iterating on iOS/Android.
  // server: {
  //   url: 'http://192.168.1.5:3000',
  //   cleartext: true,
  // },

  ios: {
    // Respect the iPhone notch / safe area when laying out the web view.
    // Our CSS already uses env(safe-area-inset-*) so the bottom nav
    // and POS lane don't get clipped.
    contentInset: 'always',
    // Match the web app's launch background so there's no flash on cold
    // start. Cream from the locked mobile palette.
    backgroundColor: '#faf6ef',
  },

  android: {
    backgroundColor: '#faf6ef',
    // Allow http://localhost during dev (server.url above) without
    // triggering Android's cleartext-traffic block.
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#faf6ef',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashImmersive: false,
    },
    StatusBar: {
      // Status bar matches our green app bar. The web app already uses
      // <meta name="theme-color"> — this is the native fallback.
      backgroundColor: '#1a6b3a',
      style: 'LIGHT',
    },
  },
};

export default config;

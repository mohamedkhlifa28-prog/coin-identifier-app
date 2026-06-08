import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coinvault.app',
  appName: 'CoinVault',
  webDir: 'client/dist',
  // Loads the live Railway deployment so content stays up to date
  // without requiring an App Store update for every change.
  server: {
    url: 'https://coin-identifier-app-production.up.railway.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0F0F0F',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0F0F0F',
  },
  android: {
    backgroundColor: '#0F0F0F',
    allowMixedContent: false,
  },
};

export default config;

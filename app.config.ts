/// <reference types="node" />
import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'AquaFeed',
  slug: 'aquafeed',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'aquafeed',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'com.aquafeed.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.aquafeed.app',
    adaptiveIcon: {
      backgroundColor: '#0891b2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Needed for Expo push on Android (download from Firebase console → Android app)
    ...(existsSync(googleServicesFile) ? { googleServicesFile } : {}),
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0891b2',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    '@react-native-community/datetimepicker',
    ['expo-image-picker', { photosPermission: 'AquaFeed uses your photos so you can set a profile picture.' }],
    [
      'expo-notifications',
      {
        color: '#0891b2',
      },
    ],
    // iOS Google sign-in needs the reversed iOS client ID as a URL scheme
    iosUrlScheme
      ? ['@react-native-google-signin/google-signin', { iosUrlScheme }]
      : '@react-native-google-signin/google-signin',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

// Without a .env, Firebase throws at startup (auth/invalid-api-key). Use inert placeholders so
// the app can render the "not configured" screen; nothing talks to Firebase in that state.
const PLACEHOLDER = {
  apiKey: 'not-configured',
  databaseURL: 'https://not-configured-default-rtdb.firebaseio.com',
  projectId: 'not-configured',
};

const firstInit = getApps().length === 0;
export const app = firstInit
  ? initializeApp(isFirebaseConfigured ? firebaseConfig : { ...firebaseConfig, ...PLACEHOLDER })
  : getApp();

function createAuth(): Auth {
  // initializeAuth may only run once per app; Fast Refresh re-evaluates this module.
  if (!firstInit) return getAuth(app);
  if (Platform.OS === 'web') return getAuth(app);
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const auth = createAuth();
export const db = getDatabase(app);

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Alert } from '@/lib/alert';
import { clearCache, readCache, writeCache } from '@/lib/cache';
import { dbSubscribe, dbUpdate, isDemo, newKey } from '@/lib/db';
import { DEMO_UID, seedDemo, startDemoDevice, stopDemoDevice } from '@/lib/demo';
import { auth } from '@/lib/firebase';
import { paths } from '@/lib/paths';
import { DEFAULT_THRESHOLDS } from '@/lib/status';
import type { Aquarium, UserProfile } from '@/lib/types';

/** The signed-in account (a Firebase user, or the demo user). */
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  user: SessionUser | null;
  profile: UserProfile | null;
  /** True until Firebase has restored (or ruled out) a saved session */
  initializing: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: NameParts, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const PROFILE_CACHE = 'profile';
const DEMO_SESSION = 'aquafeed:demo-session';
let pendingDisplayName: string | null = null;
let pendingParts: Partial<NameParts> | null = null;

export interface NameParts {
  firstName: string;
  middleName?: string;
  lastName: string;
}

/** Trimmed parts (empty ones dropped) plus the joined full name. */
function cleanName(n: NameParts) {
  const parts = {
    firstName: n.firstName.trim(),
    ...(n.middleName?.trim() ? { middleName: n.middleName.trim() } : {}),
    lastName: n.lastName.trim(),
  };
  return { parts, full: [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(' ') };
}

/**
 * Google sign-in is native code, so it is loaded lazily: the rest of the app still runs in
 * Expo Go, and only the Google button needs a development build.
 */
let googleModule: typeof import('@react-native-google-signin/google-signin') | null = null;
async function loadGoogle() {
  if (googleModule) return googleModule;
  try {
    googleModule = await import('@react-native-google-signin/google-signin');
  } catch {
    throw new Error('Google sign-in needs a development build (it does not work in Expo Go).');
  }
  googleModule.GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  return googleModule;
}

/**
 * First sign-in: create the user's profile, an aquarium, and default goldfish thresholds
 * in one multi-path update. Role is always "owner"; administrators are promoted in the
 * Firebase console (security rules must block users from changing their own role).
 */
async function bootstrapUser(user: User) {
  const aquariumId = newKey(paths.aquariums);
  const now = Date.now();
  const profile: UserProfile = {
    email: user.email ?? '',
    displayName: pendingDisplayName ?? user.displayName ?? user.email?.split('@')[0] ?? 'Owner',
    ...(pendingParts ?? {}),
    role: 'owner',
    aquariumId,
    createdAt: now,
  };
  const aquarium: Aquarium = {
    ownerUid: user.uid,
    name: 'My Aquarium',
    target_fish_species: { variety: 'Common goldfish', count: 1, sizeCm: 5 },
    createdAt: now,
  };
  pendingDisplayName = null;
  pendingParts = null;
  await dbUpdate('', {
    [paths.user(user.uid)]: profile,
    [paths.aquarium(aquariumId)]: aquarium,
    [paths.thresholds(aquariumId)]: { ...DEFAULT_THRESHOLDS, updatedAt: now },
  });
}

/* ---------- demo mode (no Firebase project) ---------- */

let unsubDemoProfile: (() => void) | null = null;

function startDemoSession(
  set: (s: Partial<AuthState>) => void,
  email: string,
  name?: string,
) {
  seedDemo(email, name);
  unsubDemoProfile?.();
  unsubDemoProfile = dbSubscribe(paths.user(DEMO_UID), undefined, (v) => {
    if (v) set({ profile: v as UserProfile });
  });
  startDemoDevice();
  set({ user: { uid: DEMO_UID, email, displayName: name ?? null }, initializing: false });
  AsyncStorage.setItem(DEMO_SESSION, JSON.stringify({ email, name })).catch(() => {});
}

function endDemoSession(set: (s: Partial<AuthState>) => void) {
  stopDemoDevice();
  unsubDemoProfile?.();
  unsubDemoProfile = null;
  AsyncStorage.removeItem(DEMO_SESSION).catch(() => {});
  set({ user: null, profile: null });
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  initializing: true,

  init: () => {
    if (isDemo) {
      AsyncStorage.getItem(DEMO_SESSION)
        .then((raw) => {
          const saved = raw ? (JSON.parse(raw) as { email: string; name?: string }) : null;
          if (saved) startDemoSession(set, saved.email, saved.name);
          else set({ initializing: false });
        })
        .catch(() => set({ initializing: false }));
      return () => stopDemoDevice();
    }
    let unsubProfile: (() => void) | null = null;
    let bootstrapping = false;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubProfile?.();
      unsubProfile = null;
      if (!user) {
        set({ user: null, profile: null, initializing: false });
        return;
      }
      // Show the cached profile right away so the app opens offline.
      const cached = await readCache<UserProfile & { uid: string }>(PROFILE_CACHE);
      set({
        user,
        profile: cached?.uid === user.uid ? cached : get().profile,
        initializing: false,
      });

      unsubProfile = dbSubscribe(
        paths.user(user.uid),
        undefined,
        (value) => {
          const profile = value as UserProfile | null;
          if (!profile) {
            if (!bootstrapping) {
              bootstrapping = true;
              bootstrapUser(user)
                .catch((e) => console.warn('Profile setup failed', e))
                .finally(() => (bootstrapping = false));
            }
            return;
          }
          if (profile.disabled || profile.deleted) {
            // Turned off by an administrator: sign out and say why.
            Alert.alert(
              'This account is turned off',
              'An administrator has turned off this account. Ask them to turn it back on.',
              [{ text: 'OK' }],
            );
            void get().signOut();
            return;
          }
          set({ profile });
          writeCache(PROFILE_CACHE, { ...profile, uid: user.uid });
        },
        (e) => console.warn('Profile listener error', e),
      );
    });

    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  },

  signIn: async (email, password) => {
    if (isDemo) return startDemoSession(set, email.trim());
    await signInWithEmailAndPassword(auth, email.trim(), password);
  },

  register: async (name, email, password) => {
    const { parts, full } = cleanName(name);
    if (isDemo) {
      startDemoSession(set, email.trim(), full || undefined);
      await dbUpdate(paths.user(DEMO_UID), parts);
      return;
    }
    pendingDisplayName = full || null;
    pendingParts = parts;
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (pendingDisplayName) await updateProfile(cred.user, { displayName: pendingDisplayName });
  },

  signInWithGoogle: async () => {
    if (isDemo) return startDemoSession(set, 'demo.google@aquafeed.app', 'Google Demo');
    const { GoogleSignin, isSuccessResponse } = await loadGoogle();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return; // user cancelled
    const idToken = res.data.idToken;
    if (!idToken) throw new Error('Google did not return an ID token. Check the web client ID.');
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  },

  resetPassword: async (email) => {
    if (isDemo) return;
    await sendPasswordResetEmail(auth, email.trim());
  },

  signOut: async () => {
    if (isDemo) return endDemoSession(set);
    await googleModule?.GoogleSignin.signOut().catch(() => {});
    await fbSignOut(auth);
    await clearCache();
    set({ profile: null });
  },
}));

export const useIsAdmin = () => useAuth((s) => s.profile?.role === 'admin');

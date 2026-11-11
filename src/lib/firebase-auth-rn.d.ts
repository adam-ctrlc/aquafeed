// The Firebase JS SDK ships getReactNativePersistence in its React Native build,
// but the public typings only describe the web build.
import 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: typeof import('@react-native-async-storage/async-storage').default,
  ): import('firebase/auth').Persistence;
}

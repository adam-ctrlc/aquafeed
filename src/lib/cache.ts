import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'aquafeed:cache:';

export async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

export function writeCache(key: string, value: unknown): void {
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value ?? null)).catch(() => {});
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
}

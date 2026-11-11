import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Lets the user pick a square photo, shrinks it to 256 px JPEG and returns it as a base64
 * data URI (about 10–20 KB), small enough to store on the user's profile in the database.
 * Returns null if the user cancels.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets[0]) return null;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 256, height: 256 } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
}

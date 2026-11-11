import { Alert } from './alert';
import { isDemo } from './db';

export const modeLabel = isDemo ? 'Demo mode' : 'Live';

/** Explains, in plain words, where the app's data comes from. */
export function showModeInfo() {
  if (isDemo) {
    Alert.alert(
      'You are in demo mode',
      'The app is showing sample data from a pretend feeder, so you can try everything safely. Changes are not kept when you close the app.\n\nThe app is not connected to a real feeder yet. Whoever set up the app needs to link it to your online account first.',
      [{ text: 'Got it' }],
    );
  } else {
    Alert.alert(
      'You are connected',
      'The app is showing live data from your feeder. Readings, feeding times and alerts are saved to your account.',
      [{ text: 'Got it' }],
    );
  }
}

/** Called when the user taps the mode that is not active. */
export function explainOtherMode() {
  if (isDemo) {
    Alert.alert(
      'Live mode is not ready yet',
      'Live mode shows real data from your feeder. It turns on by itself once the app has been linked to your online account by whoever set it up. Until then you can keep exploring in demo mode.',
      [{ text: 'Got it' }],
    );
  } else {
    Alert.alert(
      'You are already live',
      'Demo mode is only for trying the app before it is connected. Your app is connected, so it always shows your real feeder.',
      [{ text: 'Got it' }],
    );
  }
}

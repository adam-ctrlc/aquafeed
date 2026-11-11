import { format, formatDistanceToNowStrict } from 'date-fns';

export const fmt = {
  ph: (v?: number) => (v == null ? '—' : v.toFixed(2)),
  temp: (v?: number) => (v == null ? '—' : `${v.toFixed(1)} °C`),
  turbidity: (v?: number) => (v == null ? '—' : `${v.toFixed(0)} %`),
  grams: (v?: number) => (v == null ? '—' : `${v.toFixed(2)} g`),
  ago: (ts?: number) => (ts ? `${formatDistanceToNowStrict(ts)} ago` : 'never'),
  dateTime: (ts?: number) => (ts ? format(ts, 'MMM d, h:mm:ss a') : '—'),
  time: (ts?: number) => (ts ? format(ts, 'h:mm a') : '—'),
};

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = String((e as { code: string }).code);
    const known: Record<string, string> = {
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/invalid-email': 'That email address is not valid.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/network-request-failed': 'No internet connection.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      PERMISSION_DENIED: 'You do not have permission to do that.',
    };
    if (known[code]) return known[code];
  }
  return e instanceof Error ? e.message : String(e);
}

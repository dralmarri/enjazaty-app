/**
 * Local push-notification helpers (expo-notifications).
 *
 * v1 scope: schedule a LOCAL reminder notification on-device when a designer
 * adds a calendar entry with a future date/time. Server-side push dispatch
 * (e.g. notifying the coordinator when a designer adds something) is NOT
 * implemented yet — see taqni/README.md "Stubbed for a future iteration".
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request OS notification permission (no-op / resolves false on web). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedule a local reminder for a calendar entry with a future date/time.
 * Returns the scheduled notification id, or null if it couldn't be
 * scheduled (past date, web platform, permission denied).
 */
export async function scheduleEventReminder(params: {
  title: string;
  body: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:mm
}): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const [hh, mm] = (params.time ?? '08:00').split(':').map((n) => parseInt(n, 10));
  const fireDate = new Date(params.date);
  fireDate.setHours(Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 0, 0, 0);

  if (fireDate.getTime() <= Date.now()) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: params.title, body: params.body },
      trigger: fireDate,
    });
    return id;
  } catch {
    return null;
  }
}

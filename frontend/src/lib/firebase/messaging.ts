import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload
} from 'firebase/messaging';

import { app } from './config';

export async function requestFCMPermission(): Promise<string | null> {
  if (!('Notification' in window)) {
    return null;
  }
  if (!(await isSupported())) {
    return null;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }
  try {
    const messaging = getMessaging(app);
    return await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    });
  } catch (error) {
    console.error('Failed to get FCM token', error);
    return null;
  }
}

export async function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): Promise<() => void> {
  if (!(await isSupported())) {
    return () => {};
  }
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDxR-sIpFkNiScRawfHmZ1gpbiYQU71lVQ',
  authDomain: 'promptwar-db092.firebaseapp.com',
  projectId: 'promptwar-db092',
  storageBucket: 'promptwar-db092.firebasestorage.app',
  messagingSenderId: '971353092285',
  appId: '1:971353092285:web:a7b9ab2eea0000e2d107d4'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || 'CrowdIQ notification';
  const body = payload.notification?.body || '';
  const isEmergency = data.type === 'EMERGENCY';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    data: {
      url: isEmergency ? '/emergency' : '/',
      type: data.type || 'GENERIC'
    },
    requireInteraction: isEmergency
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

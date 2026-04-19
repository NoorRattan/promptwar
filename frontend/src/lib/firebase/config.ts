import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

const emulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;
let firestoreEmulatorConnected = false;
if (emulatorHost && !firestoreEmulatorConnected) {
  const [host, portValue] = emulatorHost.split(':');
  const emulatorPort = Number(portValue ?? import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? '8080');
  connectFirestoreEmulator(db, host, emulatorPort);
  firestoreEmulatorConnected = true;
}

export { app };

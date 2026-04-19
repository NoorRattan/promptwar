import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  UserCredential,
  Unsubscribe,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './config';

export type { User as FirebaseUser } from 'firebase/auth';

/**
 * Login with email and password
 * @param email User email
 * @param password User password
 * @returns Promise resolving to UserCredential
 */
export function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Register a new user with email and password
 * @param email User email
 * @param password User password
 * @returns Promise resolving to UserCredential
 */
export function registerWithEmail(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Login anonymously (guest mode)
 * @returns Promise resolving to UserCredential
 */
export function loginAsGuest(): Promise<UserCredential> {
  return signInAnonymously(auth);
}

/**
 * Log out the current user
 * @returns Promise resolving when logout completes
 */
export function logout(): Promise<void> {
  return signOut(auth);
}

/**
 * Listen to auth state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function to call on unmount
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current user's ID token
 * @param forceRefresh Optional boolean to force token refresh
 * @returns Promise resolving to the token string or null if not authenticated
 */
export async function getIdToken(forceRefresh?: boolean): Promise<string | null> {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

/**
 * Get the current authenticated user synchronously
 * @returns The current FirebaseUser or null
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

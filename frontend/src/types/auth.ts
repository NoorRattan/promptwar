export interface User {
  readonly id: string;
  readonly uid?: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly full_name?: string | null;
  readonly role: UserRole;
  readonly preferredLanguage: SupportedLanguage;
  readonly preferred_language?: SupportedLanguage;
  readonly venueId: string | null;
  readonly venue_id?: string | null;
  readonly seatNumber: string | null;
  readonly seat_number?: string | null;
  readonly createdAt: string;  // ISO datetime string
}

export type UserRole = 'attendee' | 'staff' | 'admin';
export type SupportedLanguage = 'en' | 'hi' | 'es' | 'fr' | 'ar' | 'pt';

export interface AuthState {
  user: User | null;
  firebaseUid: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  preferredLanguage: SupportedLanguage;
  venueId?: string;
  seatNumber?: string;
}

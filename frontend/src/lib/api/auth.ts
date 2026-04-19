import apiClient from './client';
import { User, RegisterRequest } from '@/types';

/**
 * Register a new user profile on the backend
 * @param data Registration details
 * @returns Promise resolving to the created User
 */
export async function registerUser(data: RegisterRequest): Promise<User> {
  const response = await apiClient.post<User>('/auth/register', {
    email: data.email,
    full_name: data.fullName,
    preferred_language: data.preferredLanguage,
    venue_id: data.venueId,
    seat_number: data.seatNumber
  });
  return response.data;
}

/**
 * Get the current user's profile
 * @returns Promise resolving to the current User
 */
export async function getProfile(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}

/**
 * Update the current user's profile
 * @param data Partial registration details to update
 * @returns Promise resolving to the updated User
 */
export async function updateProfile(data: Partial<RegisterRequest>): Promise<User> {
  const response = await apiClient.patch<User>('/auth/me', {
    email: data.email,
    full_name: data.fullName,
    preferred_language: data.preferredLanguage,
    venue_id: data.venueId,
    seat_number: data.seatNumber
  });
  return response.data;
}

/**
 * Update the user's FCM token for notifications
 * @param token Firebase Cloud Messaging token
 * @returns Promise resolving to success response
 */
export async function updateFCMToken(token: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>('/auth/me/fcm-token', {
    fcm_token: token
  });
  return response.data;
}

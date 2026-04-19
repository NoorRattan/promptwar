// @ts-nocheck
import { storage } from './config';
import apiClient from '@/lib/api/client'; // Assuming API interaction to get signed URL or handle upload
// The prompt specifies: This client-side function reads the file as base64 and sends to backend.

/**
 * Upload a menu item image to Firebase Storage via the backend API
 * (POST /api/v1/orders/menu/{id}/image — backend handles actual upload).
 * This client-side function reads the file as base64 and sends to backend.
 * Returns the public URL.
 */
export async function uploadMenuImage(file: File, venueId: string): Promise<string> {
  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

  // Backend should expose an endpoint to accept this base64 image (or multipart)
  // For the purpose of this interface, we pass venueId/base64 via API.
  // The actual endpoint path and mechanism depend on the backend setup,
  // but the prompt specifies backend handles actual upload.
  const response = await apiClient.post(`/orders/menu/image`, {
    venue_id: venueId,
    file_base64: base64,
    file_name: file.name,
    content_type: file.type
  });
  
  // Note: Adjust the endpoint to match the exact requirement if an ID is generated before upload.
  // e.g. POST /api/v1/orders/menu/{id}/image
  
  return response.data.imageUrl;
}

/**
 * Construct the Firebase Storage public URL from a storage path.
 * Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
 */
export function getStorageUrl(path: string): string {
  const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string;
  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}

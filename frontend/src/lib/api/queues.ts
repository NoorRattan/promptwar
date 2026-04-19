import apiClient from './client';
import { QueueListResponse, QueueAlert } from '@/types';

/**
 * Get queues for a venue with optional filtering
 * @param venueId Venue ID
 * @param options Query options
 * @returns Promise resolving to QueueListResponse
 */
export async function getQueues(
  venueId: string,
  options?: { queueType?: string; openOnly?: boolean }
): Promise<QueueListResponse> {
  const response = await apiClient.get<QueueListResponse>(`/queues`, {
    params: {
      venue_id: venueId,
      queue_type: options?.queueType,
      open_only: options?.openOnly
    }
  });
  return response.data;
}

/**
 * Get queue alerts and predictions for a venue
 * @param venueId Venue ID
 * @returns Promise resolving to Array of QueueAlert
 */
export async function getQueueAlerts(venueId: string): Promise<QueueAlert[]> {
  const response = await apiClient.get<QueueAlert[]>(`/queues/alerts`, {
    params: { venue_id: venueId }
  });
  return response.data;
}

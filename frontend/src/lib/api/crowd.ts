import apiClient from './client';
import { VenueDensitySummary, ZoneDensity, CongestionPrediction } from '@/types';

/**
 * Get overall crowd density for a venue
 * @param venueId Venue ID
 * @returns Promise resolving to VenueDensitySummary
 */
export async function getVenueDensity(venueId: string): Promise<VenueDensitySummary> {
  const response = await apiClient.get<VenueDensitySummary>(`/crowd/density`, {
    params: { venue_id: venueId }
  });
  return response.data;
}

/**
 * Get crowd density for a specific zone
 * @param zoneId Zone ID
 * @param venueId Venue ID
 * @returns Promise resolving to ZoneDensity
 */
export async function getZoneDensity(zoneId: string, venueId: string): Promise<ZoneDensity> {
  const response = await apiClient.get<ZoneDensity>(`/crowd/density/${zoneId}`, {
    params: { venue_id: venueId }
  });
  return response.data;
}

/**
 * Get congestion predictions for a venue
 * @param venueId Venue ID
 * @returns Promise resolving to Array of CongestionPrediction
 */
export async function getCongestionPredictions(venueId: string): Promise<CongestionPrediction[]> {
  const response = await apiClient.get<CongestionPrediction[]>(`/crowd/predictions`, {
    params: { venue_id: venueId }
  });
  return response.data;
}

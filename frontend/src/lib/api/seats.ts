import apiClient from './client';
import { SeatUpgrade } from '@/types';

interface SeatUpgradeResponse {
  id: string;
  venue_id: string;
  from_seat: string;
  to_seat: string;
  from_section: string | null;
  to_section: string | null;
  price_difference: number;
  status: SeatUpgrade['status'];
  expires_at: string;
  seconds_until_expiry: number;
}

// Map seat upgrade from snake_case to camelCase
const mapSeatUpgradeResponse = (data: SeatUpgradeResponse): SeatUpgrade => ({
  id: data.id,
  venueId: data.venue_id,
  fromSeat: data.from_seat,
  toSeat: data.to_seat,
  fromSection: data.from_section,
  toSection: data.to_section,
  priceDifference: data.price_difference,
  status: data.status,
  expiresAt: data.expires_at,
  secondsUntilExpiry: data.seconds_until_expiry
});

/**
 * Get available seat upgrades for current venue
 * @param venueId Venue ID
 * @returns Promise resolving to array of SeatUpgrade
 */
export async function getSeatUpgrades(venueId: string): Promise<SeatUpgrade[]> {
  const response = await apiClient.get<SeatUpgradeResponse[]>(`/seats/upgrades`, {
    params: { venue_id: venueId }
  });
  return response.data.map(mapSeatUpgradeResponse);
}

/**
 * Accept a seat upgrade
 * @param upgradeId Upgrade ID
 * @returns Promise resolving to success boolean and message
 */
export async function acceptUpgrade(upgradeId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/seats/upgrades/${upgradeId}/accept`);
  return response.data;
}

/**
 * Decline a seat upgrade
 * @param upgradeId Upgrade ID
 * @returns Promise resolving to success boolean and message
 */
export async function declineUpgrade(upgradeId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/seats/upgrades/${upgradeId}/decline`);
  return response.data;
}

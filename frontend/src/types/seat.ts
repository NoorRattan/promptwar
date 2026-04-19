export type UpgradeStatus =
  | 'available'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired';

export interface SeatUpgrade {
  readonly id: string;
  readonly venueId: string;
  readonly venue_id?: string;
  readonly fromSeat: string;
  readonly from_seat?: string;
  readonly toSeat: string;
  readonly to_seat?: string;
  readonly fromSection: string | null;
  readonly from_section?: string | null;
  readonly toSection: string | null;
  readonly to_section?: string | null;
  readonly priceDifference: number;
  readonly price_difference?: number;
  readonly status: UpgradeStatus;
  readonly expiresAt: string;
  readonly expires_at?: string;
  readonly secondsUntilExpiry: number;
  readonly seconds_until_expiry?: number;
}

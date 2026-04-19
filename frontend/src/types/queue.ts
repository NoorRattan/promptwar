export type QueueType = 'food' | 'restroom' | 'entry' | 'merchandise' | 'medical' | 'information' | 'merch';
export type WaitLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Queue {
  readonly id: string;
  readonly venueId: string;
  readonly venue_id?: string;
  readonly zoneId: string | null;
  readonly zone_id?: string | null;
  readonly name: string;
  readonly queueType: QueueType;
  readonly queue_type?: QueueType;
  readonly isOpen: boolean;
  readonly is_open?: boolean;
  readonly estimatedWaitMinutes: number;
  readonly estimated_wait_minutes?: number;
  readonly wait_minutes?: number;
  readonly currentLength: number;
  readonly current_length?: number;
  readonly throughputPerMinute: number | null;
  readonly annotation: string | null;
  readonly lastUpdated: string | null;
  readonly last_updated?: string | null;
}

export interface QueueListResponse {
  readonly venueId: string;
  readonly totalQueues: number;
  readonly openQueues: number;
  readonly queues: Queue[];
}

export interface QueueAlert {
  readonly queueId: string;
  readonly queueName: string;
  readonly currentWait: number;
  readonly predictedWait15min: number;
  readonly predictedWait30min: number;
  readonly alert: boolean;
  readonly recommendation: string | null;
}

// Helper: derive wait level from minutes for colour coding
export function getWaitLevel(minutes: number): WaitLevel {
  if (minutes <= 5) return 'low';
  if (minutes <= 15) return 'medium';
  if (minutes <= 30) return 'high';
  return 'critical';
}

export type QueueState = Queue;

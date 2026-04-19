export type EmergencyType = 'FIRE' | 'MEDICAL' | 'SECURITY' | 'WEATHER' | 'GENERAL';

export interface EvacuationStep {
  instruction: string;
  distance: string;
  duration: string;
  start_lat: number;
  start_lng: number;
}

export interface EvacuationRoute {
  exit_name?: string;
  distance: string;
  duration: string;
  steps: EvacuationStep[];
  polyline: string;
}

export interface EmergencyState {
  is_active: boolean;
  type: EmergencyType;
  message: string;
  affected_zones: string[];
  evacuation_routes: Record<string, EvacuationRoute>;
  activated_at: string | null;
  deactivated_at?: string | null;
  activated_by_email?: string | null;
  evacuation_routes_ready?: boolean;
  nearest_exit?: string;
  nearest_exit_distance?: string;
}

export interface EmergencyStatusResponse {
  venue_id: string;
  is_active: boolean;
  emergency_type: EmergencyType | null;
  message: string | null;
  affected_zones: string[];
  activated_at: string | null;
  activated_by_email: string | null;
  sos_reports_count: number;
  evacuation_routes_ready: boolean;
}

export interface FirestoreEmergencyDoc {
  is_active: boolean;
  type: EmergencyType;
  message: string;
  affected_zones: string[];
  evacuation_routes: Record<string, EvacuationRoute>;
  activated_at?: { toDate: () => Date };
  deactivated_at?: { toDate: () => Date } | null;
  activated_by_email?: string | null;
  evacuation_routes_ready?: boolean;
}

export interface SOSPayload {
  venue_id: string;
  latitude: number | null;
  longitude: number | null;
  message?: string;
}

export interface SOSResponse {
  message: string;
}

export interface SafetyConfirmationPayload {
  venue_id: string;
  latitude?: number;
  longitude?: number;
}

export type SpeechState = 'idle' | 'speaking' | 'paused' | 'error' | 'unsupported';

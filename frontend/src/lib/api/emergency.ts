import apiClient from './client';
import type {
  EmergencyState,
  EmergencyStatusResponse,
  EmergencyType,
  SOSPayload,
  SOSResponse,
  SafetyConfirmationPayload
} from '@/types/emergency';

function mapEmergencyResponse(data: EmergencyStatusResponse): EmergencyState {
  return {
    is_active: data.is_active,
    type: data.emergency_type ?? 'GENERAL',
    message: data.message ?? '',
    affected_zones: data.affected_zones,
    evacuation_routes: {},
    activated_at: data.activated_at,
    activated_by_email: data.activated_by_email,
    evacuation_routes_ready: data.evacuation_routes_ready
  };
}

export async function getEmergencyStatus(venueId: string): Promise<EmergencyState> {
  const response = await apiClient.get<EmergencyStatusResponse>('/emergency/status', {
    params: { venue_id: venueId }
  });
  return mapEmergencyResponse(response.data);
}

export async function activateEmergency(data: {
  venueId: string;
  emergencyType: EmergencyType;
  message: string;
  affectedZones: string[];
  confirmed: true;
}): Promise<EmergencyState> {
  const response = await apiClient.post<EmergencyStatusResponse>('/emergency/broadcast', {
    venue_id: data.venueId,
    emergency_type: data.emergencyType,
    message: data.message,
    affected_zones: data.affectedZones,
    confirmed: data.confirmed
  });
  return mapEmergencyResponse(response.data);
}

export async function deactivateEmergency(
  venueId: string
): Promise<{ success: boolean; incidentId: string }> {
  const response = await apiClient.post<{ success: boolean; incident_id: string }>(
    '/emergency/deactivate',
    { venue_id: venueId, confirmed: true }
  );
  return {
    success: response.data.success,
    incidentId: response.data.incident_id
  };
}

export async function sendSOS(payload: SOSPayload): Promise<SOSResponse> {
  const response = await apiClient.post<SOSResponse>('/emergency/sos', {
    venue_id: payload.venue_id,
    lat: payload.latitude,
    lng: payload.longitude,
    message: payload.message
  });
  return response.data;
}

export async function confirmSafe(
  payload: SafetyConfirmationPayload
): Promise<{ confirmed: boolean }> {
  const response = await apiClient.post<{ confirmed: boolean }>(
    '/emergency/safe-confirmation',
    {
      venue_id: payload.venue_id,
      lat: payload.latitude,
      lng: payload.longitude
    }
  );
  return response.data;
}

export async function blockExit(
  zoneId: string,
  isBlocked: boolean
): Promise<{ success: boolean }> {
  const response = await apiClient.patch<{ success: boolean }>(
    `/emergency/exits/${zoneId}`,
    { zone_id: zoneId, is_blocked: isBlocked }
  );
  return response.data;
}

import apiClient from './client';
import type { EvacuationRoute } from '@/types/emergency';

interface RouteApiResponse {
  distance: string;
  duration: string;
  polyline: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
    start_lat: number;
    start_lng: number;
  }>;
  exit_name?: string;
}

function mapRouteResponse(data: RouteApiResponse): EvacuationRoute {
  return {
    exit_name: data.exit_name,
    distance: data.distance,
    duration: data.duration,
    polyline: data.polyline,
    steps: data.steps
  };
}

export async function getRoute(params: {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  venueId: string;
}): Promise<EvacuationRoute> {
  const response = await apiClient.get<RouteApiResponse>('/navigation/route', {
    params: {
      origin_lat: params.originLat,
      origin_lng: params.originLng,
      dest_lat: params.destLat,
      dest_lng: params.destLng,
      venue_id: params.venueId
    }
  });
  return mapRouteResponse(response.data);
}

export async function getNearestExit(params: {
  lat: number;
  lng: number;
  venueId: string;
}): Promise<{ exitZoneId: string; exitName: string; route: EvacuationRoute }> {
  const response = await apiClient.get<{
    exit_zone_id: string;
    exit_name: string;
    route: RouteApiResponse;
  }>('/navigation/nearest-exit', {
    params: { lat: params.lat, lng: params.lng, venue_id: params.venueId }
  });
  return {
    exitZoneId: response.data.exit_zone_id,
    exitName: response.data.exit_name,
    route: mapRouteResponse(response.data.route)
  };
}

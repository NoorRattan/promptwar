export type ZoneType =
  | 'entry'
  | 'concourse'
  | 'seating'
  | 'food'
  | 'restroom'
  | 'medical'
  | 'exit'
  | 'staff';

export interface PolygonPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface Zone {
  readonly id: string;
  readonly venueId: string;
  readonly venue_id?: string;
  readonly name: string;
  readonly zoneType: ZoneType;
  readonly zone_type?: ZoneType;
  readonly capacity: number;
  readonly currentCount: number;
  readonly current_count?: number;
  readonly currentDensity: number;
  readonly current_density?: number;
  readonly densityLevel: import('./crowd').DensityLevel;
  readonly density_level?: import('./crowd').DensityLevel;
  readonly latCenter: number;
  readonly lat_center?: number;
  readonly lngCenter: number;
  readonly lng_center?: number;
  readonly polygon: PolygonPoint[] | null;
  readonly isOpen: boolean;
  readonly is_open?: boolean;
  readonly isExitBlocked: boolean;
  readonly is_exit_blocked?: boolean;
}

export interface FloorPlanBounds {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

export interface Venue {
  readonly id: string;
  readonly slug?: string | null;
  readonly name: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly capacity: number;
  readonly latCenter: number;
  readonly lat_center?: number;
  readonly lngCenter: number;
  readonly lng_center?: number;
  readonly floorPlanUrl: string | null;
  readonly floor_plan_url?: string | null;
  readonly floorPlanBounds: FloorPlanBounds | null;
  readonly floor_plan_bounds?: FloorPlanBounds | null;
  readonly timezone: string;
  readonly isActive: boolean;
  readonly is_active?: boolean;
  readonly zones: Zone[];
}

export interface RouteResponse {
  distance: string;
  duration: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
    start_lat: number | string;
    start_lng: number | string;
  }>;
  polyline: string;
}

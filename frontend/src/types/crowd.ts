export type DensityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ZoneDensity {
  readonly id: string;
  readonly zoneId: string;
  readonly venueId: string;
  readonly venue_id?: string;
  readonly name: string;
  readonly zoneName: string;
  readonly zone_name?: string;
  readonly zone_type?: string | null;
  readonly density: number;
  readonly current_density?: number;
  readonly level: DensityLevel;
  readonly density_level?: DensityLevel;
  readonly count: number;
  readonly isOpen: boolean;
  readonly is_open?: boolean;
  readonly updatedAt: string | null;
  readonly updated_at?: string | null;
  readonly latCenter?: number;
  readonly lat_center?: number;
  readonly lngCenter?: number;
  readonly lng_center?: number;
  readonly polygon?: Array<{ lat: number; lng: number }> | null;
  readonly center_point?: { latitude: number; longitude: number } | null;
}

export interface VenueDensitySummary {
  readonly venueId: string;
  readonly totalZones: number;
  readonly criticalZones: number;
  readonly highZones: number;
  readonly mediumZones: number;
  readonly lowZones: number;
  readonly overallLevel: DensityLevel;
  readonly zones: ZoneDensity[];
}

export interface CongestionPrediction {
  readonly zoneId: string;
  readonly zone_id?: string;
  readonly zoneName: string;
  readonly zone_name?: string;
  readonly predictedLevel15min: DensityLevel;
  readonly predicted_level_15min?: DensityLevel;
  readonly predictedLevel30min: DensityLevel;
  readonly predicted_level_30min?: DensityLevel;
  readonly confidence: number;
  readonly alert: boolean;
  readonly alertMessage: string | null;
  readonly alert_message?: string | null;
}

export interface FirestoreZoneDensity {
  density: number;
  level: DensityLevel;
  count: number;
  updated_at: { toDate: () => Date } | null;
}

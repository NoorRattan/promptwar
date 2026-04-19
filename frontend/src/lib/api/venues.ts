import apiClient, { cachedGet } from '@/lib/api/client';
import { DEMO_VENUE, getDemoVenue } from '@/data/demoData';
import type { Venue, Zone } from '@/types';

export { DEMO_VENUE };

const publicVenueCache = new Map<string, { data: unknown; expires: number }>();

function mapZone(zone: Record<string, unknown>): Zone {
  const zoneType = String(zone.zone_type ?? 'concourse') as Zone['zoneType'];
  const densityLevel = String(zone.density_level ?? 'LOW').toUpperCase() as Zone['densityLevel'];

  return {
    id: String(zone.id),
    venueId: String(zone.venue_id ?? ''),
    venue_id: String(zone.venue_id ?? ''),
    name: String(zone.name ?? 'Zone'),
    zoneType,
    zone_type: zoneType,
    capacity: Number(zone.capacity ?? 0),
    currentCount: Number(zone.current_count ?? 0),
    current_count: Number(zone.current_count ?? 0),
    currentDensity: Number(zone.current_density ?? 0),
    current_density: Number(zone.current_density ?? 0),
    densityLevel,
    density_level: densityLevel,
    latCenter: Number(zone.lat_center ?? 0),
    lat_center: Number(zone.lat_center ?? 0),
    lngCenter: Number(zone.lng_center ?? 0),
    lng_center: Number(zone.lng_center ?? 0),
    polygon: Array.isArray(zone.polygon)
      ? (zone.polygon as Array<{ lat: number; lng: number }>)
      : null,
    isOpen: Boolean(zone.is_open ?? true),
    is_open: Boolean(zone.is_open ?? true),
    isExitBlocked: Boolean(zone.is_exit_blocked ?? false),
    is_exit_blocked: Boolean(zone.is_exit_blocked ?? false),
  };
}

function mapVenue(venue: Record<string, unknown>): Venue {
  return {
    id: String(venue.id),
    slug: typeof venue.slug === 'string' ? venue.slug : null,
    name: String(venue.name ?? 'Venue'),
    address: String(venue.address ?? ''),
    city: String(venue.city ?? ''),
    country: String(venue.country ?? ''),
    capacity: Number(venue.capacity ?? 0),
    latCenter: Number(venue.lat_center ?? 0),
    lat_center: Number(venue.lat_center ?? 0),
    lngCenter: Number(venue.lng_center ?? 0),
    lng_center: Number(venue.lng_center ?? 0),
    floorPlanUrl: typeof venue.floor_plan_url === 'string' ? venue.floor_plan_url : null,
    floor_plan_url:
      typeof venue.floor_plan_url === 'string' ? venue.floor_plan_url : null,
    floorPlanBounds:
      typeof venue.floor_plan_bounds === 'object' && venue.floor_plan_bounds !== null
        ? (venue.floor_plan_bounds as Venue['floorPlanBounds'])
        : null,
    floor_plan_bounds:
      typeof venue.floor_plan_bounds === 'object' && venue.floor_plan_bounds !== null
        ? (venue.floor_plan_bounds as Venue['floorPlanBounds'])
        : null,
    timezone: String(venue.timezone ?? 'UTC'),
    isActive: Boolean(venue.is_active ?? true),
    is_active: Boolean(venue.is_active ?? true),
    zones: Array.isArray(venue.zones)
      ? venue.zones.map((zone) => mapZone(zone as Record<string, unknown>))
      : [],
  };
}

function extractVenueItems(
  payload: Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | Record<string, unknown>
): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

function buildPublicUrl(path: string, params?: Record<string, unknown>): URL {
  const baseUrl = new URL(import.meta.env.VITE_API_BASE_URL);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  baseUrl.search = '';

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      baseUrl.searchParams.set(key, String(value));
    }
  });

  return baseUrl;
}

async function fetchPublicJson<T>(
  path: string,
  params?: Record<string, unknown>,
  ttlMs = 600_000
): Promise<T> {
  const cacheKey = `${path}::${JSON.stringify(params ?? {})}`;
  const cached = publicVenueCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const response = await fetch(buildPublicUrl(path, params), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Public request failed: ${response.status}`);
  }

  const data = (await response.json()) as T;
  publicVenueCache.set(cacheKey, { data, expires: Date.now() + ttlMs });
  return data;
}

function hasVenueCoordinates(venue: Venue): boolean {
  const lat = venue.lat_center ?? venue.latCenter ?? 0;
  const lng = venue.lng_center ?? venue.lngCenter ?? 0;
  return Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001;
}

function isVenueInIndia(venue: Venue): boolean {
  const lat = venue.lat_center ?? venue.latCenter ?? 0;
  const lng = venue.lng_center ?? venue.lngCenter ?? 0;
  return lat >= 8 && lat <= 37 && lng >= 68 && lng <= 98;
}

function hasPreferredVenueName(venue: Venue): boolean {
  return /metro|arena|stadium/i.test(venue.name ?? '');
}

function venueQualityScore(venue: Venue): number {
  let score = 0;

  if (isVenueInIndia(venue)) {
    score += 6;
  }
  if (venue.capacity > 0) {
    score += 4;
  }
  if (hasVenueCoordinates(venue)) {
    score += 3;
  }
  if ((venue.zones?.length ?? 0) > 0) {
    score += 2;
  }
  if (hasPreferredVenueName(venue)) {
    score += 2;
  }

  return score;
}

export function pickPreferredVenue(
  venues: Venue[],
  venueParam: string | null
): Venue | null {
  if (venues.length === 0) {
    return null;
  }

  const explicitMatch =
    venues.find((venue) => venue.slug === venueParam || venue.id === venueParam) ?? null;
  if (explicitMatch) {
    return explicitMatch;
  }

  return [...venues].sort((left, right) => venueQualityScore(right) - venueQualityScore(left))[0] ?? null;
}

export async function listVenues(
  demo = false,
  params?: Record<string, unknown>
): Promise<Venue[]> {
  try {
    const requestParams = {
      ...(demo ? { demo: true } : {}),
      ...(params ?? {}),
    };

    const payload = demo
      ? await fetchPublicJson<Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }>(
          '/venues',
          requestParams
        )
      : await cachedGet<Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }>(
          '/venues',
          requestParams,
          600_000
        );

    const venues = extractVenueItems(payload).map((venue) => mapVenue(venue));
    return venues.length > 0 ? venues : demo ? [DEMO_VENUE] : venues;
  } catch (error) {
    if (demo) {
      return [DEMO_VENUE];
    }
    throw error;
  }
}

export async function getBootstrapVenue(options?: {
  demo?: boolean;
  venueParam?: string | null;
}): Promise<Venue> {
  try {
    const response = await apiClient.get<
      Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }
    >('/venues', {
      params: {
        limit: 10,
        demo: options?.demo ?? true,
      },
      timeout: 8000,
    });

    const venues = extractVenueItems(response.data).map((venue) => mapVenue(venue));
    if (venues.length === 0) {
      return DEMO_VENUE;
    }

    return pickPreferredVenue(venues, options?.venueParam ?? null) ?? DEMO_VENUE;
  } catch {
    return DEMO_VENUE;
  }
}

export async function getVenueById(
  venueId: string,
  options?: { public?: boolean }
): Promise<Venue> {
  try {
    const payload = options?.public
      ? await fetchPublicJson<Record<string, unknown>>(`/venues/${venueId}`)
      : await cachedGet<Record<string, unknown>>(`/venues/${venueId}`, undefined, 600_000);
    return mapVenue(payload);
  } catch (error) {
    if (options?.public) {
      return getDemoVenue({ id: venueId });
    }
    throw error;
  }
}

export async function getVenueDetail(venueId: string): Promise<Venue> {
  return getVenueById(venueId, { public: true });
}

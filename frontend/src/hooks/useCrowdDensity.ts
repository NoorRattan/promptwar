import { useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, type FirestoreError } from 'firebase/firestore';

import { DEMO_VENUE, getDemoCrowdZones, getDemoVenue } from '@/data/demoData';
import { getVenueById } from '@/lib/api/venues';
import { db } from '@/lib/firebase/config';
import { isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useCrowdStore } from '@/store/crowdStore';
import { useVenueStore } from '@/store/venueStore';
import type { ZoneDensity } from '@/types/crowd';

function fallbackZoneName(zoneId: string): string {
  return `Zone ${zoneId.slice(0, 6)}`;
}

function mapVenueZones(
  zones: Array<{
    id: string;
    name: string;
    zone_type?: string;
    lat_center?: number;
    lng_center?: number;
    polygon?: Array<{ lat: number; lng: number }> | null;
  }>
): Record<string, typeof zones[number]> {
  return zones.reduce<Record<string, typeof zones[number]>>((accumulator, zone) => {
    accumulator[zone.id] = zone;
    return accumulator;
  }, {});
}

function mapFirestoreZone(
  venueId: string,
  docId: string,
  data: Record<string, unknown>,
  venueZone?: {
    id: string;
    name: string;
    zone_type?: string;
    lat_center?: number;
    lng_center?: number;
    polygon?: Array<{ lat: number; lng: number }> | null;
  }
): ZoneDensity {
  const density = Number(data.density ?? data.current_density ?? 0);
  const timestamp =
    data.updated_at && typeof data.updated_at === 'object' && 'toDate' in data.updated_at
      ? (data.updated_at as { toDate: () => Date }).toDate().toISOString()
      : null;
  const zoneName =
    venueZone?.name ??
    (typeof data.zone_name === 'string' ? data.zone_name : undefined) ??
    (typeof data.name === 'string' ? data.name : undefined) ??
    fallbackZoneName(docId);
  const lat = Number(data.lat_center ?? venueZone?.lat_center ?? 0);
  const lng = Number(data.lng_center ?? venueZone?.lng_center ?? 0);
  const level = String(data.level ?? data.density_level ?? 'LOW').toUpperCase() as ZoneDensity['level'];

  return {
    id: docId,
    zoneId: docId,
    venueId,
    venue_id: venueId,
    name: zoneName,
    zoneName,
    zone_name: zoneName,
    zone_type:
      venueZone?.zone_type ??
      (typeof data.zone_type === 'string' ? data.zone_type : null),
    density,
    current_density: density,
    level,
    density_level: level,
    count: Number(data.count ?? data.current_count ?? 0),
    isOpen: Boolean(data.is_open ?? true),
    is_open: Boolean(data.is_open ?? true),
    updatedAt: timestamp,
    updated_at: timestamp,
    latCenter: lat,
    lat_center: lat,
    lngCenter: lng,
    lng_center: lng,
    polygon: Array.isArray(data.polygon)
      ? (data.polygon as Array<{ lat: number; lng: number }>)
      : venueZone?.polygon ?? null,
    center_point: { latitude: lat, longitude: lng },
  };
}

export function useCrowdDensity(venueId: string | null): {
  zones: ZoneDensity[];
  isLoading: boolean;
  error: string | null;
} {
  const isMounted = useRef(true);
  const venueZonesRef = useRef<Record<string, { id: string; name: string; zone_type?: string; lat_center?: number; lng_center?: number; polygon?: Array<{ lat: number; lng: number }> | null }>>({});
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const isDemoMode = isDemoSearch(window.location.search);
  const {
    zoneDensities,
    isLoading,
    error,
    setZoneDensities,
    setLoading,
    setError,
    clearDensities,
    setLastUpdated,
  } =
    useCrowdStore();
  const setCurrentVenue = useVenueStore((state) => state.setCurrentVenue);
  const setZones = useVenueStore((state) => state.setZones);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!venueId) {
      clearDensities();
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      const auth = getAuth();
      const isAnonymousSession = auth.currentUser?.isAnonymous ?? isAnonymous;
      const useBundledDemoData =
        isAnonymousSession || isDemoMode || venueId === DEMO_VENUE.id;

      if (useBundledDemoData) {
        const currentVenue = useVenueStore.getState().currentVenue;
        const demoVenue = getDemoVenue(
          currentVenue?.id === venueId ? currentVenue : { id: venueId }
        );
        setCurrentVenue(demoVenue);
        setZones(demoVenue.zones);
        setZoneDensities(getDemoCrowdZones(demoVenue.id));
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const venue = await getVenueById(venueId);
        if (!isMounted.current) {
          return;
        }

        setCurrentVenue(venue);
        setZones(venue.zones);
        venueZonesRef.current = mapVenueZones(
          venue.zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            zone_type: zone.zone_type ?? zone.zoneType,
            lat_center: zone.lat_center ?? zone.latCenter,
            lng_center: zone.lng_center ?? zone.lngCenter,
            polygon: zone.polygon,
          }))
        );
      } catch (metadataError) {
        console.warn('[useCrowdDensity] Failed to load venue metadata', metadataError);
        venueZonesRef.current = {};
      }

      unsubscribe = onSnapshot(
        collection(db, 'crowd_density', venueId, 'zones'),
        (snapshot) => {
          if (!isMounted.current) {
            return;
          }

          const mappedZones = snapshot.docs.map((docSnapshot) =>
            mapFirestoreZone(
              venueId,
              docSnapshot.id,
              docSnapshot.data(),
              venueZonesRef.current[docSnapshot.id]
            )
          );

          setZoneDensities(mappedZones);
        },
        (snapshotError: FirestoreError) => {
          if (!isMounted.current) {
            return;
          }

          console.warn('[useCrowdDensity] Firestore error:', snapshotError);
          setError(snapshotError.message);
          setLoading(false);
        }
      );
    };

    void subscribe();

    return () => {
      unsubscribe?.();
    };
  }, [
    venueId,
    clearDensities,
    isAnonymous,
    isDemoMode,
    setError,
    setCurrentVenue,
    setLastUpdated,
    setLoading,
    setZoneDensities,
    setZones,
  ]);

  return {
    zones: Object.values(zoneDensities),
    isLoading,
    error,
  };
}

import { MapPin, Navigation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { DensityBadge } from '@/components/crowd/DensityBadge';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { VenueMap } from '@/components/maps/VenueMap';
import { BackButton, Button, Card, Skeleton } from '@/components/ui';
import { useCrowdDensity } from '@/hooks/useCrowdDensity';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getVenueById, listVenues, pickPreferredVenue } from '@/lib/api/venues';
import { DEFAULT_VENUE_CENTER } from '@/lib/maps/constants';
import { buildDemoPath, isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';
import type { Venue } from '@/types';

interface MapLocationState {
  targetZone?: {
    name: string;
    lat: number | null;
    lng: number | null;
  };
}

function distanceMinutes(
  currentLocation: { latitude: number; longitude: number } | null,
  zone: { lat_center?: number; latCenter?: number; lng_center?: number; lngCenter?: number }
): number | null {
  if (!currentLocation) {
    return null;
  }

  const lat = zone.lat_center ?? zone.latCenter;
  const lng = zone.lng_center ?? zone.lngCenter;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const distance = Math.hypot(currentLocation.latitude - lat, currentLocation.longitude - lng);
  return Math.max(1, Math.round(distance * 1200));
}

function hasUsableVenue(venue: Venue | null): boolean {
  if (!venue) {
    return false;
  }

  const lat = venue.lat_center ?? venue.latCenter ?? 0;
  const lng = venue.lng_center ?? venue.lngCenter ?? 0;
  return venue.capacity > 0 || Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001;
}

export default function MapPage(): JSX.Element {
  const location = useLocation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const setCurrentVenue = useVenueStore((state) => state.setCurrentVenue);
  const { zones, isLoading } = useCrowdDensity(currentVenue?.id ?? null);
  const { location: currentLocation } = useGeolocation();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [leastCrowdedPath, setLeastCrowdedPath] = useState(false);
  const [venueLoading, setVenueLoading] = useState(!currentVenue);
  const navigationState = location.state as MapLocationState | null;
  const targetZone = navigationState?.targetZone;
  const demoMode = isAnonymous || isDemoSearch(location.search);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [selectedZoneId, zones]
  );

  useEffect(() => {
    let active = true;

    const bootstrapVenue = async (): Promise<void> => {
      if (hasUsableVenue(currentVenue) && (currentVenue?.zones.length ?? 0) > 0) {
        setVenueLoading(false);
        return;
      }

      setVenueLoading(true);
      try {
        const params = new URLSearchParams(location.search);
        const venueParam = params.get('venue');
        const venues = await listVenues(demoMode);
        const preferredVenue = pickPreferredVenue(venues, venueParam);
        if (!active || !preferredVenue) {
          return;
        }

        const detailedVenue =
          preferredVenue.zones.length > 0
            ? preferredVenue
            : await getVenueById(preferredVenue.id, { public: demoMode });

        if (active) {
          setCurrentVenue(detailedVenue);
        }
      } catch (error) {
        console.warn('[MapPage] Venue bootstrap failed', error);
      } finally {
        if (active) {
          setVenueLoading(false);
        }
      }
    };

    void bootstrapVenue();

    return () => {
      active = false;
    };
  }, [currentVenue, demoMode, location.search, setCurrentVenue]);

  const center = useMemo(() => {
    if (typeof targetZone?.lat === 'number' && typeof targetZone?.lng === 'number') {
      return { lat: targetZone.lat, lng: targetZone.lng };
    }

    return {
      lat: currentVenue?.lat_center ?? currentVenue?.latCenter ?? DEFAULT_VENUE_CENTER.lat,
      lng: currentVenue?.lng_center ?? currentVenue?.lngCenter ?? DEFAULT_VENUE_CENTER.lng,
    };
  }, [currentVenue, targetZone]);

  useEffect(() => {
    setFocusPoint(center);
  }, [center]);

  useEffect(() => {
    const lat = selectedZone?.lat_center ?? selectedZone?.latCenter;
    const lng = selectedZone?.lng_center ?? selectedZone?.lngCenter;

    if (typeof lat === 'number' && typeof lng === 'number') {
      setFocusPoint({ lat, lng });
    }
  }, [selectedZone]);

  if (venueLoading) {
    return (
      <AttendeeLayout title="Map">
        <div className="page-content-shell">
          <div className="page-stack animate-page-enter">
            <BackButton />
            <div className="map-shell relative">
              <Skeleton className="h-full w-full rounded-none" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)]">
                Loading venue map...
              </span>
            </div>
          </div>
        </div>
      </AttendeeLayout>
    );
  }

  if (!currentVenue) {
    return (
      <AttendeeLayout title="Map">
        <div className="page-content-shell">
          <div className="page-stack animate-page-enter">
            <BackButton />
            <Card className="p-5">
              <p className="text-heading">Map unavailable</p>
              <p className="mt-1 text-meta">
                Venue coordinates could not be loaded for this session.
              </p>
              <Link
                to={buildDemoPath('/queues', location.search, isAnonymous)}
                className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent-light)]"
              >
                View Queue Times
              </Link>
            </Card>
          </div>
        </div>
      </AttendeeLayout>
    );
  }

  return (
    <AttendeeLayout title="Map">
      <div className="page-content-shell">
        <div className="page-stack animate-page-enter">
          <BackButton />

          <div className="map-shell relative min-h-[560px]">
            <VenueMap
              venue={currentVenue}
              showHeatmap
              onZoneClick={setSelectedZoneId}
              center={center}
              focusPoint={focusPoint}
              className="h-[560px]"
            />

            {targetZone ? (
              <div className="absolute left-1/2 top-[70px] z-10 flex -translate-x-1/2 items-center gap-2 rounded-[12px] border border-[var(--color-border-active)] bg-[var(--color-bg-secondary)] px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <Navigation size={14} style={{ color: 'var(--color-accent-light)' }} />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  Navigating to: {targetZone.name}
                </span>
              </div>
            ) : null}

            <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col gap-3">
              <button
                type="button"
                className={`pointer-events-auto filter-pill ${leastCrowdedPath ? 'is-active' : ''}`}
                onClick={() => setLeastCrowdedPath((current) => !current)}
              >
                Least Crowded Path
              </button>
              <button
                type="button"
                className="pointer-events-auto filter-pill"
                onClick={() => {
                  if (currentLocation) {
                    setFocusPoint({
                      lat: currentLocation.latitude,
                      lng: currentLocation.longitude,
                    });
                  }
                }}
              >
                <Navigation size={14} />
                Center on Me
              </button>
            </div>
          </div>

          {!currentVenue?.lat_center && !currentVenue?.latCenter ? (
            <Card className="p-5">
              <p className="text-heading">Map unavailable</p>
              <p className="mt-1 text-meta">
                View queue times instead while venue coordinates finish loading.
              </p>
              <Link
                to={buildDemoPath('/queues', location.search, isAnonymous)}
                className="mt-3 inline-flex text-sm font-semibold text-[var(--color-accent-light)]"
              >
                View Queue Times
              </Link>
            </Card>
          ) : null}

          {selectedZone ? (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-title">{selectedZone.name}</p>
                  <p className="mt-1 text-meta">Walk time: {distanceMinutes(currentLocation, selectedZone) ?? '-'} min</p>
                </div>
                <DensityBadge level={selectedZone.level} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  leftIcon={<MapPin size={14} />}
                  onClick={() => {
                    const lat = selectedZone.lat_center ?? selectedZone.latCenter;
                    const lng = selectedZone.lng_center ?? selectedZone.lngCenter;
                    if (typeof lat === 'number' && typeof lng === 'number') {
                      setFocusPoint({ lat, lng });
                    }
                  }}
                >
                  Focus Zone
                </Button>
                <Button variant="ghost" onClick={() => setSelectedZoneId(null)}>
                  Close
                </Button>
              </div>
            </Card>
          ) : null}

          {isLoading ? (
            <Card className="p-5">
              <p className="text-meta">Loading venue density overlays...</p>
            </Card>
          ) : null}
        </div>
      </div>
    </AttendeeLayout>
  );
}

import { GoogleMap, GroundOverlay } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CrowdHeatmapLayer } from '@/components/maps/CrowdHeatmapLayer';
import { EvacuationRouteLayer } from '@/components/maps/EvacuationRouteLayer';
import { NavigationOverlay } from '@/components/maps/NavigationOverlay';
import { useVenueMap } from '@/hooks/useVenueMap';
import { DEFAULT_MAP_ZOOM, DEFAULT_VENUE_CENTER } from '@/lib/maps/constants';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useCrowdStore } from '@/store/crowdStore';
import type { RouteResponse, Venue } from '@/types/venue';

export interface VenueMapProps {
  venue: Venue;
  showHeatmap?: boolean;
  navigationRoute?: google.maps.LatLngLiteral[] | RouteResponse | null;
  evacuationRoute?: google.maps.LatLngLiteral[] | null;
  onZoneClick?: (zoneId: string) => void;
  onLoad?: () => void;
  mode?: 'attendee' | 'admin';
  className?: string;
  center?: google.maps.LatLngLiteral;
  focusPoint?: google.maps.LatLngLiteral | null;
}

function toPath(route: google.maps.LatLngLiteral[] | RouteResponse | null | undefined): google.maps.LatLngLiteral[] | null {
  if (!route) {
    return null;
  }
  if (Array.isArray(route)) {
    return route;
  }

  return route.steps.map((step) => ({
    lat: Number(step.start_lat),
    lng: Number(step.start_lng),
  }));
}

export function VenueMap({
  venue,
  showHeatmap = true,
  navigationRoute,
  evacuationRoute,
  onZoneClick,
  onLoad,
  className = '',
  center,
  focusPoint = null,
}: VenueMapProps): JSX.Element {
  const { isLoaded, loadError, mapRef, onMapLoad } = useVenueMap();
  const location = useLocation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const zoneDensities = useCrowdStore((state) => state.zoneDensities);
  const crowdZones = useMemo(() => Object.values(zoneDensities), [zoneDensities]);

  const fallbackCenter = useMemo(
    () => ({
      lat: venue.lat_center ?? venue.latCenter ?? DEFAULT_VENUE_CENTER.lat,
      lng: venue.lng_center ?? venue.lngCenter ?? DEFAULT_VENUE_CENTER.lng,
    }),
    [venue]
  );
  const mapCenter = center ?? fallbackCenter;

  const navigationPath = useMemo(() => toPath(navigationRoute), [navigationRoute]);

  useEffect(() => {
    if (!focusPoint || !mapRef.current) {
      return;
    }

    mapRef.current.panTo(focusPoint);
    mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
  }, [focusPoint, mapRef]);

  if (loadError) {
    return (
      <div className={`flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center ${className}`} role="alert">
        <MapPin size={48} style={{ color: 'var(--color-text-muted)' }} />
        <h3 className="text-title">Map unavailable</h3>
        <p className="text-body text-[var(--color-text-secondary)]">
          Google Maps failed to load. Check your API key restrictions or try refreshing.
        </p>
        <Link
          to={buildDemoPath('/queues', location.search, isAnonymous)}
          className="text-sm font-semibold text-[var(--color-accent-light)]"
        >
          View wait times instead →
        </Link>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex h-full min-h-[320px] items-center justify-center ${className}`}>
        <div className="space-y-3 text-center">
          <p className="text-heading">Loading venue map...</p>
          <p className="text-meta">Preparing live routing and density layers.</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName={className}
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={mapCenter}
      zoom={DEFAULT_MAP_ZOOM}
      onLoad={(map) => {
        onMapLoad(map);
        map.setCenter(mapCenter);
        map.setZoom(DEFAULT_MAP_ZOOM);
        onLoad?.();
      }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        mapTypeId: 'roadmap',
      }}
    >
      {(venue.floor_plan_url ?? venue.floorPlanUrl) && (venue.floor_plan_bounds ?? venue.floorPlanBounds) ? (
        <GroundOverlay
          url={(venue.floor_plan_url ?? venue.floorPlanUrl) as string}
          bounds={(venue.floor_plan_bounds ?? venue.floorPlanBounds) as google.maps.LatLngBoundsLiteral}
          opacity={0.62}
        />
      ) : null}

      {showHeatmap ? (
        <CrowdHeatmapLayer zones={crowdZones} onZoneClick={onZoneClick} />
      ) : null}
      {navigationPath ? <NavigationOverlay route={navigationPath} /> : null}
      {evacuationRoute ? <EvacuationRouteLayer route={evacuationRoute} /> : null}
    </GoogleMap>
  );
}

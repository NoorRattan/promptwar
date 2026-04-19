import { useCallback, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

import {
  DARK_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
  GOOGLE_MAPS_LIBRARIES,
} from '@/lib/maps/constants';

export function useVenueMap(): {
  isLoaded: boolean;
  loadError: Error | undefined;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  onMapLoad: (map: google.maps.Map) => void;
  fitBoundsToZones: (zones: Array<{ lat_center: number; lng_center: number }>) => void;
  panToLocation: (lat: number, lng: number, zoom?: number) => void;
} {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''),
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((map: google.maps.Map): void => {
    mapRef.current = map;
    map.setOptions({
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: DARK_MAP_STYLE,
      minZoom: 14,
    });
  }, []);

  const fitBoundsToZones = useCallback(
    (zones: Array<{ lat_center: number; lng_center: number }>): void => {
      if (!mapRef.current || !window.google || zones.length === 0) {
        return;
      }

      const validZones = zones.filter(
        (zone) => Number.isFinite(zone.lat_center) && Number.isFinite(zone.lng_center)
      );
      if (validZones.length === 0) {
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      validZones.forEach((zone) =>
        bounds.extend({ lat: zone.lat_center, lng: zone.lng_center })
      );
      mapRef.current.fitBounds(bounds, 64);

      const currentZoom = mapRef.current.getZoom();
      if (typeof currentZoom === 'number' && currentZoom > DEFAULT_MAP_ZOOM) {
        mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
      }
    },
    []
  );

  const panToLocation = useCallback((lat: number, lng: number, zoom = DEFAULT_MAP_ZOOM): void => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(zoom);
  }, []);

  return {
    isLoaded,
    loadError,
    mapRef,
    onMapLoad,
    fitBoundsToZones,
    panToLocation,
  };
}

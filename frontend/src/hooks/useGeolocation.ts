/**
 * Continuously tracks the user's GPS position using watchPosition.
 * Degrades gracefully if permission is denied — app falls back to
 * zone-based navigation. Cleans up watchPosition on unmount.
 * @param enabled - Set false to disable tracking (e.g., on non-map pages)
 */
import { useEffect, useState, useRef } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  isLoading: boolean;
  isPermissionDenied: boolean;
  error: string | null;
  location: { latitude: number; longitude: number } | null;
}

type GeolocationOptions =
  | boolean
  | {
      enabled?: boolean;
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    };

export function useGeolocation(options: GeolocationOptions = true): GeolocationState {
  const resolvedOptions =
    typeof options === 'boolean'
      ? { enabled: options, enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      : {
          enabled: options.enabled ?? true,
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 5000,
        };
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    isLoading: resolvedOptions.enabled,
    isPermissionDenied: false,
    error: null,
    location: null,
  });

  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!resolvedOptions.enabled) {
       setState(s => ({ ...s, isLoading: false }));
       return;
    }

    if (!('geolocation' in navigator)) {
      setState({
        lat: null,
        lng: null,
        accuracy: null,
        isLoading: false,
        isPermissionDenied: false,
        error: "GPS is not supported in this browser.",
        location: null,
      });
      return;
    }
    
    setState(s => ({ ...s, isLoading: true, error: null, isPermissionDenied: false }));

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isLoading: false,
          isPermissionDenied: false,
          error: null,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      },
      (error) => {
        let errorMsg = "Location unavailable.";
        let permissionDenied = false;

        // 1 = PERMISSION_DENIED, 3 = TIMEOUT
        if (error.code === 1) {
          permissionDenied = true;
          errorMsg = "Location access denied.";
        } else if (error.code === 3) {
          errorMsg = "Location request timed out.";
        }

        setState(s => ({
          ...s,
          isLoading: false,
          isPermissionDenied: permissionDenied,
          error: errorMsg,
        }));
      },
      {
        enableHighAccuracy: resolvedOptions.enableHighAccuracy,
        timeout: resolvedOptions.timeout,
        maximumAge: resolvedOptions.maximumAge,
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [
    resolvedOptions.enabled,
    resolvedOptions.enableHighAccuracy,
    resolvedOptions.maximumAge,
    resolvedOptions.timeout,
  ]);

  return state;
}

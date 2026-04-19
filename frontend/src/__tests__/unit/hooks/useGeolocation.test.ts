import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '@/hooks/useGeolocation';

describe('useGeolocation', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with isLoading: true', () => {
    (global.navigator.geolocation.watchPosition as vi.Mock).mockReturnValue(1);
    const { result } = renderHook(() => useGeolocation(true));
    expect(result.current.isLoading).toBe(true);
  });

  it('updates lat/lng on successful position', () => {
    let successCallback: any;
    (global.navigator.geolocation.watchPosition as vi.Mock).mockImplementation((success) => {
      successCallback = success;
      return 1;
    });

    const { result } = renderHook(() => useGeolocation(true));
    
    act(() => {
      if (successCallback) {
        successCallback({ coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 10 } });
      }
    });

    expect(result.current.lat).toBeTypeOf('number');
    expect(result.current.lat).toBe(51.5074);
    expect(result.current.lng).toBe(-0.1278);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets isPermissionDenied on PERMISSION_DENIED error', () => {
    let errorCallback: any;
    (global.navigator.geolocation.watchPosition as vi.Mock).mockImplementation((success, err) => {
      errorCallback = err;
      return 1;
    });

    const { result } = renderHook(() => useGeolocation(true));
    
    act(() => {
      if (errorCallback) {
        errorCallback({ code: 1 });
      }
    });

    expect(result.current.isPermissionDenied).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Location access denied.");
  });

  it('does not call watchPosition when enabled=false', () => {
    const { result } = renderHook(() => useGeolocation(false));
    expect(global.navigator.geolocation.watchPosition).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('calls clearWatch on unmount', () => {
    const watchId = 42;
    (global.navigator.geolocation.watchPosition as vi.Mock).mockReturnValue(watchId);
    
    const { unmount } = renderHook(() => useGeolocation(true));
    unmount();
    
    expect(global.navigator.geolocation.clearWatch).toHaveBeenCalledWith(watchId);
  });
});

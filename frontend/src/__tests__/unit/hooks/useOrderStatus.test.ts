import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderStatus } from '@/hooks/useOrderStatus';
import { onSnapshot } from 'firebase/firestore';

vi.mock('@/lib/firebase/config', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe('useOrderStatus', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns isLoading: true initially', () => {
    (onSnapshot as vi.Mock).mockReturnValue(vi.fn());
    const { result } = renderHook(() => useOrderStatus('order-123'));
    expect(result.current.isLoading).toBe(true);
  });

  it('returns null orderStatus when orderId is null', () => {
    const { result } = renderHook(() => useOrderStatus(null));
    expect(result.current.orderStatus).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('populates orderStatus on snapshot with data', () => {
    let snapshotCallback: any;
    (onSnapshot as vi.Mock).mockImplementation((ref, success) => {
      snapshotCallback = success;
      return vi.fn();
    });

    const { result } = renderHook(() => useOrderStatus('order-123'));
    
    act(() => {
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => true,
          data: () => ({ status: 'ready' })
        });
      }
    });

    expect(result.current.orderStatus).not.toBeNull();
    expect(result.current.orderStatus?.status).toBe('ready');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error when snapshot document does not exist', () => {
    let snapshotCallback: any;
    (onSnapshot as vi.Mock).mockImplementation((ref, success) => {
      snapshotCallback = success;
      return vi.fn();
    });

    const { result } = renderHook(() => useOrderStatus('order-123'));
    
    act(() => {
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => false
        });
      }
    });

    expect(result.current.error).toBe('Order not found.');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls unsubscribe on unmount', () => {
    const unsubscribeMock = vi.fn();
    (onSnapshot as vi.Mock).mockReturnValue(unsubscribeMock);
    
    const { unmount } = renderHook(() => useOrderStatus('order-123'));
    unmount();
    
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      }),
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce is set', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      }),
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when OS preference changes', () => {
    vi.useFakeTimers();
    let changeHandler: ((e: { matches: boolean }) => void) | null = null;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn((_: string, handler: (e: { matches: boolean }) => void) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn()
      }),
    });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    
    act(() => { changeHandler?.({ matches: true }); });
    expect(result.current).toBe(true);
    
    vi.useRealTimers();
  });
});

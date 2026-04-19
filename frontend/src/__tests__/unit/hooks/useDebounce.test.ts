import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update immediately when value changes', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );
    rerender({ value: 'world' });
    expect(result.current).toBe('hello');
    vi.useRealTimers();
  });

  it('updates after the delay has elapsed', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );
    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('world');
    vi.useRealTimers();
  });

  it('resets the timer on rapid value changes', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );
    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ value: 'abc' });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('abc');
    vi.useRealTimers();
  });

  it('works with non-string types (number)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(42);
    vi.useRealTimers();
  });
});

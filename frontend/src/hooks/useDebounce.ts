/**
 * Returns a debounced version of the value that only updates after
 * the specified delay has passed with no new value changes.
 * Use for search inputs, filter controls, and any rapid-fire input.
 * @param value - The value to debounce
 * @param delayMs - Delay in milliseconds (recommended: 300ms for search)
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

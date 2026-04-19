/**
 * Returns true if the user has requested reduced motion in their OS settings.
 * Use to disable animations and auto-playing audio in components.
 * Updates reactively if the user changes their OS preference mid-session.
 *
 * WCAG 2.1 SC 2.3.3: Animation from Interactions (AAA)
 * WCAG 2.1 SC 1.4.12: Text Spacing — motion does not impede reading
 * @example
 * const reducedMotion = useReducedMotion();
 * // In EmergencyBanner: only auto-speak if !reducedMotion
 * // In animations: skip transition if reducedMotion
 */
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const getMatchMedia = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia.bind(window)
      : typeof matchMedia === 'function'
        ? matchMedia
        : null;

  const [matches, setMatches] = useState<boolean>(() => {
    const matchMedia = getMatchMedia();
    if (matchMedia) {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    const matchMedia = getMatchMedia();
    if (!matchMedia) {
      return;
    }

    const mediaQuery = matchMedia('(prefers-reduced-motion: reduce)');

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (mediaQuery.addEventListener) {
       mediaQuery.addEventListener('change', listener);
    } else {
       mediaQuery.addListener(listener); // fallback for older browsers
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener); // fallback
      }
    };
  }, []);

  return matches;
}

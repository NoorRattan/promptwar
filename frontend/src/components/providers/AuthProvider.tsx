import { useEffect, type ReactNode } from 'react';

import { getDemoVenue } from '@/data/demoData';
import { useAuth } from '@/hooks/useAuth';
import { getBootstrapVenue } from '@/lib/api/venues';
import { isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  useAuth();

  const { user, isAnonymous, isLoading: authLoading } = useAuthStore();
  const { clearVenue, setCurrentVenue, setLoading, setVenue, setZones } = useVenueStore();

  useEffect(() => {
    let active = true;

    const bootstrapVenue = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        clearVenue();
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const venueParam = params.get('venue');
      const demoMode = isAnonymous || isDemoSearch(window.location.search);
      const demoVenue = getDemoVenue();

      setLoading(true);
      setVenue(demoVenue);
      setCurrentVenue(demoVenue);
      setZones(demoVenue.zones);

      try {
        const bootstrappedVenue = await getBootstrapVenue({
          demo: true,
          venueParam,
        });
        if (!active) {
          return;
        }

        const hydratedVenue = demoMode ? getDemoVenue(bootstrappedVenue) : bootstrappedVenue;
        setVenue(hydratedVenue);
        setCurrentVenue(hydratedVenue);
        setZones(hydratedVenue.zones ?? []);
      } catch (error) {
        console.warn('[CrowdIQ] Venue bootstrap failed', error);
        if (active) {
          setVenue(demoVenue);
          setCurrentVenue(demoVenue);
          setZones(demoVenue.zones);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrapVenue();

    return () => {
      active = false;
    };
  }, [
    authLoading,
    clearVenue,
    isAnonymous,
    setCurrentVenue,
    setLoading,
    setVenue,
    setZones,
    user,
  ]);

  return <>{children}</>;
}

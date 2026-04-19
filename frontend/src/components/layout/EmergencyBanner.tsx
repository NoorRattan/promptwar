import { AlertTriangle, Phone } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { useGeolocation } from '@/hooks/useGeolocation';
import * as emergencyApi from '@/lib/api/emergency';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useEmergencyStore } from '@/store/emergencyStore';
import { useVenueStore } from '@/store/venueStore';

export function EmergencyBanner(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const emergencyState = useEmergencyStore((state) => state.emergencyState);
  const { location: geoLocation } = useGeolocation({
    enableHighAccuracy: false,
    maximumAge: 60000,
    timeout: 5000,
  });

  if (!emergencyState?.is_active) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="active-emergency-title"
      aria-describedby="active-emergency-description"
      className="emergency-active animate-fade-in fixed inset-0 z-[250] flex flex-col bg-[#1A0000]/96 px-5 py-6 text-white"
      style={{ boxShadow: 'inset 0 0 0 2px rgba(220, 38, 38, 0.28)' }}
    >
      <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(220,38,38,0.18)] text-[#fca5a5]">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-label text-[#fecaca]">Emergency Broadcast</p>
            <h2 id="active-emergency-title" className="text-display text-white">
              {emergencyState.type}
            </h2>
          </div>
        </div>

        <div className="surface-card rounded-[20px] border-[rgba(252,165,165,0.18)] bg-[rgba(38,8,8,0.72)] p-5">
          <p id="active-emergency-description" className="text-title text-white">
            {emergencyState.message || 'Follow venue staff instructions and move to the nearest safe exit.'}
          </p>
          {emergencyState.nearest_exit ? (
            <p className="mt-3 text-body text-[#fecaca]">
              Nearest exit: {emergencyState.nearest_exit}
            </p>
          ) : null}
        </div>

        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <Button
            className="w-full"
            onClick={() =>
              navigate(buildDemoPath('/emergency', location.search, isAnonymous))
            }
          >
            Show Evacuation Route
          </Button>
          <Button
            className="w-full"
            variant="danger"
            leftIcon={<Phone size={16} />}
            onClick={() => {
              void emergencyApi.sendSOS({
                venue_id: currentVenue?.id ?? '',
                latitude: geoLocation?.latitude ?? null,
                longitude: geoLocation?.longitude ?? null,
              });
            }}
          >
            I Need Help
          </Button>
        </div>
      </div>
    </div>
  );
}

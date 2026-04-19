import {
  AlertTriangle,
  Flame,
  Map as MapIcon,
  Phone,
  Shield,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BackButton, Button, Card, Modal, useToast } from '@/components/ui';
import { useEmergency } from '@/hooks/useEmergency';
import { useGeolocation } from '@/hooks/useGeolocation';
import { confirmSafe, sendSOS } from '@/lib/api/emergency';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

function emergencyIcon(type: string): JSX.Element {
  if (type === 'FIRE') return <Flame size={28} />;
  return <AlertTriangle size={28} />;
}

export default function EmergencyPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const { location: geoLocation } = useGeolocation();
  const { emergencyState } = useEmergency(currentVenue?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exitZones = useMemo(() => {
    const venueZones = currentVenue?.zones ?? [];
    return venueZones.filter((zone) => {
      const zoneType = zone.zone_type ?? zone.zoneType;
      return zoneType === 'exit' || zoneType === 'entry';
    });
  }, [currentVenue?.zones]);

  if (emergencyState?.is_active) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        className="emergency-active fixed inset-0 z-[260] flex min-h-screen flex-col bg-[#1A0000] px-5 py-6 text-white"
        style={{ boxShadow: 'inset 0 0 0 2px rgba(220, 38, 38, 0.28)' }}
      >
        <div className="mx-auto flex w-full max-w-[840px] flex-1 flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(220,38,38,0.18)] text-[#fca5a5]">
              {emergencyIcon(emergencyState.type)}
            </div>
            <div>
              <p className="text-label text-[#fecaca]">Active Emergency</p>
              <h1 className="text-display">{emergencyState.type}</h1>
            </div>
          </div>

          <Card className="border-[rgba(252,165,165,0.18)] bg-[rgba(38,8,8,0.72)] p-5">
            <p className="text-title">{emergencyState.message}</p>
            {emergencyState.nearest_exit ? (
              <p className="mt-3 text-body text-[#fecaca]">
                Nearest exit: {emergencyState.nearest_exit}
              </p>
            ) : null}
          </Card>

          <div className="mt-auto grid gap-3 sm:grid-cols-2">
            <Button
              className="w-full"
              leftIcon={<MapIcon size={16} />}
              onClick={() =>
                navigate(buildDemoPath('/map', location.search, isAnonymous))
              }
            >
              Show Evacuation Route
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                void confirmSafe({
                  venue_id: currentVenue?.id ?? '',
                  latitude: geoLocation?.latitude,
                  longitude: geoLocation?.longitude,
                }).then(() => {
                  showToast('success', 'Safety confirmation sent.');
                });
              }}
            >
              I Am Safe
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen pb-[calc(var(--nav-height)+32px)]">
      <div className="page-content-shell pt-8">
        <div className="page-stack animate-page-enter">
          <BackButton to={buildDemoPath('/', location.search, isAnonymous)} />

          <div className="page-copy">
            <h1 className="text-display">CrowdIQ Safety</h1>
            <p className="text-meta">Review exits and use SOS only for immediate medical or safety issues.</p>
          </div>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[rgba(22,163,74,0.14)] text-[#4ade80]">
                <Shield size={22} />
              </div>
              <div>
                <h2 className="text-title">Know Your Exits</h2>
                <p className="text-meta">Review the closest exit paths before the crowd shifts.</p>
              </div>
            </div>

            <div className="space-y-3">
              {exitZones.length === 0 ? (
                <div className="empty-state">
                  <Shield size={24} />
                  <p className="text-heading">Exit information unavailable</p>
                  <p className="text-meta">We could not load the current exit list for this venue.</p>
                </div>
              ) : (
                exitZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="rounded-[16px] border border-[rgba(74,222,128,0.18)] bg-[rgba(22,163,74,0.08)] px-4 py-3"
                    style={{ boxShadow: 'inset 3px 0 0 #16a34a' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-heading">{zone.name}</p>
                        <p className="text-meta">
                          {(zone.zone_type ?? zone.zoneType) === 'entry' ? 'Main access route' : 'Exit route'}
                        </p>
                      </div>
                      <span className="badge badge-open">EXIT OPEN</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-[rgba(252,165,165,0.18)] bg-[linear-gradient(180deg,rgba(38,8,8,0.72)_0%,rgba(13,21,38,0.96)_100%)] p-5">
            <div className="page-copy">
              <h2 className="text-title text-[#fecaca]">Send emergency SOS to venue security</h2>
              <p className="text-body text-[#fecaca]">
                Use this only for an immediate medical or safety issue.
              </p>
            </div>
            <Button
              variant="danger"
              className="mt-5 w-full"
              leftIcon={<Phone size={16} />}
              onClick={() => setConfirmOpen(true)}
            >
              Send SOS Now
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send SOS to venue security?"
        description="Your current location will be attached when available."
      >
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              void sendSOS({
                venue_id: currentVenue?.id ?? '',
                latitude: geoLocation?.latitude ?? null,
                longitude: geoLocation?.longitude ?? null,
              }).then(() => {
                showToast('success', 'SOS sent to venue security.');
                setConfirmOpen(false);
              });
            }}
          >
            Confirm SOS
          </Button>
        </div>
      </Modal>
    </div>
  );
}

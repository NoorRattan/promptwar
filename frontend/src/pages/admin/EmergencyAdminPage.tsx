import { useEffect, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button, Card, Modal, useToast } from '@/components/ui';
import {
  activateEmergency,
  deactivateEmergency,
  getEmergencyStatus,
} from '@/lib/api/emergency';
import { useVenueStore } from '@/store/venueStore';
import type { EmergencyType } from '@/types/emergency';

const EMERGENCY_TYPES: EmergencyType[] = ['FIRE', 'MEDICAL', 'SECURITY', 'WEATHER', 'GENERAL'];

export default function EmergencyAdminPage(): JSX.Element {
  const { showToast } = useToast();
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getEmergencyStatus>> | null>(null);
  const [type, setType] = useState<EmergencyType>('GENERAL');
  const [message, setMessage] = useState('Follow staff instructions and proceed to the nearest safe exit.');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refreshStatus = async (): Promise<void> => {
    if (!currentVenue?.id) {
      return;
    }

    try {
      const result = await getEmergencyStatus(currentVenue.id);
      setStatus(result);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, [currentVenue?.id]);

  return (
    <AdminLayout title="Emergency">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="page-copy mb-4">
            <h2 className="text-title">Emergency Controls</h2>
            <p className="text-meta">Broadcast a venue-wide alert or clear the current emergency state.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="emergency-type" className="text-label">
                Emergency Type
              </label>
              <select
                id="emergency-type"
                className="select-field mt-2"
                value={type}
                onChange={(event) => setType(event.target.value as EmergencyType)}
              >
                {EMERGENCY_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="emergency-message" className="text-label">
                Message
              </label>
              <textarea
                id="emergency-message"
                className="textarea-field mt-2 min-h-[120px]"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            <Button variant="danger" className="w-full" onClick={() => setConfirmOpen(true)}>
              Activate Emergency
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="page-copy mb-4">
            <h2 className="text-title">Active Status</h2>
            <p className="text-meta">Monitor current emergency state, SOS reports, and acknowledgements.</p>
          </div>

          <div className="space-y-3">
            <p className="text-body">Active: {status?.is_active ? 'Yes' : 'No'}</p>
            <p className="text-body">Type: {status?.type ?? 'None'}</p>
            <p className="text-body">SOS reports: {status?.message ? 'Live' : '0'}</p>
            <Button
              variant="ghost"
              onClick={() => {
                if (!currentVenue?.id) {
                  return;
                }

                void deactivateEmergency(currentVenue.id).then(() => {
                  showToast('success', 'Emergency deactivated.');
                  refreshStatus();
                });
              }}
            >
              Deactivate - All Clear
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Activate emergency broadcast?"
        description="This will publish an immediate venue-wide alert."
      >
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (!currentVenue?.id) {
                return;
              }

              void activateEmergency({
                venueId: currentVenue.id,
                emergencyType: type,
                message,
                affectedZones: [],
                confirmed: true,
              }).then(() => {
                showToast('success', 'Emergency activated.');
                setConfirmOpen(false);
                refreshStatus();
              });
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}

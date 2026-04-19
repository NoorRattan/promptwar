import { useEffect, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui';
import { getEmergencyStatus } from '@/lib/api/emergency';
import { useVenueStore } from '@/store/venueStore';

export default function IncidentsPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [incident, setIncident] = useState<Awaited<ReturnType<typeof getEmergencyStatus>> | null>(null);

  useEffect(() => {
    const loadIncident = async (): Promise<void> => {
      if (!currentVenue?.id) {
        return;
      }

      try {
        const result = await getEmergencyStatus(currentVenue.id);
        setIncident(result);
      } catch {
        setIncident(null);
      }
    };

    void loadIncident();
  }, [currentVenue?.id]);

  return (
    <AdminLayout title="Incidents">
      <Card className="overflow-hidden p-0">
        <div className="table-shell">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Status</th>
                <th>Type</th>
                <th>Message</th>
                <th>Activated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{incident?.is_active ? 'Active' : 'Clear'}</td>
                <td>{incident?.type ?? 'None'}</td>
                <td>{incident?.message ?? 'No active incident.'}</td>
                <td>{incident?.activated_at ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}

import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { VenueMap } from '@/components/maps/VenueMap';
import { Button, Card } from '@/components/ui';
import { useCrowdDensity } from '@/hooks/useCrowdDensity';
import { getCongestionPredictions } from '@/lib/api/crowd';
import { useVenueStore } from '@/store/venueStore';
import type { CongestionPrediction } from '@/types/crowd';

export default function HeatmapPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const { zones } = useCrowdDensity(currentVenue?.id ?? null);
  const [predictions, setPredictions] = useState<CongestionPrediction[]>([]);

  const loadPredictions = async (): Promise<void> => {
    if (!currentVenue?.id) {
      return;
    }

    try {
      const result = await getCongestionPredictions(currentVenue.id);
      setPredictions(result);
    } catch {
      setPredictions([]);
    }
  };

  useEffect(() => {
    void loadPredictions();
  }, [currentVenue?.id]);

  return (
    <AdminLayout
      title="Heatmap"
      actions={
        <Button variant="ghost" leftIcon={<RefreshCw size={14} />} onClick={() => void loadPredictions()}>
          Refresh
        </Button>
      }
    >
      {currentVenue ? (
        <div className="map-shell mb-5 min-h-[520px]">
          <VenueMap venue={currentVenue} showHeatmap className="h-[520px]" />
        </div>
      ) : null}

      <Card className="mb-5 overflow-hidden p-0">
        <div className="table-shell">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Count</th>
                <th>Density %</th>
                <th>Level</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td>{zone.name}</td>
                  <td>{zone.count}</td>
                  <td>{Math.round(zone.density * 100)}%</td>
                  <td>{zone.level}</td>
                  <td>
                    {predictions.find((prediction) => prediction.zoneId === zone.id)?.predictedLevel15min ??
                      'Stable'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="page-copy mb-4">
          <h2 className="text-title">ML Predictions</h2>
          <p className="text-meta">Fifteen and thirty minute density forecasts.</p>
        </div>
        <div className="space-y-3">
          {predictions.length === 0 ? (
            <p className="text-meta">Predictions are currently unavailable.</p>
          ) : (
            predictions.map((prediction) => (
              <div
                key={prediction.zoneId}
                className="rounded-[16px] border border-[var(--color-border)] bg-[rgba(17,30,53,0.46)] p-4"
              >
                <p className="text-heading">{prediction.zoneName}</p>
                <p className="text-meta">
                  15 min: {prediction.predictedLevel15min} · 30 min: {prediction.predictedLevel30min}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </AdminLayout>
  );
}

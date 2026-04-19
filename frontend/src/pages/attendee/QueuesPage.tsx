import { List, Navigation } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DEMO_VENUE, getDemoQueues } from '@/data/demoData';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { QueueCard } from '@/components/queue/QueueCard';
import { Button, Skeleton } from '@/components/ui';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useQueueState } from '@/hooks/useQueueState';
import { isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';
import type { QueueState } from '@/types/queue';

type SortMode = 'wait' | 'distance' | 'type';

function waitMinutes(queue: QueueState): number {
  return queue.wait_minutes ?? queue.estimated_wait_minutes ?? queue.estimatedWaitMinutes ?? 0;
}

function distanceScore(
  queue: QueueState,
  zones: ReturnType<typeof useVenueStore.getState>['zones'],
  currentLocation: { latitude: number; longitude: number } | null
): number {
  if (!currentLocation || !queue.zone_id) {
    return Number.POSITIVE_INFINITY;
  }

  const zone = zones.find((item) => item.id === queue.zone_id);
  if (!zone) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.hypot(
    currentLocation.latitude - (zone.lat_center ?? zone.latCenter),
    currentLocation.longitude - (zone.lng_center ?? zone.lngCenter)
  );
}

export default function QueuesPage(): JSX.Element {
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const zones = useVenueStore((state) => state.zones);
  const isDemoMode = isAnonymous || isDemoSearch(window.location.search);
  const useBundledDemoData = isDemoMode || currentVenue?.id === DEMO_VENUE.id;
  const displayVenue = currentVenue ?? (isDemoMode ? DEMO_VENUE : null);
  const displayZones = zones.length > 0 ? zones : displayVenue?.zones ?? [];
  const { location: currentLocation } = useGeolocation();
  const venueId = displayVenue?.id ?? null;
  const { queues, isLoading } = useQueueState(venueId);
  const [sortMode, setSortMode] = useState<SortMode>('wait');
  const [openOnly, setOpenOnly] = useState(true);
  const queueItems =
    queues.length > 0 ? queues : useBundledDemoData && venueId ? getDemoQueues(venueId) : [];

  const visibleQueues = useMemo(() => {
    const filtered = openOnly
      ? queueItems.filter((queue) => queue.is_open ?? queue.isOpen)
      : queueItems;

    return [...filtered].sort((left, right) => {
      if (sortMode === 'distance') {
        return (
          distanceScore(left, displayZones, currentLocation) -
          distanceScore(right, displayZones, currentLocation)
        );
      }

      if (sortMode === 'type') {
        return String(left.queue_type ?? '').localeCompare(String(right.queue_type ?? ''));
      }

      return waitMinutes(left) - waitMinutes(right);
    });
  }, [currentLocation, displayZones, openOnly, queueItems, sortMode]);

  return (
    <AttendeeLayout title="Wait Times">
      <div className="page-content-shell">
        <div className="page-stack animate-page-enter">
          <div className="page-copy">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-display">Wait Times</h1>
              <span className="badge badge-live">{visibleQueues.length} live</span>
            </div>
            <p className="text-meta">Sort and filter queues across the venue in real time.</p>
          </div>

          <div className="surface-card rounded-[16px] p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {(['wait', 'distance', 'type'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`filter-pill ${sortMode === mode ? 'is-active' : ''}`}
                  onClick={() => setSortMode(mode)}
                >
                  {mode === 'wait' ? 'By Wait' : mode === 'distance' ? 'By Distance' : 'By Type'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`filter-pill ${openOnly ? 'is-active' : ''}`}
              onClick={() => setOpenOnly((current) => !current)}
            >
              Open Only
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} variant="card" />
              ))}
            </div>
          ) : visibleQueues.length === 0 ? (
            <div className="empty-state">
              <List size={28} />
              <p className="text-heading">No queues available right now</p>
              <p className="text-meta">Try changing the filters or check back in a few minutes.</p>
            </div>
          ) : (
            <div className="stagger-children space-y-3">
              {visibleQueues.map((queue) => {
                const matchingZone = displayZones.find((zone) => zone.id === queue.zone_id);
                const zoneName = matchingZone?.name ?? 'Venue zone';

                return (
                  <QueueCard
                    key={queue.id}
                    queue={queue}
                    zoneName={zoneName}
                    targetZone={{
                      name: zoneName,
                      lat:
                        matchingZone?.lat_center ??
                        matchingZone?.latCenter ??
                        displayVenue?.lat_center ??
                        displayVenue?.latCenter ??
                        null,
                      lng:
                        matchingZone?.lng_center ??
                        matchingZone?.lngCenter ??
                        displayVenue?.lng_center ??
                        displayVenue?.lngCenter ??
                        null,
                    }}
                  />
                );
              })}
            </div>
          )}

          {currentLocation ? (
            <Button
              variant="ghost"
              leftIcon={<Navigation size={16} />}
              onClick={() => setSortMode('distance')}
            >
              Prioritize nearest queues
            </Button>
          ) : null}
        </div>
      </div>
    </AttendeeLayout>
  );
}

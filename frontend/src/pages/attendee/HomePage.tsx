import {
  Armchair,
  CheckCircle2,
  ChevronRight,
  List,
  Map,
  ShoppingCart,
  WifiOff,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { DEMO_VENUE, getDemoCrowdZones, getDemoQueues } from '@/data/demoData';
import { DensityBadge } from '@/components/crowd/DensityBadge';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { WaitTimeBadge } from '@/components/queue/WaitTimeBadge';
import { Card, ProgressBar, Skeleton } from '@/components/ui';
import { useCrowdDensity } from '@/hooks/useCrowdDensity';
import { useQueueState } from '@/hooks/useQueueState';
import { buildDemoPath, isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

const ACTIONS = [
  {
    to: '/map',
    label: 'Venue Map',
    description: 'Crowd density and routing',
    icon: Map,
  },
  {
    to: '/queues',
    label: 'Wait Times',
    description: 'Live wait times by zone',
    icon: List,
  },
  {
    to: '/order',
    label: 'Order Food',
    description: 'Skip the queue',
    icon: ShoppingCart,
  },
  {
    to: '/seats',
    label: 'My Seat',
    description: 'Upgrades and guidance',
    icon: Armchair,
  },
] as const;

function zoneProgressVariant(level: string): 'success' | 'warning' | 'danger' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH' || level === 'MEDIUM') return 'warning';
  return 'success';
}

export default function HomePage(): JSX.Element {
  const location = useLocation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const isDemoMode = isAnonymous || isDemoSearch(location.search);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const useBundledDemoData = isDemoMode || currentVenue?.id === DEMO_VENUE.id;
  const displayVenue = currentVenue ?? (isDemoMode ? DEMO_VENUE : null);
  const venueId = displayVenue?.id ?? null;
  const { zones: crowdZones, isLoading: crowdLoading } = useCrowdDensity(venueId);
  const { queues, isLoading: queuesLoading } = useQueueState(venueId);
  const displayCrowdZones =
    crowdZones.length > 0
      ? crowdZones
      : useBundledDemoData && venueId
        ? getDemoCrowdZones(venueId)
        : [];
  const displayQueues =
    queues.length > 0
      ? queues
      : useBundledDemoData && venueId
        ? getDemoQueues(venueId)
        : [];

  const hotspotZones = useMemo(
    () => [...displayCrowdZones].sort((a, b) => b.density - a.density).slice(0, 4),
    [displayCrowdZones]
  );
  const shortestQueues = useMemo(
    () =>
      [...displayQueues]
        .filter((queue) => queue.is_open ?? queue.isOpen)
        .sort(
          (a, b) =>
            (a.wait_minutes ?? a.estimated_wait_minutes ?? a.estimatedWaitMinutes ?? 0) -
            (b.wait_minutes ?? b.estimated_wait_minutes ?? b.estimatedWaitMinutes ?? 0)
        )
        .slice(0, 3),
    [displayQueues]
  );

  const allClear = hotspotZones.length > 0 && hotspotZones.every((zone) => zone.level === 'LOW');

  return (
    <AttendeeLayout>
      <div className="page-content-shell">
        <div className="page-stack animate-page-enter">
          <Card className="overflow-hidden p-0">
            <div
              className="relative p-7"
              style={{
                background: 'linear-gradient(135deg, #0D1A35 0%, #0F2044 40%, #0A1A38 100%)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-60px',
                  right: '-60px',
                  width: '200px',
                  height: '200px',
                  background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
              <div className="page-copy">
                <p className="text-label text-[#bfdbfe]">Venue Connected</p>
                <h1 className="text-display">{displayVenue?.name ?? 'MetroArena Stadium'}</h1>
                <div className="flex items-center gap-2 text-meta text-[#dbeafe]">
                  <span className="live-dot" />
                  <span>Live event data active</span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="stat-chip">
                  <span className="text-label">Venue</span>
                  <span className="text-heading">Connected</span>
                </div>
                <div className="stat-chip">
                  <span className="text-label">Zones</span>
                  <span className="text-heading">{displayVenue?.zones.length ?? 0}</span>
                </div>
                <div className="stat-chip">
                  <span className="text-label">Queues</span>
                  <span className="text-heading">{shortestQueues.length}</span>
                </div>
              </div>
            </div>
          </Card>

          <section className="animate-page-enter">
            <div className="mb-3 page-copy">
              <h2 className="text-title">Quick Actions</h2>
              <p className="text-meta">Jump straight to the most useful live tools.</p>
            </div>
            <div className="stagger-children grid grid-cols-2 gap-3">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={buildDemoPath(action.to, location.search, isAnonymous)}
                    className="surface-card interactive flex min-h-[124px] flex-col gap-3 rounded-[16px] p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(37,99,235,0.14)] text-[var(--color-accent-light)]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-heading">{action.label}</p>
                      <p className="mt-1 text-meta">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <Card className="animate-page-enter p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="page-copy">
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <h2 className="text-title">Live Crowd Hotspots</h2>
                </div>
                <p className="text-meta">Updated from crowd_density live snapshots.</p>
              </div>
              <Link
                to={buildDemoPath('/map', location.search, isAnonymous)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent-light)]"
              >
                View Full Map <ChevronRight size={14} />
              </Link>
            </div>

            {crowdLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} variant="card" />
                ))}
              </div>
            ) : hotspotZones.length === 0 ? (
              <div className="empty-state">
                <WifiOff size={28} />
                <p className="text-heading">Crowd data unavailable</p>
                <p className="text-meta">We could not load live crowd density for this venue.</p>
              </div>
            ) : (
              <div className="stagger-children space-y-3">
                {allClear ? (
                  <div className="rounded-[16px] border border-[rgba(74,222,128,0.18)] bg-[rgba(22,163,74,0.12)] px-4 py-3 text-[#bbf7d0]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span className="font-medium">All areas are clear</span>
                    </div>
                  </div>
                ) : null}
                {hotspotZones.map((zone) => (
                  <div key={zone.id} className="rounded-[16px] border border-[var(--color-border)] bg-[rgba(17,30,53,0.46)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-heading">{zone.name}</p>
                        <p className="text-meta">{zone.count} attendees</p>
                      </div>
                      <DensityBadge level={zone.level} />
                    </div>
                    <ProgressBar
                      value={Math.round(zone.density * 100)}
                      variant={zoneProgressVariant(zone.level)}
                      size="md"
                      label={`${zone.name} density`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="animate-page-enter p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="page-copy">
                <h2 className="text-title">Shortest Queues</h2>
                <p className="text-meta">{shortestQueues.length} live queues</p>
              </div>
              <Link
                to={buildDemoPath('/queues', location.search, isAnonymous)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent-light)]"
              >
                See all queues <ChevronRight size={14} />
              </Link>
            </div>

            {queuesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} variant="card" />
                ))}
              </div>
            ) : shortestQueues.length === 0 ? (
              <div className="empty-state">
                <WifiOff size={28} />
                <p className="text-heading">Queue data unavailable</p>
                <p className="text-meta">Live queue telemetry is not available right now.</p>
              </div>
            ) : (
              <div className="stagger-children space-y-3">
                {shortestQueues.map((queue) => {
                  const wait =
                    queue.wait_minutes ??
                    queue.estimated_wait_minutes ??
                    queue.estimatedWaitMinutes ??
                    0;
                  const zoneName =
                    displayVenue?.zones.find((zone) => zone.id === queue.zone_id)?.name ??
                    'Venue zone';

                  return (
                    <div
                      key={queue.id}
                      className="rounded-[16px] border border-[var(--color-border)] bg-[rgba(17,30,53,0.46)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-heading">{queue.name}</p>
                          <p className="text-meta">{zoneName}</p>
                        </div>
                        <WaitTimeBadge minutes={wait} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AttendeeLayout>
  );
}

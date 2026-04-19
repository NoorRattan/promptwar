import { ArrowRight, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { WaitTimeBadge } from '@/components/queue/WaitTimeBadge';
import { Badge, Button, Card, Modal, ProgressBar, useToast } from '@/components/ui';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import type { QueueState } from '@/types/queue';

interface QueueAlertPreference {
  threshold: number;
  queueName: string;
}

type QueueAlertMap = Record<string, QueueAlertPreference>;

export interface QueueNavigationTarget {
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface QueueCardProps {
  queue: QueueState;
  zoneName?: string;
  targetZone?: QueueNavigationTarget | null;
  onNavigate?: () => void;
}

function readQueueAlerts(): QueueAlertMap {
  try {
    const rawAlerts = window.localStorage.getItem('crowdiq_alerts');
    if (!rawAlerts) {
      return {};
    }

    const parsedAlerts = JSON.parse(rawAlerts) as unknown;
    if (typeof parsedAlerts !== 'object' || parsedAlerts === null) {
      return {};
    }

    return parsedAlerts as QueueAlertMap;
  } catch {
    return {};
  }
}

function writeQueueAlerts(alerts: QueueAlertMap): void {
  window.localStorage.setItem('crowdiq_alerts', JSON.stringify(alerts));
}

function waitVariant(minutes: number): 'success' | 'warning' | 'danger' {
  if (minutes <= 5) {
    return 'success';
  }
  if (minutes <= 15) {
    return 'warning';
  }
  return 'danger';
}

function progressValue(minutes: number): number {
  if (minutes <= 5) return 20;
  if (minutes <= 15) return 45;
  if (minutes <= 30) return 72;
  return 100;
}

export function QueueCard({
  queue,
  zoneName,
  targetZone = null,
  onNavigate,
}: QueueCardProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const minutes =
    queue.wait_minutes ?? queue.estimated_wait_minutes ?? queue.estimatedWaitMinutes ?? 0;
  const isOpen = queue.is_open ?? queue.isOpen;
  const [alertSet, setAlertSet] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(5);
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    const existingAlert = readQueueAlerts()[queue.id];
    setAlertSet(Boolean(existingAlert));
    if (existingAlert) {
      setAlertThreshold(existingAlert.threshold);
    }
  }, [queue.id, minutes]);

  const handleNavigate = (): void => {
    navigate(buildDemoPath('/map', location.search, isAnonymous), {
      state: targetZone ? { targetZone } : undefined,
    });
    onNavigate?.();
  };

  const handleSaveAlert = (): void => {
    const alerts = readQueueAlerts();
    alerts[queue.id] = {
      threshold: alertThreshold,
      queueName: queue.name,
    };
    writeQueueAlerts(alerts);
    setAlertSet(true);
    setShowAlertModal(false);
    showToast(
      'success',
      `Alert set: notify when ${queue.name} drops below ${alertThreshold} min.`
    );

    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
  };

  return (
    <>
      <Card className="card-hover animate-page-enter p-4" interactive>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-heading">{queue.name}</h3>
            <p className="mt-1 text-meta">{zoneName ?? 'Venue zone'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? 'open' : 'closed'} label={isOpen ? 'Open' : 'Closed'} />
            <WaitTimeBadge minutes={minutes} />
          </div>
        </div>

        <div className="mb-3">
          <ProgressBar
            value={progressValue(minutes)}
            variant={waitVariant(minutes)}
            size="md"
            label={`${queue.name} wait time`}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-meta">
            Current length: {queue.current_length ?? queue.currentLength ?? 0}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAlertModal(true)}
              className="btn-press inline-flex items-center gap-1 rounded-[10px] border px-3 py-2 text-[13px] font-medium transition-colors"
              style={{
                background: alertSet ? 'rgba(37,99,235,0.15)' : 'transparent',
                borderColor: alertSet ? 'var(--color-accent)' : 'var(--color-border)',
                color: alertSet ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              }}
              aria-label={alertSet ? 'Alert set for this queue' : 'Set wait time alert for this queue'}
            >
              <Bell size={13} />
              {alertSet ? 'Alert On' : 'Alert'}
            </button>

            {(targetZone ?? onNavigate) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigate}
                aria-label={`Navigate to ${queue.name}`}
                rightIcon={<ArrowRight size={14} />}
              >
                Navigate
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={`Queue alert for ${queue.name}`}
        description="Get notified when the estimated wait drops below your chosen threshold."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor={`alert-threshold-${queue.id}`} className="text-label">
              Notify me below
            </label>
            <input
              id={`alert-threshold-${queue.id}`}
              type="number"
              min={1}
              max={60}
              value={alertThreshold}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setAlertThreshold(Number.isFinite(nextValue) ? nextValue : 5);
              }}
              className="form-input mt-2"
            />
          </div>

          <div className="flex gap-2">
            {[5, 10, 15].map((value) => (
              <button
                key={value}
                type="button"
                className={`filter-pill ${alertThreshold === value ? 'is-active' : ''}`}
                onClick={() => setAlertThreshold(value)}
              >
                {value} min
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAlertModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveAlert}>
              Save Alert
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

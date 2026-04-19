import { useMemo, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button, Card } from '@/components/ui';
import { useQueueState } from '@/hooks/useQueueState';
import apiClient from '@/lib/api/client';
import { useVenueStore } from '@/store/venueStore';
import type { QueueState } from '@/types/queue';

export default function QueuesAdminPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const { queues } = useQueueState(currentVenue?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, { wait: number; annotation: string }>>({});

  const queueRows = useMemo(
    () =>
      queues.map((queue) => ({
        queue,
        draft: drafts[queue.id] ?? {
          wait: queue.estimated_wait_minutes ?? queue.estimatedWaitMinutes ?? 0,
          annotation: queue.annotation ?? '',
        },
      })),
    [drafts, queues]
  );

  const updateQueue = async (queue: QueueState): Promise<void> => {
    const draft = drafts[queue.id];
    if (!draft) {
      return;
    }

    await apiClient.patch(`/queues/${queue.id}`, {
      estimated_wait_minutes: draft.wait,
      annotation: draft.annotation,
    });
  };

  return (
    <AdminLayout title="Queues">
      <Card className="overflow-hidden p-0">
        <div className="table-shell">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Wait</th>
                <th>Length</th>
                <th>Annotation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map(({ queue, draft }) => (
                <tr key={queue.id}>
                  <td>{queue.name}</td>
                  <td>{queue.queue_type ?? queue.queueType}</td>
                  <td>
                    <button
                      type="button"
                      className={`filter-pill ${(queue.is_open ?? queue.isOpen) ? 'is-active' : ''}`}
                      onClick={() => {
                        void apiClient.patch(`/queues/${queue.id}`, {
                          is_open: !(queue.is_open ?? queue.isOpen),
                        });
                      }}
                    >
                      {(queue.is_open ?? queue.isOpen) ? 'Open' : 'Closed'}
                    </button>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input-field min-w-[90px]"
                      value={draft.wait}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [queue.id]: {
                            ...draft,
                            wait: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </td>
                  <td>{queue.current_length ?? queue.currentLength ?? 0}</td>
                  <td>
                    <input
                      className="input-field"
                      value={draft.annotation}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [queue.id]: {
                            ...draft,
                            annotation: event.target.value,
                          },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => void updateQueue(queue)}>
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}

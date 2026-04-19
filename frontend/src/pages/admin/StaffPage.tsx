import { useEffect, useMemo, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui';
import { getTasks, type StaffTask } from '@/lib/api/staff';
import { useVenueStore } from '@/store/venueStore';

export default function StaffPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTasks = async (): Promise<void> => {
      if (!currentVenue?.id) {
        return;
      }

      try {
        const result = await getTasks(currentVenue.id);
        setTasks(result);
        setError(null);
      } catch {
        setTasks([]);
        setError('Task endpoint returned no accessible data for this role.');
      }
    };

    void loadTasks();
  }, [currentVenue?.id]);

  const visibleTasks = useMemo(
    () =>
      statusFilter === 'all'
        ? tasks
        : tasks.filter((task) => task.status === statusFilter),
    [statusFilter, tasks]
  );

  return (
    <AdminLayout title="Staff">
      <Card className="mb-5 p-5">
        <label htmlFor="staff-status" className="text-label">
          Status Filter
        </label>
        <select
          id="staff-status"
          className="select-field mt-2 max-w-[240px]"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="table-shell">
          <table className="table-grid">
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.description}</td>
                  <td>{task.priority}</td>
                  <td>{task.status}</td>
                  <td>{task.due_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="p-4 text-meta">{error}</p> : null}
      </Card>
    </AdminLayout>
  );
}

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGeolocation } from '@/hooks/useGeolocation';
import { useQueueState } from '@/hooks/useQueueState';
import QueuesPage from '@/pages/attendee/QueuesPage';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

vi.mock('@/hooks/useQueueState', () => ({
  useQueueState: vi.fn(),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('@/components/layout/AttendeeLayout', () => ({
  AttendeeLayout: ({ children }: { children: any }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/queue/QueueCard', () => ({
  QueueCard: ({ queue }: { queue: { name: string } }) => (
    <div data-testid="queue-card">{queue.name}</div>
  ),
}));

const mockQueues = [
  { id: 'q1', name: 'Pizza', queue_type: 'food', wait_minutes: 10, is_open: true, zone_id: 'z1' },
  { id: 'q2', name: 'Burger', queue_type: 'food', wait_minutes: 5, is_open: true, zone_id: 'z1' },
  { id: 'q3', name: 'Hotdog', queue_type: 'food', wait_minutes: 2, is_open: false, zone_id: 'z1' },
  { id: 'q4', name: 'Restroom 1', queue_type: 'restroom', wait_minutes: 3, is_open: true, zone_id: 'z2' },
  { id: 'q5', name: 'Restroom 2', queue_type: 'restroom', wait_minutes: 15, is_open: true, zone_id: 'z2' },
  { id: 'q6', name: 'Entry A', queue_type: 'entry', wait_minutes: 20, is_open: true, zone_id: 'z3' },
  { id: 'q7', name: 'Entry B', queue_type: 'entry', wait_minutes: 0, is_open: false, zone_id: 'z3' },
  { id: 'q8', name: 'Merch Main', queue_type: 'merch', wait_minutes: 12, is_open: true, zone_id: 'z4' },
];

describe('QueuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: { id: 'u1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useVenueStore.setState({
      currentVenue: { id: 'v1', name: 'Arena' } as never,
      zones: [
        { id: 'z1', name: 'Food Court' },
        { id: 'z2', name: 'Restrooms' },
        { id: 'z3', name: 'Entry' },
      ] as never,
      isLoading: false,
    });

    vi.mocked(useQueueState).mockReturnValue({
      queues: mockQueues as never,
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useGeolocation).mockReturnValue({
      location: { latitude: 0, longitude: 0 },
    } as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <QueuesPage />
      </MemoryRouter>
    );

  it('shows only open queues by default, sorted by wait time', () => {
    renderComponent();

    const names = screen.getAllByTestId('queue-card').map((card) => card.textContent);
    expect(names).toEqual([
      'Restroom 1',
      'Burger',
      'Pizza',
      'Merch Main',
      'Restroom 2',
      'Entry A',
    ]);
  });

  it('reveals closed queues when open-only is toggled off', async () => {
    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: 'Open Only' }));

    const names = screen.getAllByTestId('queue-card').map((card) => card.textContent);
    expect(names).toContain('Hotdog');
    expect(names).toContain('Entry B');
  });

  it('renders the empty state when no queues are available', () => {
    vi.mocked(useQueueState).mockReturnValue({
      queues: [],
      isLoading: false,
      error: null,
    } as never);

    renderComponent();

    expect(screen.getByText('No queues available right now')).toBeInTheDocument();
  });

  it('shows the nearest-queue shortcut when geolocation exists', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Prioritize nearest queues' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCrowdDensity } from '@/hooks/useCrowdDensity';
import { useQueueState } from '@/hooks/useQueueState';
import HomePage from '@/pages/attendee/HomePage';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

vi.mock('@/hooks/useCrowdDensity', () => ({
  useCrowdDensity: vi.fn(),
}));

vi.mock('@/hooks/useQueueState', () => ({
  useQueueState: vi.fn(),
}));

vi.mock('@/components/layout/AttendeeLayout', () => ({
  AttendeeLayout: ({ children }: { children: any }) => <div data-testid="layout">{children}</div>,
}));

const mockVenue = {
  id: 'v1',
  name: 'Test Arena',
  zones: [
    { id: 'z1', name: 'North Stand' },
    { id: 'z2', name: 'South Stand' },
  ],
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: { id: 'u1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useVenueStore.setState({
      currentVenue: mockVenue as never,
      zones: mockVenue.zones as never,
      isLoading: false,
    });

    vi.mocked(useCrowdDensity).mockReturnValue({
      zones: [],
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useQueueState).mockReturnValue({
      queues: [],
      isLoading: false,
      error: null,
    } as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

  it('renders the hero and quick actions', () => {
    renderComponent();

    expect(screen.getByText('Test Arena')).toBeInTheDocument();
    expect(screen.getByText('Live event data active')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Venue Map')).toBeInTheDocument();
    expect(screen.getByText('Wait Times')).toBeInTheDocument();
    expect(screen.getByText('Order Food')).toBeInTheDocument();
    expect(screen.getByText('My Seat')).toBeInTheDocument();
  });

  it('shows the clear-state message when all hotspot zones are low', () => {
    vi.mocked(useCrowdDensity).mockReturnValue({
      zones: [
        {
          id: 'z1',
          name: 'North Stand',
          density: 0.18,
          level: 'LOW',
          count: 120,
        },
      ],
      isLoading: false,
      error: null,
    } as never);

    renderComponent();

    expect(screen.getByText('All areas are clear')).toBeInTheDocument();
  });

  it('shows the top three shortest open queues', () => {
    vi.mocked(useQueueState).mockReturnValue({
      queues: [
        { id: 'q1', name: 'Queue 1', is_open: true, wait_minutes: 10, zone_id: 'z1' },
        { id: 'q2', name: 'Queue 2', is_open: true, wait_minutes: 2, zone_id: 'z2' },
        { id: 'q3', name: 'Queue 3', is_open: false, wait_minutes: 1, zone_id: 'z1' },
        { id: 'q4', name: 'Queue 4', is_open: true, wait_minutes: 5, zone_id: 'z2' },
        { id: 'q5', name: 'Queue 5', is_open: true, wait_minutes: 15, zone_id: 'z1' },
      ],
      isLoading: false,
      error: null,
    } as never);

    renderComponent();

    const queueCard = screen.getByText('Shortest Queues').closest('.surface-card');
    const card = within(queueCard as HTMLElement);

    expect(card.getByText('Queue 2')).toBeInTheDocument();
    expect(card.getByText('Queue 4')).toBeInTheDocument();
    expect(card.getByText('Queue 1')).toBeInTheDocument();
    expect(card.queryByText('Queue 3')).not.toBeInTheDocument();
    expect(card.queryByText('Queue 5')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  }, 15000);
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueueCard } from '@/components/queue/QueueCard';
import { useAuthStore } from '@/store/authStore';
import type { QueueState } from '@/types/queue';

expect.extend(toHaveNoViolations);

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '', pathname: '/queues' }),
  };
});

const mockQueue = {
  id: 'q-1',
  name: 'Gate A Food Court',
  zone_id: 'z-1',
  venue_id: 'v-1',
  queue_type: 'food',
  is_open: true,
  estimated_wait_minutes: 8,
  current_length: 15,
  throughput_per_minute: null,
  annotation: null,
  last_updated: new Date().toISOString(),
} as unknown as QueueState;

describe('QueueCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      firebaseUid: 'user-1',
      idToken: 'token',
      isAuthenticated: true,
      isAnonymous: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders queue details', () => {
    render(<QueueCard queue={mockQueue} zoneName="Food Court A" />);

    expect(screen.getByText('Gate A Food Court')).toBeInTheDocument();
    expect(screen.getByText('Food Court A')).toBeInTheDocument();
    expect(screen.getByText('8 min')).toBeInTheDocument();
  });

  it('navigates to the map with queue target state', async () => {
    const onNavigate = vi.fn();
    render(
      <QueueCard
        queue={mockQueue}
        targetZone={{ name: 'Food Court A', lat: 28.614, lng: 77.209 }}
        onNavigate={onNavigate}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /navigate to gate a food court/i })
    );

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/map', {
      state: {
        targetZone: { name: 'Food Court A', lat: 28.614, lng: 77.209 },
      },
    });
  });

  it('stores an in-app alert after confirmation', async () => {
    render(<QueueCard queue={mockQueue} zoneName="Food Court A" />);

    await userEvent.click(
      screen.getByRole('button', { name: /set wait time alert for this queue/i })
    );
    expect(
      screen.getByRole('heading', { name: /queue alert for gate a food court/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '10 min' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Alert' }));

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem('crowdiq_alerts') ?? '{}')
      ).toMatchObject({
        'q-1': { threshold: 10, queueName: 'Gate A Food Court' },
      });
    });

    expect(screen.getByRole('button', { name: /alert set for this queue/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <QueueCard
        queue={mockQueue}
        targetZone={{ name: 'Food Court A', lat: 28.614, lng: 77.209 }}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

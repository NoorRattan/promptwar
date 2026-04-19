import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSeatUpgrades } from '@/lib/api/seats';
import SeatsPage from '@/pages/attendee/SeatsPage';
import { useAuthStore } from '@/store/authStore';
import { useSeatStore } from '@/store/seatStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

vi.mock('@/components/layout/AttendeeLayout', () => ({
  AttendeeLayout: ({ children }: { children: any }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/lib/api/seats', () => ({
  getSeatUpgrades: vi.fn(),
  acceptUpgrade: vi.fn(),
  declineUpgrade: vi.fn(),
}));

const mockOffers = [
  {
    id: '1',
    fromSeat: 'K14',
    toSeat: 'A1',
    fromSection: 'Upper',
    toSection: 'Premium',
    priceDifference: 500,
    status: 'offered',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    secondsUntilExpiry: 600,
  },
  {
    id: '2',
    fromSeat: 'K14',
    toSeat: 'B2',
    fromSection: 'Upper',
    toSection: 'Premium',
    priceDifference: 300,
    status: 'offered',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    secondsUntilExpiry: 600,
  },
];

describe('SeatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: { id: 'u1', email: 'e@e.com', seat_number: 'K14', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useSeatStore.setState({ upgrades: [], upgradeOffers: [], isLoading: false });
    useVenueStore.setState({ currentVenue: { id: 'v1', name: 'Arena' } as never, isLoading: false });

    vi.mocked(getSeatUpgrades).mockResolvedValue(mockOffers as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <SeatsPage />
      </MemoryRouter>
    );

  it('renders the current seat and available offers', async () => {
    renderComponent();

    expect(screen.getByText('K14')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Accept Upgrade' })).toHaveLength(2);
    });
  });

  it('renders the empty state when no offers are returned', async () => {
    vi.mocked(getSeatUpgrades).mockResolvedValue([] as never);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No upgrade offers right now')).toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Accept Upgrade' })).toHaveLength(2);
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

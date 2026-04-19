import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCrowdDensity } from '@/hooks/useCrowdDensity';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getVenueById, listVenues, pickPreferredVenue } from '@/lib/api/venues';
import MapPage from '@/pages/attendee/MapPage';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

vi.mock('@/hooks/useCrowdDensity', () => ({
  useCrowdDensity: vi.fn(),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('@/lib/api/venues', () => ({
  listVenues: vi.fn(),
  getVenueById: vi.fn(),
  pickPreferredVenue: vi.fn(),
}));

vi.mock('@/components/layout/AttendeeLayout', () => ({
  AttendeeLayout: ({ children }: { children: any }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/maps/VenueMap', () => ({
  VenueMap: ({ onZoneClick }: { onZoneClick?: (zoneId: string) => void }) => (
    <div>
      <div data-testid="venue-map">Venue Map</div>
      <button type="button" onClick={() => onZoneClick?.('z1')}>
        Select Zone
      </button>
    </div>
  ),
}));

const venueWithCoords = {
  id: 'v1',
  name: 'Test Arena',
  capacity: 1000,
  lat_center: 28.6139,
  lng_center: 77.209,
  zones: [{ id: 'z1', name: 'North Stand' }],
};

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(useCrowdDensity).mockReturnValue({
      zones: [
        {
          id: 'z1',
          name: 'North Stand',
          level: 'MEDIUM',
          density: 0.42,
          count: 120,
          lat_center: 28.6141,
          lng_center: 77.2092,
        },
      ],
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useGeolocation).mockReturnValue({
      location: { latitude: 28.614, longitude: 77.2091 },
    } as never);
    vi.mocked(listVenues).mockResolvedValue([]);
    vi.mocked(getVenueById).mockResolvedValue(venueWithCoords as never);
    vi.mocked(pickPreferredVenue).mockReturnValue(null);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    );

  it('shows a loading state until the venue is ready', () => {
    useVenueStore.setState({ currentVenue: null, isLoading: true });

    renderComponent();

    expect(screen.getByText('Loading venue map...')).toBeInTheDocument();
  });

  it('renders the map and controls when a venue is available', () => {
    useVenueStore.setState({ currentVenue: venueWithCoords as never, isLoading: false });

    renderComponent();

    expect(screen.getByTestId('venue-map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Least Crowded Path' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Center on Me' })).toBeInTheDocument();
  });

  it('shows the selected zone detail card', async () => {
    useVenueStore.setState({ currentVenue: venueWithCoords as never, isLoading: false });

    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: 'Select Zone' }));

    expect(screen.getByText('North Stand')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Focus Zone' })).toBeInTheDocument();
  });

  it('shows the map unavailable card when venue coordinates are missing', async () => {
    useVenueStore.setState({
      currentVenue: {
        id: 'v2',
        name: 'Fallback Venue',
        capacity: 0,
        lat_center: 0,
        lng_center: 0,
        zones: [],
      } as never,
      isLoading: false,
    });
    vi.mocked(listVenues).mockResolvedValue([]);
    vi.mocked(pickPreferredVenue).mockReturnValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Map unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText('View Queue Times')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    useVenueStore.setState({ currentVenue: venueWithCoords as never, isLoading: false });
    const { container } = renderComponent();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

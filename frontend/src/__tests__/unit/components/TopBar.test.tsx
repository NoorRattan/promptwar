import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopBar } from '@/components/layout/TopBar';
import { logout as firebaseLogout } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

const mockNavigate = vi.fn();
const mockChangeLanguage = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

vi.mock('@/lib/firebase/auth', () => ({
  logout: vi.fn(),
}));

const mockVenue = {
  id: 'venue-1',
  name: 'MetroArena Stadium',
  zones: [],
};

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: {
        id: 'user-1',
        uid: 'user-1',
        email: 'demo@crowdiq.app',
        fullName: 'Demo User',
        full_name: 'Demo User',
        role: 'attendee',
        preferredLanguage: 'en',
        preferred_language: 'en',
        venueId: 'venue-1',
        venue_id: 'venue-1',
        seatNumber: null,
        seat_number: null,
        createdAt: new Date().toISOString(),
      },
      firebaseUid: 'user-1',
      idToken: 'token',
      isAuthenticated: true,
      isAnonymous: false,
      isLoading: false,
      error: null,
    });

    useVenueStore.setState({
      venue: mockVenue as never,
      currentVenue: mockVenue as never,
      activeVenue: mockVenue as never,
      currentVenueId: mockVenue.id,
      zones: [],
      isLoading: false,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <TopBar title="CrowdIQ" />
      </MemoryRouter>
    );

  it('renders venue and account chrome', () => {
    renderComponent();

    expect(screen.getByText('CrowdIQ')).toBeInTheDocument();
    expect(screen.getByText('MetroArena Stadium')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('DE');
  });

  it('opens the account menu and signs the user out', async () => {
    vi.mocked(firebaseLogout).mockResolvedValueOnce(undefined);
    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(await screen.findByText('demo@crowdiq.app')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(firebaseLogout).toHaveBeenCalledOnce();
      expect(useAuthStore.getState().user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    expect(results).toHaveNoViolations();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEmergency } from '@/hooks/useEmergency';
import * as emergencyApi from '@/lib/api/emergency';
import EmergencyPage from '@/pages/attendee/EmergencyPage';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

vi.mock('@/hooks/useEmergency', () => ({
  useEmergency: vi.fn(),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ location: { latitude: 28.614, longitude: 77.209 } }),
}));

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>('@/components/ui');
  return {
    ...actual,
    Modal: ({
      isOpen,
      title,
      children,
    }: {
      isOpen: boolean;
      title: string;
      children: any;
    }) => (isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null),
    useToast: () => ({ showToast: vi.fn(), dismissToast: vi.fn() }),
  };
});

vi.mock('@/lib/api/emergency', () => ({
  sendSOS: vi.fn(),
  confirmSafe: vi.fn(),
}));

const activeEmergency = {
  is_active: true,
  type: 'FIRE',
  message: 'Use the nearest exit immediately.',
  nearest_exit: 'Main Gate',
};

describe('EmergencyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: { id: 'u1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useVenueStore.setState({
      currentVenue: {
        id: 'v1',
        name: 'Arena',
        zones: [
          { id: 'exit-1', name: 'Main Gate', zone_type: 'exit' },
          { id: 'entry-1', name: 'East Concourse', zone_type: 'entry' },
        ],
      } as never,
      isLoading: false,
    });

    vi.mocked(useEmergency).mockReturnValue({ emergencyState: null } as never);
    vi.mocked(emergencyApi.sendSOS).mockResolvedValue({ success: true } as never);
    vi.mocked(emergencyApi.confirmSafe).mockResolvedValue({ success: true } as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <EmergencyPage />
      </MemoryRouter>
    );

  it('renders exit guidance and SOS controls when there is no emergency', () => {
    renderComponent();

    expect(screen.getByText('CrowdIQ Safety')).toBeInTheDocument();
    expect(screen.getByText('Know Your Exits')).toBeInTheDocument();
    expect(screen.getByText('Main Gate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send SOS Now' })).toBeInTheDocument();
  });

  it('opens the SOS confirmation and sends the request', async () => {
    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: 'Send SOS Now' }));
    expect(screen.getByRole('dialog', { name: 'Send SOS to venue security?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm SOS' }));
    await waitFor(() => {
      expect(emergencyApi.sendSOS).toHaveBeenCalledWith({
        venue_id: 'v1',
        latitude: 28.614,
        longitude: 77.209,
      });
    });
  });

  it('renders the active emergency overlay and confirms safety', async () => {
    vi.mocked(useEmergency).mockReturnValue({ emergencyState: activeEmergency } as never);

    renderComponent();

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('FIRE')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'I Am Safe' }));
    await waitFor(() => {
      expect(emergencyApi.confirmSafe).toHaveBeenCalledWith({
        venue_id: 'v1',
        latitude: 28.614,
        longitude: 77.209,
      });
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

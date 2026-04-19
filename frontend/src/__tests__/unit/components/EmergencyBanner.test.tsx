import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { EmergencyBanner } from '@/components/layout/EmergencyBanner';
import * as emergencyApi from '@/lib/api/emergency';
import { useAuthStore } from '@/store/authStore';
import { useEmergencyStore } from '@/store/emergencyStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ location: { latitude: 10, longitude: 20 } }),
}));

vi.mock('@/lib/api/emergency', () => ({
  sendSOS: vi.fn(),
}));

const activeEmergency = {
  is_active: true,
  type: 'FIRE',
  message: 'Evacuate now',
  nearest_exit: 'Gate A',
};

describe('EmergencyBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: { id: 'user-1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useVenueStore.setState({ currentVenue: { id: 'v1', name: 'MetroArena', zones: [] } as never });
    useEmergencyStore.setState({
      emergencyState: null,
      evacuationRoutes: {},
      isEmergencyActive: false,
      isSpeaking: false,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <EmergencyBanner />
      </MemoryRouter>
    );

  it('returns null when there is no active emergency', () => {
    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the active emergency overlay and routes to the emergency page', async () => {
    useEmergencyStore.setState({
      emergencyState: activeEmergency as never,
      isEmergencyActive: true,
    });

    renderComponent();

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('FIRE')).toBeInTheDocument();
    expect(screen.getByText('Evacuate now')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Evacuation Route' }));
    expect(mockNavigate).toHaveBeenCalledWith('/emergency');

    fireEvent.click(screen.getByRole('button', { name: 'I Need Help' }));
    await waitFor(() => {
      expect(emergencyApi.sendSOS).toHaveBeenCalledWith({
        venue_id: 'v1',
        latitude: 10,
        longitude: 20,
      });
    });
  });

  it('has no accessibility violations', async () => {
    useEmergencyStore.setState({
      emergencyState: activeEmergency as never,
      isEmergencyActive: true,
    });

    const { container } = renderComponent();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

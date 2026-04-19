import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import App from '@/App';
import { useAuthStore } from '@/store/authStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/providers/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/pages/auth/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));
vi.mock('@/pages/auth/RegisterPage', () => ({
  default: () => <div data-testid="register-page">Register Page</div>,
}));
vi.mock('@/pages/attendee/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));
vi.mock('@/pages/attendee/MapPage', () => ({ default: () => <div>Map Page</div> }));
vi.mock('@/pages/attendee/QueuesPage', () => ({ default: () => <div>Queues Page</div> }));
vi.mock('@/pages/attendee/OrderPage', () => ({ default: () => <div>Order Page</div> }));
vi.mock('@/pages/attendee/OrderStatusPage', () => ({
  default: () => <div>Order Status Page</div>,
}));
vi.mock('@/pages/attendee/SeatsPage', () => ({ default: () => <div>Seats Page</div> }));
vi.mock('@/pages/attendee/EmergencyPage', () => ({
  default: () => <div data-testid="emergency-page">Emergency Page</div>,
}));

vi.mock('@/pages/admin/DashboardPage', () => ({
  default: () => <div data-testid="admin-page">Admin Dashboard</div>,
}));
vi.mock('@/pages/admin/HeatmapPage', () => ({ default: () => <div>Admin Heatmap</div> }));
vi.mock('@/pages/admin/QueuesAdminPage', () => ({
  default: () => <div>Admin Queues</div>,
}));
vi.mock('@/pages/admin/OrdersAdminPage', () => ({
  default: () => <div>Admin Orders</div>,
}));
vi.mock('@/pages/admin/StaffPage', () => ({ default: () => <div>Admin Staff</div> }));
vi.mock('@/pages/admin/SeatsAdminPage', () => ({ default: () => <div>Admin Seats</div> }));
vi.mock('@/pages/admin/EmergencyAdminPage', () => ({
  default: () => <div>Admin Emergency</div>,
}));
vi.mock('@/pages/admin/AnalyticsPage', () => ({
  default: () => <div>Admin Analytics</div>,
}));
vi.mock('@/pages/admin/IncidentsPage', () => ({
  default: () => <div>Admin Incidents</div>,
}));

const renderAppWithPath = (initialPath: string) => {
  window.history.pushState({}, 'Test page', initialPath);
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
};

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unauthenticated user visiting "/" is redirected to "/login"', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null, isLoading: false } as never);
    renderAppWithPath('/');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('authenticated attendee visiting "/admin" is redirected to "/"', async () => {
    vi.mocked(useAuthStore).mockReturnValue(
      { user: { role: 'attendee' }, isLoading: false } as never,
    );
    renderAppWithPath('/admin');

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  it('authenticated admin visiting "/admin" renders admin content', async () => {
    vi.mocked(useAuthStore).mockReturnValue(
      { user: { role: 'admin' }, isLoading: false } as never,
    );
    renderAppWithPath('/admin');

    await waitFor(() => {
      expect(screen.getByTestId('admin-page')).toBeInTheDocument();
    });
  });

  it('"/emergency" is accessible without any auth', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null, isLoading: false } as never);
    renderAppWithPath('/emergency');

    await waitFor(() => {
      expect(screen.getByTestId('emergency-page')).toBeInTheDocument();
    });
  });

  it('unknown routes render the not found page', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null, isLoading: false } as never);
    renderAppWithPath('/unknown-route-123');

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });
});

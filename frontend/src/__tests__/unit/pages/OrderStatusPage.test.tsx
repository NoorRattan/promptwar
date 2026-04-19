import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrderStatus } from '@/hooks/useOrderStatus';
import { cancelOrder, getOrder } from '@/lib/api/orders';
import OrderStatusPage from '@/pages/attendee/OrderStatusPage';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ orderId: 'order-123' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useOrderStatus', () => ({
  useOrderStatus: vi.fn(),
}));

vi.mock('@/lib/api/orders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/orders')>('@/lib/api/orders');
  return {
    ...actual,
    getOrder: vi.fn(),
    cancelOrder: vi.fn(),
  };
});

vi.mock('@/components/layout/AttendeeLayout', () => ({
  AttendeeLayout: ({ children }: { children: any }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/order/OrderStatusTracker', () => ({
  OrderStatusTracker: ({ currentStatus }: { currentStatus: string }) => (
    <div data-testid="status-tracker">{currentStatus}</div>
  ),
}));

const mockOrder = {
  id: 'order-123',
  orderCode: 'A3K7',
  status: 'received',
  pickupZoneId: 'z1',
  pickupSlot: '2026-04-10T14:30:00Z',
};

describe('OrderStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: { id: 'u1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useVenueStore.setState({
      currentVenue: { id: 'v1', name: 'Arena', zones: [{ id: 'z1', name: 'North Kiosk' }] } as never,
      isLoading: false,
    });

    vi.mocked(useOrderStatus).mockReturnValue({
      orderStatus: { status: 'RECEIVED', order_code: 'A3K7', pickup_zone_name: 'North Kiosk' },
    } as never);
    vi.mocked(getOrder).mockResolvedValue(mockOrder as never);
    vi.mocked(cancelOrder).mockResolvedValue({ success: true, message: 'Cancelled' } as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <OrderStatusPage />
      </MemoryRouter>
    );

  it('renders the order code and allows cancellation for received orders', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('A3K7')).toBeInTheDocument();
    });
    expect(screen.getByTestId('status-tracker')).toHaveTextContent('received');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith('order-123');
      expect(mockNavigate).toHaveBeenCalledWith('/order');
    });
  });

  it('hides cancellation once the order is confirmed', async () => {
    vi.mocked(useOrderStatus).mockReturnValue({
      orderStatus: { status: 'CONFIRMED', order_code: 'A3K7', pickup_zone_name: 'North Kiosk' },
    } as never);
    vi.mocked(getOrder).mockResolvedValue({ ...mockOrder, status: 'confirmed' } as never);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('A3K7')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Cancel Order' })).not.toBeInTheDocument();
  });

  it('renders the not-found state when the order cannot be loaded', async () => {
    vi.mocked(getOrder).mockRejectedValue(new Error('missing'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Order not found')).toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('A3K7')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

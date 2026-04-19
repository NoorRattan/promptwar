import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMenu } from '@/lib/api/orders';
import OrderPage from '@/pages/attendee/OrderPage';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { useQueueStore } from '@/store/queueStore';
import { useVenueStore } from '@/store/venueStore';

expect.extend(toHaveNoViolations);

vi.mock('@/components/layout/AttendeeLayout', () => ({
  AttendeeLayout: ({ children }: { children: any }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/lib/api/orders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/orders')>('@/lib/api/orders');
  return {
    ...actual,
    getMenu: vi.fn(),
    createOrder: vi.fn(),
  };
});

const mockMenuItems = [
  {
    id: '1',
    venueId: 'v1',
    name: 'Veg Burger',
    description: 'Vegetarian main',
    price: 10,
    category: 'hot_food',
    dietaryTags: ['vegetarian'],
    imageUrl: null,
    prepTimeMinutes: 8,
    isAvailable: true,
    isSoldOut: false,
  },
  {
    id: '2',
    venueId: 'v1',
    name: 'Chicken Wrap',
    description: 'Main',
    price: 12,
    category: 'hot_food',
    dietaryTags: [],
    imageUrl: null,
    prepTimeMinutes: 10,
    isAvailable: true,
    isSoldOut: false,
  },
  {
    id: '3',
    venueId: 'v1',
    name: 'Masala Chips',
    description: 'Snack',
    price: 5,
    category: 'snacks',
    dietaryTags: ['vegan'],
    imageUrl: null,
    prepTimeMinutes: 4,
    isAvailable: true,
    isSoldOut: false,
  },
  {
    id: '4',
    venueId: 'v1',
    name: 'Cold Cola',
    description: 'Drink',
    price: 3,
    category: 'beverages',
    dietaryTags: [],
    imageUrl: null,
    prepTimeMinutes: 2,
    isAvailable: true,
    isSoldOut: false,
  },
  {
    id: '5',
    venueId: 'v1',
    name: 'CrowdIQ Cap',
    description: 'Merch',
    price: 15,
    category: 'merchandise',
    dietaryTags: [],
    imageUrl: null,
    prepTimeMinutes: 0,
    isAvailable: true,
    isSoldOut: false,
  },
];

describe('OrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: { id: 'u1', email: 'demo@crowdiq.app', role: 'attendee' } as never,
      isAnonymous: false,
    });
    useOrderStore.setState({
      cart: [],
      items: [],
      activeOrders: [],
      orderHistory: [],
      isPlacingOrder: false,
      error: null,
    });
    useQueueStore.setState({
      queues: [{ id: 'q1', name: 'Food Court', queue_type: 'food', is_open: true, zone_id: 'z1' }] as never,
    });
    useVenueStore.setState({
      currentVenue: { id: 'v1', name: 'Arena', zones: [{ id: 'z1', name: 'Food Court', zone_type: 'food' }] } as never,
      zones: [{ id: 'z1', name: 'Food Court', zone_type: 'food' }] as never,
      isLoading: false,
    });

    vi.mocked(getMenu).mockResolvedValue(mockMenuItems as never);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <OrderPage />
      </MemoryRouter>
    );

  it('renders dynamic categories and hides merchandise items', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Veg Burger')).toBeInTheDocument();
    });

    expect(screen.queryByText('CrowdIQ Cap')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mains' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Snacks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drinks' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desserts' })).not.toBeInTheDocument();
  });

  it('filters items by dietary tag', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Veg Burger')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Vegetarian' }));

    expect(screen.getByText('Veg Burger')).toBeInTheDocument();
    expect(screen.queryByText('Chicken Wrap')).not.toBeInTheDocument();
    expect(screen.queryByText('Masala Chips')).not.toBeInTheDocument();
  });

  it('shows the cart FAB after adding an item', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Add' }).length).toBeGreaterThan(0);
    });

    await userEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    expect(screen.getByRole('button', { name: /open cart with 1 items/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Veg Burger')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 15000);
});

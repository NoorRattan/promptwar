import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { OrderStatusTracker } from '@/components/order/OrderStatusTracker';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

expect.extend(toHaveNoViolations);

describe('OrderStatusTracker', () => {
  it('renders all five stage labels', () => {
    render(<OrderStatusTracker currentStatus="received" />);

    ['Received', 'Confirmed', 'Preparing', 'Ready', 'Collected'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('exposes the current status via its status label', () => {
    render(<OrderStatusTracker currentStatus="preparing" />);

    expect(screen.getByRole('status', { name: 'Order status: preparing' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OrderStatusTracker currentStatus="ready" />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/Badge';

expect.extend(toHaveNoViolations);

describe('Badge', () => {
  it('renders its label and variant class', () => {
    const { container } = render(<Badge label="Critical" variant="critical" />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('badge', 'badge-danger');
  });

  it('renders an icon and forwarded status role', () => {
    render(
      <Badge
        variant="info"
        label="Live sync"
        role="status"
        icon={
          <span data-testid="badge-icon" aria-hidden="true">
            i
          </span>
        }
      />
    );

    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Live sync');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Badge label="Open" variant="open" role="status" />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

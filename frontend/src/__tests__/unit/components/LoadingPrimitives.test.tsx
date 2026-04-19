import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { PageLoader } from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/Skeleton';

expect.extend(toHaveNoViolations);

describe('Loading primitives', () => {
  it('renders the branded page loader', () => {
    render(<PageLoader />);

    expect(screen.getByLabelText('Loading page')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('CrowdIQ')).toBeInTheDocument();
    expect(screen.getByText('Syncing live venue intelligence')).toBeInTheDocument();
  });

  it('renders skeleton variants', () => {
    const { container } = render(
      <div>
        <Skeleton variant="card" />
        <Skeleton variant="text" />
        <Skeleton variant="circle" />
      </div>
    );

    expect(container.querySelectorAll('.skeleton')).toHaveLength(3);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PageLoader />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

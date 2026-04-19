import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { DensityBadge } from '@/components/crowd/DensityBadge';

expect.extend(toHaveNoViolations);

describe('DensityBadge', () => {
  it('renders LOW level with the current copy', () => {
    render(<DensityBadge level="LOW" />);

    expect(screen.getByRole('status', { name: 'Crowd density: Low' })).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders CRITICAL level with the current copy', () => {
    render(<DensityBadge level="CRITICAL" />);

    expect(screen.getByRole('status', { name: 'Crowd density: Critical' })).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('marks the icon as decorative', () => {
    const { container } = render(<DensityBadge level="HIGH" />);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DensityBadge level="MEDIUM" />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

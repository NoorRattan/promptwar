import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it } from 'vitest';
import { ProgressBar } from '@/components/ui/ProgressBar';

expect.extend(toHaveNoViolations);

describe('ProgressBar component', () => {
  it('renders with correct aria-valuenow', () => {
    render(<ProgressBar value={60} label="Order progress" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  });

  it('renders correct aria attributes', () => {
    render(<ProgressBar value={60} label="Order progress" />);
    const pb = screen.getByRole('progressbar');
    expect(pb).toHaveAttribute('aria-valuemin', '0');
    expect(pb).toHaveAttribute('aria-valuemax', '100');
    expect(pb).toHaveAttribute('aria-label', 'Order progress');
  });

  it('clamps value at 100', () => {
    render(<ProgressBar value={150} label="x" />);
    const pbInner = screen.getByRole('progressbar').firstChild as HTMLElement;
    expect(pbInner.style.width).toBe('100%');
  });

  it('clamps value at 0', () => {
    render(<ProgressBar value={-50} label="x" />);
    const pbInner = screen.getByRole('progressbar').firstChild as HTMLElement;
    expect(pbInner.style.width).toBe('0%');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProgressBar value={50} label="Progress" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

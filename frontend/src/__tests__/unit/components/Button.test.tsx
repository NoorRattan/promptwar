import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/Button';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('renders with the provided label', () => {
    render(
      <Button variant="primary" size="md">
        Click me
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();

    render(
      <Button variant="primary" size="md" onClick={onClick}>
        Go
      </Button>
    );

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and busy when loading', () => {
    render(
      <Button variant="primary" size="md" isLoading loadingLabel="Saving...">
        Save
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Saving...');
  });

  it('retains keyboard focus', () => {
    const onClick = vi.fn();

    render(
      <Button variant="primary" size="md" onClick={onClick}>
        Go
      </Button>
    );

    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(button).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Button variant="primary" size="md">
        Submit
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

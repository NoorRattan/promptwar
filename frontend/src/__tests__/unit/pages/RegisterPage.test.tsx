import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '@/lib/api/client';
import { registerWithEmail } from '@/lib/firebase/auth';
import RegisterPage from '@/pages/auth/RegisterPage';
import { useAuthStore } from '@/store/authStore';

expect.extend(toHaveNoViolations);

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, search: '' }),
  };
});

vi.mock('@/lib/firebase/auth', () => ({
  registerWithEmail: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    useAuthStore.setState({
      user: null,
      firebaseUid: null,
      idToken: null,
      isAuthenticated: false,
      isAnonymous: false,
      isLoading: false,
      error: null,
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

  it('navigates to home even when backend sync fails', async () => {
    vi.mocked(registerWithEmail).mockResolvedValue({
      user: {
        uid: 'uid123',
        getIdToken: vi.fn().mockResolvedValue('token'),
      },
    } as never);
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Backend error'));

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(screen.queryByText(/unexpected error/i)).not.toBeInTheDocument();
  }, 10000);

  it('shows a firebase-specific validation message when registration fails', async () => {
    vi.mocked(registerWithEmail).mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    } as never);

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/an account with this email already exists/i)
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

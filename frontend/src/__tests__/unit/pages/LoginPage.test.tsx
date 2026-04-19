import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerUser } from '@/lib/api/auth';
import { loginAsGuest, loginWithEmail } from '@/lib/firebase/auth';
import LoginPage from '@/pages/auth/LoginPage';
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
  loginWithEmail: vi.fn(),
  loginAsGuest: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  registerUser: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getApiErrorMessage: (error: unknown) =>
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : 'An unexpected error occurred.',
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        <LoginPage />
      </MemoryRouter>
    );

  it('renders the sign-in form and guest action', () => {
    renderComponent();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });

  it('shows validation errors on invalid submit', async () => {
    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });

  it('logs in with email and redirects to the attendee home page', async () => {
    vi.mocked(loginWithEmail).mockResolvedValue({
      user: {
        uid: '123',
        email: 'test@example.com',
        displayName: null,
        getIdToken: vi.fn().mockResolvedValue('token'),
      },
    } as never);
    vi.mocked(registerUser).mockResolvedValue({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'attendee',
      preferred_language: 'en',
      venue_id: 'v1',
      seat_number: null,
    } as never);

    renderComponent();

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(loginWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(registerUser).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('opens a guest session and redirects with the demo flag', async () => {
    vi.mocked(loginAsGuest).mockResolvedValue({
      user: {
        uid: 'guest-123',
        getIdToken: vi.fn().mockResolvedValue('token'),
      },
    } as never);

    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: /continue as guest/i }));

    await waitFor(() => {
      expect(loginAsGuest).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/?demo=true', { replace: true });
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { registerUser } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/client';
import { loginAsGuest, loginWithEmail } from '@/lib/firebase/auth';
import { buildDemoPath, isDemoSearch } from '@/lib/routing/demo';
import { loginSchema, type LoginFormData } from '@/lib/validation/auth.schemas';
import { useAuthStore } from '@/store/authStore';

function resolveRedirect(
  state: unknown,
  search: string,
  fallbackRole: string,
  isAnonymous: boolean
): string {
  if (fallbackRole === 'admin' || fallbackRole === 'staff') {
    return '/admin';
  }

  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from?: { pathname?: string; search?: string } }).from;
    if (from?.pathname) {
      return buildDemoPath(`${from.pathname}${from.search ?? ''}`, search, isAnonymous);
    }
  }

  return buildDemoPath('/', search, isAnonymous);
}

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setAuth, isAnonymous: authIsAnonymous } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const isDemo = isDemoSearch(location.search);
  const disabled = signingIn || guestLoading;
  const redirectTarget = useMemo(
    () =>
      resolveRedirect(
        location.state,
        location.search,
        user?.role ?? 'attendee',
        authIsAnonymous
      ),
    [authIsAnonymous, location.search, location.state, user?.role]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, redirectTarget, user]);

  const onSubmit = handleSubmit(async (formData) => {
    setSigningIn(true);
    setAuthError(null);

    try {
      const credential = await loginWithEmail(formData.email, formData.password);
      const token = await credential.user.getIdToken(true);
      const profile = await registerUser({
        email: credential.user.email ?? formData.email,
        fullName:
          credential.user.displayName ??
          credential.user.email?.split('@')[0] ??
          'CrowdIQ User',
        preferredLanguage: 'en',
      });

      setAuth({
        uid: credential.user.uid,
        token,
        email: profile.email,
        fullName: profile.full_name ?? profile.fullName ?? null,
        full_name: profile.full_name ?? profile.fullName ?? null,
        role: profile.role,
        preferredLanguage:
          profile.preferred_language ?? profile.preferredLanguage ?? 'en',
        preferred_language:
          profile.preferred_language ?? profile.preferredLanguage ?? 'en',
        venueId: profile.venue_id ?? profile.venueId ?? null,
        venue_id: profile.venue_id ?? profile.venueId ?? null,
        seatNumber: profile.seat_number ?? profile.seatNumber ?? null,
        seat_number: profile.seat_number ?? profile.seatNumber ?? null,
        isAnonymous: false,
      });

      navigate(
        resolveRedirect(location.state, location.search, profile.role, false),
        { replace: true }
      );
    } catch (error) {
      setAuthError(getApiErrorMessage(error));
    } finally {
      setSigningIn(false);
    }
  });

  const handleGuestLogin = async (): Promise<void> => {
    setGuestLoading(true);
    setAuthError(null);

    try {
      const credential = await loginAsGuest();
      const token = await credential.user.getIdToken();

      setAuth({
        uid: credential.user.uid,
        token,
        email: 'guest',
        fullName: 'Guest',
        full_name: 'Guest',
        role: 'attendee',
        preferredLanguage: 'en',
        preferred_language: 'en',
        isAnonymous: true,
      });

      navigate(buildDemoPath('/', location.search, true), { replace: true });
    } catch (error) {
      setAuthError(getApiErrorMessage(error));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(circle at 50% 40%, rgba(37,99,235,0.08) 0%, transparent 60%), linear-gradient(180deg, #050B16 0%, #070D1A 100%)",
      }}
    >
      <main className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] font-['Syne'] text-sm font-bold text-white">
              CQ
            </div>
            <div className="text-left">
              <p className="text-title">CrowdIQ</p>
              <p className="text-meta">Smart Stadium Experience</p>
            </div>
          </div>
        </div>

        <section className="surface-card rounded-[20px] p-6">
          <div className="page-copy mb-6">
            <h1 className="text-title">Sign in to your account</h1>
            <p className="text-meta">Use the live event backend or continue in guest mode.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="email" className="text-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input-field mt-2"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={disabled}
                placeholder="demo@crowdiq.app"
                {...register('email')}
              />
              {errors.email ? (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="password" className="text-label">
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field pr-12"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  disabled={disabled}
                  placeholder="Demo1234!"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="focus-ring absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[var(--color-text-secondary)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? (
                <p id="password-error" className="field-error" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {authError ? (
              <div className="rounded-[12px] border border-[rgba(252,165,165,0.18)] bg-[rgba(220,38,38,0.12)] px-4 py-3 text-sm text-[#fecaca]">
                {authError}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={disabled}>
              {signingIn ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-meta uppercase tracking-[0.18em]">or</span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              void handleGuestLogin();
            }}
            disabled={disabled}
          >
            <span>{guestLoading ? 'Opening Guest Session...' : 'Continue as Guest'}</span>
            <ArrowRight size={16} />
          </button>

          <p className="mt-5 text-center text-body text-[var(--color-text-secondary)]">
            No account?{' '}
            <Link
              to={buildDemoPath('/register', location.search, isDemo)}
              className="font-semibold text-[var(--color-accent-light)]"
            >
              Create one
            </Link>
          </p>
        </section>

        <p className="mt-4 text-center text-meta">
          Use guest mode or demo@crowdiq.app / Demo1234!
        </p>
      </main>
    </div>
  );
}

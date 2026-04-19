import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import apiClient from '@/lib/api/client';
import { registerWithEmail } from '@/lib/firebase/auth';
import { buildDemoPath, isDemoSearch } from '@/lib/routing/demo';
import { registerSchema, type RegisterFormData } from '@/lib/validation/auth.schemas';
import { useAuthStore } from '@/store/authStore';

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Registration failed. Please try again.';
  }
}

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDemo = isDemoSearch(location.search);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      preferredLanguage: 'en',
    },
  });

  const onSubmit = handleSubmit(async (formData) => {
    setSubmitting(true);
    setFormError(null);

    try {
      const credential = await registerWithEmail(formData.email, formData.password);
      const token = await credential.user.getIdToken();

      try {
        await apiClient.post(
          '/auth/register',
          {
            full_name: formData.fullName,
            email: formData.email,
            firebase_uid: credential.user.uid,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (backendError) {
        console.warn(
          'Backend sync failed, proceeding with Firebase auth only:',
          backendError
        );
      }

      setAuth({
        uid: credential.user.uid,
        token,
        email: formData.email,
        fullName: formData.fullName,
        full_name: formData.fullName,
        role: 'attendee',
        preferredLanguage: formData.preferredLanguage,
        preferred_language: formData.preferredLanguage,
        venueId: null,
        venue_id: null,
        seatNumber: null,
        seat_number: null,
        isAnonymous: false,
      });

      navigate(buildDemoPath('/', location.search, false), { replace: true });
    } catch (error) {
      const firebaseCode =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string'
          ? error.code
          : '';
      setFormError(getFirebaseErrorMessage(firebaseCode));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(circle at 50% 40%, rgba(37,99,235,0.08) 0%, transparent 60%), linear-gradient(180deg, #050B16 0%, #070D1A 100%)",
      }}
    >
      <main className="w-full max-w-[440px]">
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
            <h1 className="text-title">Create your account</h1>
            <p className="text-meta">Register an attendee profile for the current venue session.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="fullName" className="text-label">
                Full Name
              </label>
              <input
                id="fullName"
                className="input-field mt-2"
                aria-invalid={errors.fullName ? 'true' : 'false'}
                aria-describedby={errors.fullName ? 'name-error' : undefined}
                disabled={submitting}
                {...register('fullName')}
              />
              {errors.fullName ? (
                <p id="name-error" className="field-error" role="alert">
                  {errors.fullName.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="email" className="text-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field mt-2"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                disabled={submitting}
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
                  className="input-field pr-12"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  disabled={submitting}
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

            <div>
              <label htmlFor="confirmPassword" className="text-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className="input-field mt-2"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                disabled={submitting}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p id="confirm-password-error" className="field-error" role="alert">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            {formError ? (
              <div className="rounded-[12px] border border-[rgba(252,165,165,0.18)] bg-[rgba(220,38,38,0.12)] px-4 py-3 text-sm text-[#fecaca]">
                {formError}
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-body text-[var(--color-text-secondary)]">
            Already have an account?{' '}
            <Link
              to={buildDemoPath('/login', location.search, isDemo)}
              className="font-semibold text-[var(--color-accent-light)]"
            >
              Sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

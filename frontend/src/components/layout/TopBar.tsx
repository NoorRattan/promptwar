import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Globe, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { logout } from '@/lib/firebase/auth';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';
import { Badge, LiveDot } from '@/components/ui';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'hi', label: 'HI', name: 'हिन्दी' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'pt', label: 'PT', name: 'Português' },
] as const;

function initialsFromEmail(email: string | null | undefined): string {
  const source = email?.split('@')[0] ?? 'guest';
  return source.slice(0, 2).toUpperCase();
}

export interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { user, clearAuth, isAnonymous } = useAuthStore();
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [langOpen, setLangOpen] = useState(false);

  const avatarLabel = useMemo(() => {
    if (isAnonymous || !user) {
      return 'GU';
    }

    return initialsFromEmail(user.email);
  }, [isAnonymous, user]);

  const currentLang = useMemo(() => {
    const activeCode = (i18n.language || 'en').split('-')[0];
    return LANGUAGES.find((language) => language.code === activeCode) ?? LANGUAGES[0];
  }, [i18n.language]);

  const handleAuthAction = async (): Promise<void> => {
    if (isAnonymous || !user) {
      navigate(buildDemoPath('/login', window.location.search, false));
      return;
    }

    await logout().catch(() => undefined);
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className="topbar-blur fixed left-0 right-0 top-0 z-[200] border-b border-[var(--color-border)]"
      title={title ?? 'CrowdIQ'}
      style={{ height: 'var(--topbar-height)' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={buildDemoPath('/', location.search, isAnonymous)}
            className="brand-link flex min-w-0 items-center gap-3"
            aria-label="CrowdIQ - Go to home"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-[11px] font-bold tracking-[0.06em] text-white shadow-[0_10px_28px_rgba(37,99,235,0.25)]">
              CQ
            </div>
            <div className="min-w-0">
              <p className="brand-name truncate text-heading">CrowdIQ</p>
              <p className="truncate text-meta">
                {currentVenue?.name ?? 'MetroArena Stadium'}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] px-2.5 py-1 sm:flex">
            <LiveDot />
            <Badge variant="live" label="LIVE" />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((current) => !current)}
              aria-label="Change language"
              aria-expanded={langOpen}
              className="focus-ring flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]"
            >
              <Globe size={12} />
              <span>{currentLang.label}</span>
              <ChevronDown size={12} />
            </button>

            {langOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close language menu"
                  className="fixed inset-0 z-[299] cursor-default bg-transparent"
                  onClick={() => setLangOpen(false)}
                />
                <div className="animate-fade-in absolute right-0 top-[calc(100%+6px)] z-[300] min-w-[156px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => {
                        void i18n.changeLanguage(language.code);
                        document.documentElement.dir =
                          language.code === 'ar' ? 'rtl' : 'ltr';
                        document.documentElement.lang = language.code;
                        setLangOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors"
                      style={{
                        background:
                          currentLang.code === language.code
                            ? 'var(--color-accent-glow)'
                            : 'transparent',
                        color:
                          currentLang.code === language.code
                            ? 'var(--color-accent-light)'
                            : 'var(--color-text-secondary)',
                      }}
                    >
                      <span className="min-w-[24px] font-semibold">{language.label}</span>
                      <span className="text-[12px] opacity-75">{language.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-active)] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] text-xs font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]"
              >
                {avatarLabel}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="surface-card z-[210] min-w-[220px] rounded-[16px] p-2"
              >
                <div className="border-b border-[var(--color-border)] px-3 py-3">
                  <p className="text-label">Account</p>
                  <p className="mt-1 text-body font-semibold">
                    {isAnonymous || !user ? 'Guest session' : user.email}
                  </p>
                </div>
                <DropdownMenu.Item
                  onSelect={() => {
                    void handleAuthAction();
                  }}
                  className="focus-ring mt-1 flex cursor-pointer items-center gap-2 rounded-[12px] px-3 py-2 text-body text-[var(--color-text-primary)] outline-none hover:bg-[rgba(17,30,53,0.72)]"
                >
                  {isAnonymous || !user ? <LogIn size={16} /> : <LogOut size={16} />}
                  <span>{isAnonymous || !user ? 'Sign In' : 'Sign Out'}</span>
                </DropdownMenu.Item>
                {!isAnonymous && user ? (
                  <DropdownMenu.Item className="mt-1 flex items-center gap-2 rounded-[12px] px-3 py-2 text-body text-[var(--color-text-secondary)] outline-none">
                    <UserIcon size={16} />
                    <span>{user.role}</span>
                  </DropdownMenu.Item>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

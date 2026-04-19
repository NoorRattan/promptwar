import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  ListOrdered,
  Map,
  Shield,
  Ticket,
  Users,
  Waves,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/heatmap', label: 'Heatmap', icon: Map },
  { to: '/admin/queues', label: 'Queues', icon: Waves },
  { to: '/admin/orders', label: 'Orders', icon: ListOrdered },
  { to: '/admin/emergency', label: 'Emergency', icon: Shield },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/staff', label: 'Staff', icon: Users },
  { to: '/admin/seats', label: 'Seats', icon: Ticket },
  { to: '/admin/incidents', label: 'Incidents', icon: AlertTriangle },
] as const;

export function AdminLayout({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const location = useLocation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);

  return (
    <div className="admin-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-[280px] border-r border-[var(--color-border)] px-5 py-6 lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] text-sm font-bold text-white">
              CQ
            </div>
            <div>
              <p className="text-heading">CrowdIQ Ops</p>
              <p className="text-meta">Venue command interface</p>
            </div>
          </div>
          <nav className="space-y-1" aria-label="Admin navigation">
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={buildDemoPath(item.to, location.search, isAnonymous)}
                  end={item.to === '/admin'}
                  className="admin-sidebar-link focus-ring"
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="topbar-blur sticky top-0 z-20 border-b border-[var(--color-border)] px-4 py-4 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="page-copy">
                <h1 className="text-display">{title}</h1>
                <p className="text-meta">Live venue operations and response controls.</p>
              </div>
              {actions}
            </div>
          </header>
          <main id="main-content" className="page-content-shell flex-1">
            {children}
          </main>
        </div>
      </div>

      <nav
        className="bottom-nav-blur fixed bottom-0 left-0 right-0 z-[100] border-t border-[var(--color-border)] lg:hidden"
        style={{ height: 'calc(var(--nav-height) + env(safe-area-inset-bottom))' }}
        aria-label="Admin mobile navigation"
      >
        <div className="grid h-[var(--nav-height)] grid-cols-5 gap-1 px-1">
          {ADMIN_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={buildDemoPath(item.to, location.search, isAnonymous)}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `focus-ring flex flex-col items-center justify-center gap-1 rounded-[12px] ${
                    isActive ? 'text-[var(--color-accent-light)]' : 'text-[var(--color-text-muted)]'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

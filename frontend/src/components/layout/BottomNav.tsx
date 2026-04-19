import { Armchair, Home, List, Map, Phone, ShoppingCart } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';

const NAV_ITEMS = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Map', to: '/map', icon: Map },
  { label: 'Queues', to: '/queues', icon: List },
  { label: 'Food', to: '/order', icon: ShoppingCart },
  { label: 'Seat', to: '/seats', icon: Armchair },
] as const;

export function BottomNav(): JSX.Element {
  const location = useLocation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);

  return (
    <>
      <nav
        className="bottom-nav-blur fixed bottom-0 left-0 right-0 z-[100] border-t border-[var(--color-border)] lg:hidden"
        style={{ height: 'calc(var(--nav-height) + env(safe-area-inset-bottom))' }}
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex h-[var(--nav-height)] max-w-[720px] items-stretch px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={buildDemoPath(item.to, location.search, isAnonymous)}
                end={item.to === '/'}
                role="tab"
                aria-label={item.label}
                className={({ isActive }) =>
                  `focus-ring relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[12px] ${
                    isActive ? 'text-[var(--color-accent-light)]' : 'text-[var(--color-text-muted)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`absolute left-3 right-3 top-0 h-[2px] rounded-full ${
                        isActive ? 'bg-[var(--color-accent-light)]' : 'bg-transparent'
                      }`}
                    />
                    <span
                      className={`transition-transform duration-200 ${
                        isActive ? 'scale-110' : 'scale-100'
                      }`}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="text-[11px] font-semibold">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <NavLink
        to={buildDemoPath('/emergency', location.search, isAnonymous)}
        aria-label="Emergency assistance"
        className="focus-ring fixed bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+12px)] right-4 z-[110] inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(252,165,165,0.18)] bg-[linear-gradient(135deg,#b91c1c_0%,#dc2626_100%)] text-white shadow-[0_18px_32px_rgba(220,38,38,0.28)]"
      >
        <Phone size={16} />
      </NavLink>
    </>
  );
}

import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  {
    id: 'home', label: 'Home', path: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'map', label: 'Map', path: '/map',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" x2="9" y1="3" y2="18" />
        <line x1="15" x2="15" y1="6" y2="21" />
      </svg>
    ),
  },
  {
    id: 'queues', label: 'Queues', path: '/queues',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" x2="21" y1="6" y2="6" />
        <line x1="8" x2="21" y1="12" y2="12" />
        <line x1="8" x2="21" y1="18" y2="18" />
        <line x1="3" x2="3.01" y1="6" y2="6" />
        <line x1="3" x2="3.01" y1="12" y2="12" />
        <line x1="3" x2="3.01" y1="18" y2="18" />
      </svg>
    ),
  },
  {
    id: 'order', label: 'Food', path: '/order',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  {
    id: 'seats', label: 'Seat', path: '/seats',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V22H4V12" />
        <path d="M22 7H2v5h20V7z" />
        <path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
];

export const AttendeeBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);

  const labels = {
    home: t('nav.home', { defaultValue: 'Home' }),
    map: t('nav.map', { defaultValue: 'Map' }),
    queues: t('nav.queues', { defaultValue: 'Queues' }),
    order: t('nav.order', { defaultValue: 'Food' }),
    seats: t('nav.seats', { defaultValue: 'Seat' }),
    emergency: t('nav.emergency', { defaultValue: 'SOS' }),
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-30"
      style={{
        background: 'rgba(11, 19, 38, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(67, 70, 85, 0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-between h-16 px-1">
        {/* Nav items (4 left-side items) */}
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={buildDemoPath(item.path, location.search, isAnonymous)}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 min-h-[44px] ${
                isActive ? 'text-blue-400' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                  style={{ color: isActive ? '#60a5fa' : '#64748b' }}
                >
                  {item.icon}
                </div>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ fontFamily: 'Manrope', color: isActive ? '#60a5fa' : '#64748b' }}
                >
                  {labels[item.id as keyof typeof labels] ?? item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Emergency Button — always visible, red pill */}
        <button
          onClick={() =>
            navigate(buildDemoPath('/emergency', location.search, isAnonymous))
          }
          data-testid="emergency-exit-btn"
          aria-label="Emergency evacuation"
          className="flex flex-col items-center justify-center flex-none w-14 h-full gap-1 transition-all duration-200 active:scale-95"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 12px rgba(239,68,68,0.5)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold leading-none text-red-400" style={{ fontFamily: 'Manrope' }}>
            {labels.emergency}
          </span>
        </button>
      </div>
    </nav>
  );
};

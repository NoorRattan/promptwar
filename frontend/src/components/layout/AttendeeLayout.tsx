import type { ReactNode } from 'react';

import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { useAuthStore } from '@/store/authStore';
import { useCrowdStore } from '@/store/crowdStore';
import { useQueueStore } from '@/store/queueStore';
import { useVenueStore } from '@/store/venueStore';

export function AttendeeLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}): JSX.Element {
  const authLoading = useAuthStore((state) => state.isLoading);
  const venueLoading = useVenueStore((state) => state.isLoading);
  const queueLoading = useQueueStore((state) => state.isLoading);
  const crowdLoading = useCrowdStore((state) => state.isLoading);
  const isBusy = authLoading || venueLoading || queueLoading || crowdLoading;

  return (
    <div className="app-shell min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className={`layout-progress ${isBusy ? 'is-visible' : ''}`} aria-hidden="true">
        <div className="layout-progress-bar" />
      </div>
      <TopBar title={title} />
      <main id="main-content" className="attendee-main outline-none">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

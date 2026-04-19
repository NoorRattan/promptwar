import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EmergencyBanner } from '@/components/layout/EmergencyBanner';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { PageLoader } from '@/components/ui/PageLoader';
import { ToastContainer } from '@/components/ui';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const HomePage = lazy(() => import('@/pages/attendee/HomePage'));
const MapPage = lazy(() => import('@/pages/attendee/MapPage'));
const QueuesPage = lazy(() => import('@/pages/attendee/QueuesPage'));
const OrderPage = lazy(() => import('@/pages/attendee/OrderPage'));
const OrderStatusPage = lazy(() => import('@/pages/attendee/OrderStatusPage'));
const SeatsPage = lazy(() => import('@/pages/attendee/SeatsPage'));
const EmergencyPage = lazy(() => import('@/pages/attendee/EmergencyPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const HeatmapPage = lazy(() => import('@/pages/admin/HeatmapPage'));
const QueuesAdminPage = lazy(() => import('@/pages/admin/QueuesAdminPage'));
const OrdersAdminPage = lazy(() => import('@/pages/admin/OrdersAdminPage'));
const StaffPage = lazy(() => import('@/pages/admin/StaffPage'));
const SeatsAdminPage = lazy(() => import('@/pages/admin/SeatsAdminPage'));
const EmergencyAdminPage = lazy(() => import('@/pages/admin/EmergencyAdminPage'));
const AnalyticsPage = lazy(() => import('@/pages/admin/AnalyticsPage'));
const IncidentsPage = lazy(() => import('@/pages/admin/IncidentsPage'));

function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }
  if (!user) {
    return (
      <Navigate
        to={buildDemoPath('/login', location.search)}
        state={{ from: location }}
        replace
      />
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }): JSX.Element {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <PageLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!['admin', 'staff'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function NotFoundPage(): JSX.Element {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-slate-950 text-white"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-slate-300">The requested route does not exist.</p>
      </div>
    </main>
  );
}

function AppRoutes(): JSX.Element {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const direction =
      typeof i18n.dir === 'function' ? i18n.dir(i18n.language) : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  return (
    <>
      <EmergencyBanner />
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <div key={location.pathname} className="animate-page-enter">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />

            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
            <Route path="/queues" element={<ProtectedRoute><QueuesPage /></ProtectedRoute>} />
            <Route path="/order" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
            <Route path="/order/:orderId/status" element={<ProtectedRoute><OrderStatusPage /></ProtectedRoute>} />
            <Route path="/seats" element={<ProtectedRoute><SeatsPage /></ProtectedRoute>} />

            <Route path="/admin" element={<AdminRoute><DashboardPage /></AdminRoute>} />
            <Route path="/admin/heatmap" element={<AdminRoute><HeatmapPage /></AdminRoute>} />
            <Route path="/admin/queues" element={<AdminRoute><QueuesAdminPage /></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute><OrdersAdminPage /></AdminRoute>} />
            <Route path="/admin/staff" element={<AdminRoute><StaffPage /></AdminRoute>} />
            <Route path="/admin/seats" element={<AdminRoute><SeatsAdminPage /></AdminRoute>} />
            <Route path="/admin/emergency" element={<AdminRoute><EmergencyAdminPage /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
            <Route path="/admin/incidents" element={<AdminRoute><IncidentsPage /></AdminRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Suspense>
    </>
  );
}

export default function App(): JSX.Element {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

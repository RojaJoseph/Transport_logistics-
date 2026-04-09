import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/Layout';
import PrivateRoute from '@/components/PrivateRoute';
import LoginPage from '@/modules/identity/LoginPage';
import Dashboard from '@/modules/analytics/Dashboard';
import ERPModule from '@/modules/erp/ERPModule';
import TransportModule from '@/modules/transport/TransportModule';
import TrackingModule from '@/modules/tracking/TrackingModule';
import AIModule from '@/modules/ai/AIModule';
import IdentityModule from '@/modules/identity/IdentityModule';
import FinanceModule from '@/modules/finance/FinanceModule';
import OrderModule from '@/modules/orders/OrderModule';
import NotificationsModule from '@/modules/notifications/NotificationsModule';
import IntegrationsModule from '@/modules/integrations/IntegrationsModule';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-display)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/erp/*" element={<ERPModule />} />
            <Route path="/transport/*" element={<TransportModule />} />
            <Route path="/tracking/*" element={<TrackingModule />} />
            <Route path="/ai/*" element={<AIModule />} />
            <Route path="/identity/*" element={<IdentityModule />} />
            <Route path="/finance/*" element={<FinanceModule />} />
            <Route path="/orders/*" element={<OrderModule />} />
            <Route path="/notifications/*" element={<NotificationsModule />} />
            <Route path="/integrations/*" element={<IntegrationsModule />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

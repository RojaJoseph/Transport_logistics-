import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function PrivateRoute() {
  const { isAuthenticated, token } = useAuthStore();

  // Allow through if authenticated OR if a guest demo token is present
  const allowed = isAuthenticated || token === 'guest-demo-token';

  return allowed ? <Outlet /> : <Navigate to="/login" replace />;
}

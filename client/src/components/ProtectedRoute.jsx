import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

/**
 * ProtectedRoute component.
 * - Displays a loading indicator while verifying the current user session
 * - Redirects unauthenticated visitors to /login (preserving intended destination in state)
 * - Renders protected children/Outlet when authenticated
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Activity className="w-8 h-8 text-indigo-400 animate-spin" />
        <span className="text-sm font-medium text-slate-400">Verifying session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;

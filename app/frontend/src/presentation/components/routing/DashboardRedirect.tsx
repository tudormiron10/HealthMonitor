import { Navigate } from 'react-router-dom';
import { useAuth } from '@/application/hooks/useAuth';
import { getDashboardHome } from '@/application/utils/dashboardRoutes';

export const DashboardRedirect: React.FC = () => {
  const { role } = useAuth();
  return <Navigate to={getDashboardHome(role)} replace />;
};

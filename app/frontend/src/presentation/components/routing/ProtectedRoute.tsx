import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/application/hooks/useAuth';
import type { UserRoleType } from '@/domain';

interface ProtectedRouteProps {
  allowedRoles?: UserRoleType[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, role } = useAuth();

  // Show nothing or a global loader while initially fetching profile data
  // if needed, though JWT validation is synchronous. Profile fetch is async.
  // But we mostly care about 'isAuthenticated' derived synchronously from token.
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // If role is required and user lacks it
  if (allowedRoles && role && !allowedRoles.includes(role as UserRoleType)) {
    return <Navigate to="/" replace />; // Safest fallback for wrong role
  }

  return <Outlet />;
};

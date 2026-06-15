import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/application/hooks/useAuth';
import type { SpecialistProfile } from '@/domain/models/UserProfile';

const SPECIALIST_ROLES = ['DOCTOR', 'NUTRITIONIST', 'COACH'];

export const SpecialistVerificationGuard: React.FC = () => {
  const { role, profile, isLoadingProfile } = useAuth();

  if (isLoadingProfile) return null;

  if (SPECIALIST_ROLES.includes(role || '')) {
    const sp = profile as SpecialistProfile | null;
    const vs = sp?.verification_status;
    if (vs === 'PENDING_VERIFICATION' || vs === 'REJECTED') {
      return <Navigate to="/dashboard/specialist/verification" replace />;
    }
  }

  return <Outlet />;
};

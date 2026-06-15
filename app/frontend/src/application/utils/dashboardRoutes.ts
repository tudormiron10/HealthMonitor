import { UserRole } from '@/domain/enums';

export const getDashboardHome = (role: string | null | undefined): string => {
  switch (role) {
    case UserRole.PATIENT:
      return '/dashboard/patient';
    case UserRole.DOCTOR:
    case UserRole.NUTRITIONIST:
    case UserRole.COACH:
    case UserRole.SPECIALIST:
      return '/dashboard/specialist';
    case UserRole.ADMIN:
      return '/dashboard/admin';
    default:
      return '/dashboard/patient';
  }
};

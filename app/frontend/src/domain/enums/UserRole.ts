export const UserRole = {
  ADMIN: 'ADMIN',
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  NUTRITIONIST: 'NUTRITIONIST',
  COACH: 'COACH',
  SPECIALIST: 'SPECIALIST',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

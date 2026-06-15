import { UserRole } from '@/domain/enums/UserRole';

export const MedicalSpecialization = {
  CARDIOLOGIE: 'Cardiologie',
  ENDOCRINOLOGIE: 'Endocrinologie',
  DIABET_NUTRITIE_BOLI_METABOLICE: 'Diabet, Nutriție și Boli Metabolice',
  GASTROENTEROLOGIE: 'Gastroenterologie',
  HEPATOLOGIE: 'Hepatologie',
  NEFROLOGIE: 'Nefrologie',
  HEMATOLOGIE: 'Hematologie',
  MEDICINA_INTERNA: 'Medicină Internă',
  UROLOGIE: 'Urologie',
  NUTRITIONIST: 'Nutriționist',
  COACH: 'Antrenor Personal',
  ALTA: 'Altă Specializare',
} as const;

export type MedicalSpecialization = (typeof MedicalSpecialization)[keyof typeof MedicalSpecialization];

// DOCTOR-eligible specializations (all medical + general)
export const MEDICAL_SPECIALIZATIONS: MedicalSpecialization[] = [
  MedicalSpecialization.CARDIOLOGIE,
  MedicalSpecialization.ENDOCRINOLOGIE,
  MedicalSpecialization.DIABET_NUTRITIE_BOLI_METABOLICE,
  MedicalSpecialization.GASTROENTEROLOGIE,
  MedicalSpecialization.HEPATOLOGIE,
  MedicalSpecialization.NEFROLOGIE,
  MedicalSpecialization.HEMATOLOGIE,
  MedicalSpecialization.MEDICINA_INTERNA,
  MedicalSpecialization.UROLOGIE,
  MedicalSpecialization.ALTA,
];

// Non-physician specializations (NUTRITIONIST and COACH roles only)
export const NON_PHYSICIAN_SPECIALIZATIONS: MedicalSpecialization[] = [
  MedicalSpecialization.NUTRITIONIST,
  MedicalSpecialization.COACH,
];

export function getSpecializationsForRole(role: string): MedicalSpecialization[] {
  if (role === UserRole.DOCTOR) return MEDICAL_SPECIALIZATIONS;
  if (role === UserRole.NUTRITIONIST) return [MedicalSpecialization.NUTRITIONIST];
  if (role === UserRole.COACH) return [MedicalSpecialization.COACH];
  return [];
}

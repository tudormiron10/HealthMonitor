import type { MedicalSpecialization } from './MedicalSpecialization';

export type UserRole = 'ADMIN' | 'PATIENT' | 'DOCTOR' | 'NUTRITIONIST' | 'COACH';
export type VerificationStatus = 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
export type CertificationType = 'ANEFS' | 'NASM' | 'ACE' | 'ISSA' | 'ALTELE';

export interface PlatformStats {
  total_patients: number;
  total_doctors: number;
  total_nutritionists_coaches: number;
  pending_verifications: number;
  total_medical_records: number;
  total_ml_predictions: number;
  active_relations: number;
}

export interface UserAdmin {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  verification_status: VerificationStatus | null;
  created_at: string;
  first_name: string;
  last_name: string;
}

export interface SpecialistPending {
  user_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  verification_status: VerificationStatus | null;
  rejection_reason: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  specialization: MedicalSpecialization | null;
  license_number: string | null;
  clinic_affiliation: string | null;
  cod_parafa: string | null;
  unitate_sanitara: string | null;
  numar_ondr: string | null;
  institutie_absolvire: string | null;
  tip_certificare: CertificationType | null;
  numar_certificare: string | null;
  verification_document_url: string | null;
}

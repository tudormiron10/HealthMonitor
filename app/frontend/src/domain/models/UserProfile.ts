import type { LanguageCode, MedicGrade, NutritionSpecialization, SportSpecialization } from '@/domain/enums/SpecialistEnums';
import type { MedicalSpecialization } from './MedicalSpecialization';

export interface BaseUserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
}

export interface PatientProfile extends BaseUserProfile {
  date_of_birth: string;
  sex: string;
}

export interface SpecialistProfile extends BaseUserProfile {
  specialization: string;
  license_number: string;
  clinic_affiliation?: string;
  verification_status?: string;
  rejection_reason?: string | null;
  cod_parafa?: string | null;
  unitate_sanitara?: string | null;
  numar_ondr?: string | null;
  institutie_absolvire?: string | null;
  tip_certificare?: string | null;
  numar_certificare?: string | null;
  verification_document_url?: string | null;
  photo_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  limbi_vorbite?: LanguageCode[];
  website_url?: string | null;
  program_lucru?: string | null;
  grad_profesional?: MedicGrade | null;
  specializari_secundare?: MedicalSpecialization[];
  competente_atestate?: string[];
  specializare_nutritie?: NutritionSpecialization[];
  specializare_sportiva?: SportSpecialization[];
  filosofie_profesionala?: string | null;
  updated_at?: string;
}

export type AuthUserProfile = PatientProfile | SpecialistProfile;

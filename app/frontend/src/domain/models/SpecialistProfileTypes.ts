import type { MedicalSpecialization } from './MedicalSpecialization';
import type { SpecialistProfile } from './UserProfile';
import type { LanguageCode, MedicGrade, NutritionSpecialization, SportSpecialization } from '@/domain/enums/SpecialistEnums';

export interface WorkExperienceEntry {
  id: string;
  specialist_profile_id: string;
  title: string;
  employer: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface EducationEntry {
  id: string;
  specialist_profile_id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  year_completed: number;
  honors: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CertificationEntry {
  id: string;
  specialist_profile_id: string;
  name: string;
  issuing_body: string;
  certification_number: string | null;
  issue_date: string;
  expiry_date: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialistProfileFull extends SpecialistProfile {
  id: string;
  work_experience: WorkExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
}

export interface PublicSpecialistProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization: string | null;
  license_number: string | null;
  clinic_affiliation: string | null;
  verification_status: string | null;
  cod_parafa: string | null;
  unitate_sanitara: string | null;
  numar_ondr: string | null;
  institutie_absolvire: string | null;
  tip_certificare: string | null;
  numar_certificare: string | null;
  photo_url: string | null;
  bio: string | null;
  limbi_vorbite: LanguageCode[];
  website_url: string | null;
  program_lucru: string | null;
  grad_profesional: MedicGrade | null;
  specializari_secundare: MedicalSpecialization[];
  competente_atestate: string[];
  specializare_nutritie: NutritionSpecialization[];
  specializare_sportiva: SportSpecialization[];
  filosofie_profesionala: string | null;
  updated_at: string | null;
  headline: string;
  work_experience: WorkExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
}

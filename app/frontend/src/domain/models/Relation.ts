import type { MedicalSpecialization } from './MedicalSpecialization';

export const RelationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
} as const;

export type RelationStatus = (typeof RelationStatus)[keyof typeof RelationStatus];

export interface Counterparty {
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
  specialization: MedicalSpecialization | null;
  photo_url: string | null;
  headline: string | null;
}

export interface Relation {
  id: string;
  patient_id: string;
  specialist_id: string;
  status: RelationStatus;
  initiated_by: string;
  counterparty: Counterparty | null;
}

export interface PatientCard {
  user_id: string;
  first_name: string;
  last_name: string;
  sex: number;
  date_of_birth: string;
  health_score: number | null;
  last_update: string | null;
  uploaded_at: string | null;
  red_flags: string[];
}

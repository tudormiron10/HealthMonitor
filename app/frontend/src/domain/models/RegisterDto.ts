// Domain DTOs for the registration flow.
// These mirror the Pydantic schemas defined in the backend
// (auth_schemas.py: PatientRegistrationRequest, SpecialistRegistrationRequest).

export interface PatientRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: number;
}

export interface SpecialistRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  specialization?: string;
  license_number?: string;
  clinic_affiliation?: string;
  cod_parafa?: string;
  unitate_sanitara?: string;
  numar_ondr?: string;
  institutie_absolvire?: string;
  tip_certificare?: string;
  numar_certificare?: string;
}

export interface RegistrationResponse {
  message: string;
  user_id: string;
  role: string;
  access_token?: string;
  token_type?: string;
}

export interface MedicalMarkers {
  // Demographics & Anthropometrics
  sex?: number; // 1=Male, 2=Female
  age?: number;
  bmi?: number;
  waist_circumference?: number;
  smoker_status?: number; // 0=No, 1=Yes

  // Vitals
  systolic_bp?: number;
  diastolic_bp?: number;

  // Glycemic
  hba1c?: number;
  fasting_glucose?: number;

  // Lipids
  total_cholesterol?: number;
  hdl?: number;
  ldl?: number;
  triglycerides?: number;

  // Liver & Inflammation
  alt?: number;
  ast?: number;
  ggt?: number;
  crp?: number;

  // Renal
  creatinine?: number;
  urea?: number;
  uacr?: number;
  uric_acid?: number;

  // Hematology & Nutrition
  hemoglobin?: number;
  mcv?: number;
  ferritin?: number;
  vitamin_d?: number;
  folate?: number;
}

export interface MedicalRecordCreate {
  record_date: string; // ISO format YYYY-MM-DD
  markers: MedicalMarkers;
  document_url?: string;
}

export interface MedicalRecordRead {
  id: string;
  patient_id: string;
  record_date: string;
  created_at: string;
  source: string;
  document_url?: string;
  raw_markers: MedicalMarkers;
  markers_access?: Record<string, 'DECRYPTED' | 'LOCKED'>;
}

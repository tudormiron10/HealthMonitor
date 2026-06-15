export interface RegisterFormData {
  role: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: number;
  specialization: string;
  licenseNumber: string;
  clinic: string;
  codParafa: string;
  unitateSanitara: string;
  numarOndr: string;
  institutieAbsolvire: string;
  tipCertificare: string;
  numarCertificare: string;
}

export interface StepProps {
  formData: RegisterFormData;
  updateForm: (updates: Partial<RegisterFormData>) => void;
}

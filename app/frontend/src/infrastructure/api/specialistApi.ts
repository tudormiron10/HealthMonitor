import apiClient from "./apiClient";
import type { PatientCard, Relation } from "@/domain/models/Relation";
import type { MedicalSpecialization } from "@/domain/models/MedicalSpecialization";
import type {
  SpecialistProfileFull,
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
} from "@/domain/models/SpecialistProfileTypes";
import type { LanguageCode, MedicGrade, NutritionSpecialization, SportSpecialization } from "@/domain/enums/SpecialistEnums";

export interface SpecialistResult {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization: MedicalSpecialization | null;
  license_number: string | null;
  clinic_affiliation: string | null;
  photo_url: string | null;
  headline: string;
}

export interface SpecialistSearchParams {
  name?: string;
  specialization?: string;
  page?: number;
  page_size?: number;
}

export interface SpecialistProfileUpdateData {
  first_name?: string;
  last_name?: string;
  specialization?: string;
  license_number?: string;
  clinic_affiliation?: string;
}

export interface SpecialistDetailsUpdate {
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
}

export interface WorkExperienceCreate {
  title: string;
  employer: string;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  display_order?: number;
}

export interface WorkExperienceUpdate {
  title?: string;
  employer?: string;
  location?: string | null;
  start_date?: string;
  end_date?: string | null;
  description?: string | null;
  display_order?: number;
}

export interface EducationCreate {
  institution: string;
  degree: string;
  field_of_study?: string | null;
  year_completed: number;
  honors?: string | null;
  display_order?: number;
}

export interface EducationUpdate {
  institution?: string;
  degree?: string;
  field_of_study?: string | null;
  year_completed?: number;
  honors?: string | null;
  display_order?: number;
}

export interface CertificationCreate {
  name: string;
  issuing_body: string;
  certification_number?: string | null;
  issue_date: string;
  expiry_date?: string | null;
  display_order?: number;
}

export interface CertificationUpdate {
  name?: string;
  issuing_body?: string;
  certification_number?: string | null;
  issue_date?: string;
  expiry_date?: string | null;
  display_order?: number;
}

export const specialistApi = {
  //  Self-profile 

  resubmitVerification: async (): Promise<void> => {
    await apiClient.post('/specialists/me/request-reverification');
  },

  updateProfile: async (data: SpecialistProfileUpdateData): Promise<void> => {
    await apiClient.put('/specialists/me', data);
  },

  getMyFullProfile: async (): Promise<SpecialistProfileFull> => {
    const response = await apiClient.get<SpecialistProfileFull>('/specialists/me');
    return response.data;
  },

  uploadPhoto: async (file: File): Promise<{ photo_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ photo_url: string }>(
      '/specialists/me/photo',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  deletePhoto: async (): Promise<void> => {
    await apiClient.delete('/specialists/me/photo');
  },

  updateDetails: async (payload: SpecialistDetailsUpdate): Promise<SpecialistProfileFull> => {
    const response = await apiClient.put<SpecialistProfileFull>('/specialists/me/details', payload);
    return response.data;
  },

  requestReverification: async (): Promise<void> => {
    await apiClient.post('/specialists/me/request-reverification');
  },

  //  Work experience 

  addWorkExperience: async (payload: WorkExperienceCreate): Promise<WorkExperienceEntry> => {
    const response = await apiClient.post<WorkExperienceEntry>('/specialists/me/work-experience', payload);
    return response.data;
  },

  updateWorkExperience: async (id: string, payload: WorkExperienceUpdate): Promise<WorkExperienceEntry> => {
    const response = await apiClient.patch<WorkExperienceEntry>(`/specialists/me/work-experience/${id}`, payload);
    return response.data;
  },

  deleteWorkExperience: async (id: string): Promise<void> => {
    await apiClient.delete(`/specialists/me/work-experience/${id}`);
  },

  //  Education 

  addEducation: async (payload: EducationCreate): Promise<EducationEntry> => {
    const response = await apiClient.post<EducationEntry>('/specialists/me/education', payload);
    return response.data;
  },

  updateEducation: async (id: string, payload: EducationUpdate): Promise<EducationEntry> => {
    const response = await apiClient.patch<EducationEntry>(`/specialists/me/education/${id}`, payload);
    return response.data;
  },

  deleteEducation: async (id: string): Promise<void> => {
    await apiClient.delete(`/specialists/me/education/${id}`);
  },

  //  Certifications 

  addCertification: async (payload: CertificationCreate): Promise<CertificationEntry> => {
    const response = await apiClient.post<CertificationEntry>('/specialists/me/certifications', payload);
    return response.data;
  },

  updateCertification: async (id: string, payload: CertificationUpdate): Promise<CertificationEntry> => {
    const response = await apiClient.patch<CertificationEntry>(`/specialists/me/certifications/${id}`, payload);
    return response.data;
  },

  deleteCertification: async (id: string): Promise<void> => {
    await apiClient.delete(`/specialists/me/certifications/${id}`);
  },

  //  Patients & requests 

  getMyPatients: async (): Promise<PatientCard[]> => {
    const response = await apiClient.get<PatientCard[]>("/specialists/my-patients");
    return response.data;
  },

  getPendingRequests: async (): Promise<Relation[]> => {
    const response = await apiClient.get<Relation[]>("/specialists/pending-requests");
    return response.data;
  },

  search: async (params: SpecialistSearchParams): Promise<SpecialistResult[]> => {
    const response = await apiClient.get<SpecialistResult[]>("/specialists/search", { params });
    return response.data;
  },
};

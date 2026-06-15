import apiClient from "./apiClient";
import type { MedicalRecordCreate, MedicalRecordRead, MedicalMarkers } from "@/domain/models/MedicalRecord";

export interface ParsedPDFResponse {
  document_url: string;
  extracted_markers: MedicalMarkers;
}

export const recordsApi = {
  createManualRecord: async (data: MedicalRecordCreate): Promise<MedicalRecordRead> => {
    const response = await apiClient.post<MedicalRecordRead>("/records/manual-entry", data);
    return response.data;
  },

  uploadPdf: async (file: File): Promise<ParsedPDFResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ParsedPDFResponse>("/records/upload-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getMyRecords: async (): Promise<MedicalRecordRead[]> => {
    const response = await apiClient.get<MedicalRecordRead[]>("/records/my-records");
    return response.data;
  },

  getRecord: async (recordId: string): Promise<MedicalRecordRead> => {
    const response = await apiClient.get<MedicalRecordRead>(`/records/${recordId}`);
    return response.data;
  },

  getRecordAsSpecialist: async (recordId: string): Promise<MedicalRecordRead> => {
    const response = await apiClient.get<MedicalRecordRead>(`/records/${recordId}/specialist`);
    return response.data;
  },

  getPatientRecords: async (patientUserId: string): Promise<MedicalRecordRead[]> => {
    const response = await apiClient.get<MedicalRecordRead[]>(`/records/patient/${patientUserId}`);
    return response.data;
  },
};

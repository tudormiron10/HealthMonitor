import apiClient from "./apiClient";

export interface ModelAResult {
  probability: number;
  predicted_class: number;
  label: string;
}

export interface ConditionPrediction {
  probability: number | null;
  predicted_class: number | null;
  label: string | null;
  error: string | null;
  decisive_marker_present?: boolean;
  model_a?: ModelAResult;
}

export interface PredictionRead {
  id: string;
  medical_record_id: string;
  model_version: string;
  health_score: number;
  metrics: Record<string, ConditionPrediction>;
}

export const predictionsApi = {
  // Get existing predictions for a record
  getRecordPredictions: async (recordId: string): Promise<PredictionRead[]> => {
    const response = await apiClient.get<PredictionRead[]>(`/predictions/record/${recordId}`);
    return response.data;
  },

  getRecordPredictionsAsSpecialist: async (recordId: string): Promise<PredictionRead[]> => {
    const response = await apiClient.get<PredictionRead[]>(`/predictions/record/${recordId}/specialist`);
    return response.data;
  },

  // Run predictions pipeline for a record (creates new predictions)
  runPredictions: async (recordId: string): Promise<PredictionRead> => {
    const response = await apiClient.post<PredictionRead>(`/predictions/run/${recordId}`);
    return response.data;
  },

  getMyHistory: async (): Promise<PredictionRead[]> => {
    const response = await apiClient.get<PredictionRead[]>("/predictions/history/me");
    return response.data;
  },

  getPatientHistory: async (patientUserId: string): Promise<PredictionRead[]> => {
    const response = await apiClient.get<PredictionRead[]>(`/predictions/history/patient/${patientUserId}`);
    return response.data;
  },

  downloadReport: async (predictionId: string, lang: string = "ro"): Promise<void> => {
    const response = await apiClient.get(`/predictions/${predictionId}/report`, {
      params: { lang },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `healthmonitor_report_${predictionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

import apiClient from './apiClient';

export interface AccessRequestRead {
  id: string;
  conversation_id: string;
  specialist_user_id: string;
  patient_user_id: string;
  requested_markers: string[];
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  created_at: string;
}

export const accessRequestsApi = {
  getEffectiveAccess: async (
    patientUserId: string,
  ): Promise<Record<string, 'DECRYPTED' | 'LOCKED'>> => {
    const res = await apiClient.get<Record<string, 'DECRYPTED' | 'LOCKED'>>(
      `/access-requests/effective-access/${patientUserId}`,
    );
    return res.data;
  },

  createRequest: async (
    conversationId: string,
    requestedMarkers: string[],
    justification: string,
  ): Promise<AccessRequestRead> => {
    const res = await apiClient.post<AccessRequestRead>('/access-requests', {
      conversation_id: conversationId,
      requested_markers: requestedMarkers,
      justification,
    });
    return res.data;
  },

  respondToRequest: async (
    requestId: string,
    action: 'approve' | 'decline',
    approvedMarkers?: string[],
  ): Promise<AccessRequestRead> => {
    const res = await apiClient.patch<AccessRequestRead>(`/access-requests/${requestId}`, {
      action,
      approved_markers: action === 'approve' ? approvedMarkers : undefined,
    });
    return res.data;
  },
};

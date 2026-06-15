import apiClient from './apiClient';

export interface Plan {
  message_id: string;
  conversation_id: string;
  plan_type: 'MEAL_PLAN' | 'WORKOUT_PLAN';
  title: string;
  content: string;
  sender_user_id: string;
  sender_name: string;
  patient_user_id: string;
  sent_at: string;
  is_archived: boolean;
}

export const plansApi = {
  getMyPlans: async (includeArchived = false): Promise<Plan[]> => {
    const res = await apiClient.get<Plan[]>('/plans/my', {
      params: { include_archived: includeArchived },
    });
    return res.data;
  },

  getSentPlans: async (includeArchived = false): Promise<Plan[]> => {
    const res = await apiClient.get<Plan[]>('/plans/sent', {
      params: { include_archived: includeArchived },
    });
    return res.data;
  },

  archivePlan: async (messageId: string): Promise<void> => {
    await apiClient.patch(`/plans/${messageId}/archive`);
  },

  unarchivePlan: async (messageId: string): Promise<void> => {
    await apiClient.patch(`/plans/${messageId}/unarchive`);
  },

  downloadPdf: async (messageId: string, lang: 'ro' | 'en' = 'ro'): Promise<void> => {
    const response = await apiClient.get(`/plans/${messageId}/pdf`, {
      params: { lang },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthmonitor_plan_${messageId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

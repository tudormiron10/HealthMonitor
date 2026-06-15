import apiClient from './apiClient';
import type { Conversation, UnreadSummary } from '@/domain/models/Conversation';
import type { Message } from '@/domain/models/Message';

export const chatApi = {
  openOrCreateConversation: async (counterpartyUserId: string): Promise<Conversation> => {
    const res = await apiClient.post<Conversation>('/conversations/', {
      counterparty_user_id: counterpartyUserId,
    });
    return res.data;
  },

  listConversations: async (): Promise<Conversation[]> => {
    const res = await apiClient.get<Conversation[]>('/conversations/');
    return res.data;
  },

  getMessages: async (conversationId: string, sinceMessageId?: string): Promise<Message[]> => {
    const params = sinceMessageId ? { since_message_id: sinceMessageId } : undefined;
    const res = await apiClient.get<Message[]>(`/conversations/${conversationId}/messages`, { params });
    return res.data;
  },

  markRead: async (conversationId: string): Promise<void> => {
    await apiClient.patch(`/conversations/${conversationId}/read`);
  },

  getUnreadSummary: async (): Promise<UnreadSummary> => {
    const res = await apiClient.get<UnreadSummary>('/conversations/unread-summary');
    return res.data;
  },

  sendPlan: async (
    conversationId: string,
    planType: 'MEAL_PLAN' | 'WORKOUT_PLAN',
    title: string,
    content: string,
  ): Promise<Message> => {
    const res = await apiClient.post<Message>(`/conversations/${conversationId}/plan`, {
      plan_type: planType,
      title,
      content,
    });
    return res.data;
  },
};

import apiClient from './apiClient';
import type { PlatformStats, UserAdmin, SpecialistPending } from '@/domain/models/AdminTypes';

export interface ListUsersParams {
  role?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export const adminApi = {
  getStats: async (): Promise<PlatformStats> => {
    const response = await apiClient.get<PlatformStats>('/admin/stats');
    return response.data;
  },

  listUsers: async (params?: ListUsersParams): Promise<UserAdmin[]> => {
    const response = await apiClient.get<UserAdmin[]>('/admin/users', { params });
    return response.data;
  },

  toggleUserActive: async (userId: string): Promise<UserAdmin> => {
    const response = await apiClient.patch<UserAdmin>(`/admin/users/${userId}/toggle-active`);
    return response.data;
  },

  getPendingSpecialists: async (): Promise<SpecialistPending[]> => {
    const response = await apiClient.get<SpecialistPending[]>('/admin/specialists/pending');
    return response.data;
  },

  approveSpecialist: async (userId: string): Promise<void> => {
    await apiClient.post(`/admin/specialists/${userId}/approve`);
  },

  rejectSpecialist: async (userId: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/specialists/${userId}/reject`, { reason });
  },

  getSpecialistProfile: async (userId: string): Promise<SpecialistPending> => {
    const response = await apiClient.get<SpecialistPending>(`/admin/specialists/${userId}/profile`);
    return response.data;
  },
};

import apiClient from './apiClient';
import type { AuthUserProfile } from '@/domain/models';

export const getMyProfile = async (role: string): Promise<AuthUserProfile> => {
  if (role === 'ADMIN') {
    return {
      id: 'admin-id',
      user_id: 'admin-user-id',
      first_name: 'Administrator',
      last_name: 'Sistem',
    } as unknown as AuthUserProfile;
  }
  const endpoint = role === 'PATIENT' ? '/patients/me' : '/specialists/me';
  const response = await apiClient.get<AuthUserProfile>(endpoint);
  return response.data;
};

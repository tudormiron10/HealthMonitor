import apiClient from './apiClient';
import type {
  PatientRegistrationData,
  SpecialistRegistrationData,
  RegistrationResponse,
  LoginResponse,
} from '@/domain/models';

export const registerPatient = async (
  data: PatientRegistrationData
): Promise<RegistrationResponse> => {
  const response = await apiClient.post<RegistrationResponse>('/auth/register/patient', data);
  return response.data;
};

export const registerSpecialist = async (
  data: SpecialistRegistrationData
): Promise<RegistrationResponse> => {
  const response = await apiClient.post<RegistrationResponse>('/auth/register/specialist', data);
  return response.data;
};

export const uploadVerificationDocument = async (file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  await apiClient.post('/auth/specialist/upload-verification-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const requestPasswordReset = async (email: string, lang: string): Promise<void> => {
  await apiClient.post('/auth/forgot-password', { email }, {
    headers: { 'Accept-Language': lang },
  });
};

export const verifyResetToken = async (token: string): Promise<boolean> => {
  const response = await apiClient.get<{ valid: boolean }>('/auth/reset-password/verify', {
    params: { token },
  });
  return response.data.valid;
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
};

export const loginUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

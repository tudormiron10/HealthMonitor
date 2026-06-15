import { useState } from 'react';
import { registerPatient, registerSpecialist } from '@/infrastructure';
import { tokenStorage } from '@/infrastructure/storage/tokenStorage';
import type { PatientRegistrationData, SpecialistRegistrationData } from '@/domain/models';

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitPatientRegistration = async (data: PatientRegistrationData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await registerPatient(data);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || 'An error occurred during registration.'
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const submitSpecialistRegistration = async (data: SpecialistRegistrationData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await registerSpecialist(data);
      if (result.access_token) {
        tokenStorage.setToken(result.access_token);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || 'An error occurred during registration.'
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    success,
    submitPatientRegistration,
    submitSpecialistRegistration,
  };
};

import { useState } from 'react';
import { loginUser } from '@/infrastructure';
import { useAuth } from '@/application/hooks/useAuth';
import { validateToken } from '@/application/utils/tokenValidator';

export const useLogin = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLogin = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await loginUser(email, password);
      login(response.access_token);
      const { role } = validateToken(response.access_token);
      return role;
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.response?.data?.error || err.message || 'An error occurred during login.'
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    submitLogin,
  };
};

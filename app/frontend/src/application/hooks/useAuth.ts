import { useContext } from 'react';
import type { AuthContextType } from '@/domain/models';
import { AuthContext } from '@/application/contexts/AuthContext';

// Custom hook for consuming auth state.
// Must be used within an AuthProvider.
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

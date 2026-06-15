import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthContextType, AuthUserProfile } from '@/domain/models';
import { validateToken } from '@/application/utils/tokenValidator';
import { tokenStorage } from '@/infrastructure/storage/tokenStorage';
import { getMyProfile } from '@/infrastructure/api/userApi';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState(() => {
    const initial = validateToken(tokenStorage.getToken());
    return { ...initial, profile: null as AuthUserProfile | null };
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (authState.token && authState.role && !authState.profile) {
        setIsLoadingProfile(true);
        try {
          const profile = await getMyProfile(authState.role);
          setAuthState(prev => ({ ...prev, profile }));
        } catch (error) {
          console.error("Failed to load user profile:", error);
          if ((error as any)?.response?.status === 401) {
             logout();
          }
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };
    fetchProfile();
  }, [authState.token, authState.role, authState.profile]);

  const login = (newToken: string) => {
    tokenStorage.setToken(newToken);
    setAuthState({ ...validateToken(newToken), profile: null });
  };

  const logout = () => {
    tokenStorage.removeToken();
    setAuthState({ token: null, role: null, userId: null, profile: null });
  };

  const refreshProfile = () => {
    setAuthState(prev => ({ ...prev, profile: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        token: authState.token,
        role: authState.role,
        userId: authState.userId,
        profile: authState.profile,
        login,
        logout,
        refreshProfile,
        isAuthenticated: !!authState.token,
        isLoadingProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

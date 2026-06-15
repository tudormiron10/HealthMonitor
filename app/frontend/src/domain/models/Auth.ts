// Domain model for authentication-related types.
// These mirror the JWT payload structure from the backend.

import type { AuthUserProfile } from './UserProfile';

export interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

export interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  profile: AuthUserProfile | null;
}

export interface AuthContextType {
  token: string | null;
  role: string | null;
  userId: string | null;
  profile: AuthUserProfile | null;
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => void;
  isAuthenticated: boolean;
  isLoadingProfile: boolean;
}

import { jwtDecode } from 'jwt-decode';
import type { JwtPayload, AuthState } from '@/domain/models';

// Validates a JWT token and extracts auth state from it.
// Returns null-state if the token is missing, expired, or malformed.
export const validateToken = (token: string | null): Omit<AuthState, 'profile'> => {
  if (!token) return { token: null, role: null, userId: null };

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (decoded.exp * 1000 < Date.now()) {
      return { token: null, role: null, userId: null };
    }
    return { token, role: decoded.role, userId: decoded.sub };
  } catch {
    return { token: null, role: null, userId: null };
  }
};

export { AuthProvider, AuthContext } from './contexts/AuthContext';
export { useAuth } from './hooks/useAuth';
export { useRegister } from './hooks/useRegister';
export { useLogin } from './hooks/useLogin';
export { validateToken } from './utils/tokenValidator';
export { computeProfileCompletion } from './utils/profileCompletion';
export type {
  ProfileCompletionAction,
  ProfileCompletionTier,
  ProfileCompletionResult,
} from './utils/profileCompletion';

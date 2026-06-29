export { default as apiClient } from './api/apiClient';
export { getMyProfile } from './api/userApi';
export { registerPatient, registerSpecialist, loginUser, uploadVerificationDocument, requestPasswordReset, verifyResetToken, resetPassword } from './api/authApi';
export { tokenStorage } from './storage/tokenStorage';
export { specialistApi } from './api/specialistApi';
export { publicSpecialistApi } from './api/publicSpecialistApi';
export type {
  SpecialistResult,
  SpecialistSearchParams,
  SpecialistDetailsUpdate,
  WorkExperienceCreate,
  WorkExperienceUpdate,
  EducationCreate,
  EducationUpdate,
  CertificationCreate,
  CertificationUpdate,
} from './api/specialistApi';

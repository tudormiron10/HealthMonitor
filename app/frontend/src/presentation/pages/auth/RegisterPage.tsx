import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRole } from '@/domain';
import { useRegister } from '@/application';
import { Button } from '@/presentation/components/ui/Button';

import type { RegisterFormData } from './types';
import { Step1Credentials } from './components/Step1Credentials';
import { Step2PatientDetails } from './components/Step2PatientDetails';
import { Step2SpecialistDetails } from './components/Step2SpecialistDetails';
import { RegistrationSuccess } from './components/RegistrationSuccess';
import { VerificationDocumentUpload } from './components/VerificationDocumentUpload';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const { isLoading, error, success, submitPatientRegistration, submitSpecialistRegistration } = useRegister();

  const [step, setStep] = useState<1 | 2>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<'none' | 'upload' | 'pending'>('none');

  const [formData, setFormData] = useState<RegisterFormData>({
    role: UserRole.PATIENT,
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    sex: 1,
    specialization: '',
    licenseNumber: '',
    clinic: '',
    codParafa: '',
    unitateSanitara: '',
    numarOndr: '',
    institutieAbsolvire: '',
    tipCertificare: '',
    numarCertificare: '',
  });

  const updateForm = (updates: Partial<RegisterFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNextStep = () => {
    setValidationError(null);
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setValidationError(t('register.errors.missingFields'));
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError(t('register.errors.passwordMismatch'));
      return;
    }
    if (formData.password.length < 8) {
      setValidationError(t('register.errors.passwordLength'));
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    try {
      if (formData.role === UserRole.PATIENT) {
        if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
          setValidationError(t('register.errors.missingFields'));
          return;
        }
        await submitPatientRegistration({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          sex: formData.sex,
        });
      } else {
        if (formData.role === UserRole.DOCTOR) {
          if (!formData.firstName || !formData.lastName || !formData.specialization || !formData.codParafa || !formData.unitateSanitara) {
            setValidationError(t('register.errors.missingFields'));
            return;
          }
        } else if (formData.role === UserRole.NUTRITIONIST) {
          if (!formData.firstName || !formData.lastName || !formData.institutieAbsolvire) {
            setValidationError(t('register.errors.missingFields'));
            return;
          }
        } else if (formData.role === UserRole.COACH) {
          if (!formData.firstName || !formData.lastName || !formData.tipCertificare || !formData.numarCertificare) {
            setValidationError(t('register.errors.missingFields'));
            return;
          }
        }

        await submitSpecialistRegistration({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role,
          specialization: formData.specialization || undefined,
          license_number: formData.licenseNumber || undefined,
          clinic_affiliation: formData.clinic || undefined,
          cod_parafa: formData.codParafa || undefined,
          unitate_sanitara: formData.unitateSanitara || undefined,
          numar_ondr: formData.numarOndr || undefined,
          institutie_absolvire: formData.institutieAbsolvire || undefined,
          tip_certificare: formData.tipCertificare || undefined,
          numar_certificare: formData.numarCertificare || undefined,
        });
        setUploadStep('upload');
      }
    } catch (_err) {
      // API errors are handled by the useRegister hook
    }
  };

  const getSubtitle = () => {
    if (uploadStep === 'upload') return t('register.subtitleStep3');
    return step === 1 ? t('register.subtitleStep1') : t('register.subtitleStep2');
  };

  return (
    <div className="relative group animate-fade-in w-full">
      {/* Biometrics glow effect */}
      <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 via-accent/10 to-secondary/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

      {/* Glassmorphism Card */}
      <div className="relative bg-brand-light/90 border border-brand-light p-6 md:p-8 rounded-4xl shadow-2xl backdrop-blur-sm">

        {/* Header */}
        {uploadStep !== 'pending' && (
          <div className="mb-5 border-b border-brand-light/50 pb-3 text-center">
            <h2 className="text-5xl font-heading text-primary tracking-tighter drop-shadow-sm uppercase">
              {t('register.title')}
            </h2>
            <p className="text-brand-dark/50 font-heading tracking-widest text-sm font-bold opacity-60">
              {getSubtitle()}
            </p>
          </div>
        )}

        {/* Error banner */}
        {uploadStep === 'none' && (error || validationError) && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-l-red-500 border-red-200 text-red-600 rounded-lg text-sm shadow-sm font-medium">
            {validationError || error}
          </div>
        )}

        {/* Steps 1 + 2 form */}
        {uploadStep === 'none' && !success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <Step1Credentials
                formData={formData}
                updateForm={updateForm}
                onNext={handleNextStep}
              />
            )}
            {step === 2 && formData.role === UserRole.PATIENT && (
              <Step2PatientDetails
                formData={formData}
                updateForm={updateForm}
                onBack={() => setStep(1)}
                isLoading={isLoading}
              />
            )}
            {step === 2 && formData.role !== UserRole.PATIENT && (
              <Step2SpecialistDetails
                formData={formData}
                updateForm={updateForm}
                onBack={() => setStep(1)}
                isLoading={isLoading}
              />
            )}
          </form>
        )}

        {/* Patient registration success */}
        {uploadStep === 'none' && success && <RegistrationSuccess />}

        {/* Document upload step */}
        {uploadStep === 'upload' && (
          <VerificationDocumentUpload
            onUploadSuccess={() => setUploadStep('pending')}
            onSkip={() => setUploadStep('pending')}
          />
        )}

        {/* Verification pending success */}
        {uploadStep === 'pending' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-5xl font-heading text-primary tracking-tighter mb-2">
              {t('register.verificationPending.title')}
            </h2>
            <p className="text-brand-dark/70 text-lg">
              {t('register.verificationPending.message')}
            </p>
            <Button onClick={() => window.location.href = '/login'} className="w-full mt-4">
              {t('register.verificationPending.loginButton')}
            </Button>
          </div>
        )}

        {/* Footer link */}
        {uploadStep === 'none' && !success && (
          <div className="mt-6 text-center pt-5 border-t border-brand-light/40">
            <p className="text-brand-dark/60 text-sm font-medium">
              {t('register.haveAccount')}{' '}
              <a href="/login" className="text-primary font-bold hover:underline">
                {t('register.loginLink')}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;

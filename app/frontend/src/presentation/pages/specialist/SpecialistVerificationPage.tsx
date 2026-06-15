import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, XCircle } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { useChatContext } from '@/application/hooks/useChatContext';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { uploadVerificationDocument } from '@/infrastructure/api/authApi';
import { Button } from '@/presentation/components/ui/Button';
import { Input } from '@/presentation/components/ui/Input';
import { DocumentLink } from '@/presentation/components/ui/DocumentLink';
import { VerificationDocumentUpload } from '@/presentation/pages/auth/components/VerificationDocumentUpload';
import type { SpecialistProfile } from '@/domain/models/UserProfile';

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 mb-1">{label}</p>
      <p className="text-brand-dark font-medium">{value}</p>
    </div>
  );
}

export const SpecialistVerificationPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile, role, refreshProfile } = useAuth();
  const { latestVerificationEvent, clearVerificationEvent } = useChatContext();
  const sp = profile as SpecialistProfile | null;

  const [localStatus, setLocalStatus] = useState<'pending' | null>(null);

  useEffect(() => {
    if (latestVerificationEvent) {
      refreshProfile();
      clearVerificationEvent();
    }
  }, [latestVerificationEvent, refreshProfile, clearVerificationEvent]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [firstName, setFirstName] = useState(sp?.first_name ?? '');
  const [lastName, setLastName] = useState(sp?.last_name ?? '');
  const [licenseNumber, setLicenseNumber] = useState(sp?.license_number ?? '');
  const [clinicAffiliation, setClinicAffiliation] = useState(sp?.clinic_affiliation ?? '');

  const effectiveStatus = localStatus === 'pending' ? 'PENDING_VERIFICATION' : sp?.verification_status;

  if (!sp) return null;

  if (effectiveStatus === 'APPROVED') {
    return <Navigate to="/dashboard/specialist" replace />;
  }

  const handleResubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await specialistApi.updateProfile({
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        license_number: licenseNumber || undefined,
        clinic_affiliation: clinicAffiliation || undefined,
      });
      if (selectedFile) {
        await uploadVerificationDocument(selectedFile);
      }
      await specialistApi.resubmitVerification();
      setLocalStatus('pending');
    } catch (err: any) {
      setError(err.response?.data?.detail || t('specialistVerification.errors.resubmitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (effectiveStatus === 'PENDING_VERIFICATION') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-6 flex gap-4">
          <Clock className="w-6 h-6 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="text-2xl font-heading text-accent mb-1">{t('specialistVerification.pendingTitle')}</h2>
            <p className="text-brand-dark/70">{t('specialistVerification.pendingMessage')}</p>
          </div>
        </div>

        <div className="bg-white/80 border border-brand-light rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-heading text-brand-dark border-b border-brand-light/50 pb-2">
            {t('specialistVerification.credentialsSection')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('register.fields.firstName')} value={sp.first_name} />
            <Field label={t('register.fields.lastName')} value={sp.last_name} />
            <Field label={t('register.fields.specialization')} value={sp.specialization} />
            <Field label={t('register.fields.licenseNumber')} value={sp.license_number} />
            <Field label={t('register.fields.clinic')} value={sp.clinic_affiliation} />
            {role === 'DOCTOR' && (
              <>
                <Field label={t('register.fields.codParafa')} value={sp.cod_parafa} />
                <Field label={t('register.fields.unitateSanitara')} value={sp.unitate_sanitara} />
              </>
            )}
            {role === 'NUTRITIONIST' && (
              <>
                <Field label={t('register.fields.numarOndr')} value={sp.numar_ondr} />
                <Field label={t('register.fields.institutieAbsolvire')} value={sp.institutie_absolvire} />
              </>
            )}
            {role === 'COACH' && (
              <>
                <Field label={t('register.fields.tipCertificare')} value={sp.tip_certificare} />
                <Field label={t('register.fields.numarCertificare')} value={sp.numar_certificare} />
              </>
            )}
          </div>
          {sp.verification_document_url && (
            <div className="pt-2 border-t border-brand-light/50">
              <p className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 mb-1">
                {t('specialistVerification.documentSection')}
              </p>
              <DocumentLink path={sp.verification_document_url} className="text-sm text-accent font-medium hover:underline">
                {sp.verification_document_url.split('/').pop()}
              </DocumentLink>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6 flex gap-4">
        <XCircle className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-2xl font-heading text-secondary mb-1">{t('specialistVerification.rejectedTitle')}</h2>
          {sp.rejection_reason && (
            <p className="text-brand-dark/70">
              {t('specialistVerification.rejectedReason', { reason: sp.rejection_reason })}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white/80 border border-brand-light rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-heading text-brand-dark border-b border-brand-light/50 pb-2">
          {t('specialistVerification.credentialsSection')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('register.fields.firstName')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label={t('register.fields.lastName')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          {role !== 'DOCTOR' && (
            <>
              <Input
                label={t('register.fields.licenseNumber')}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
              <Input
                label={t('register.fields.clinic')}
                value={clinicAffiliation}
                onChange={(e) => setClinicAffiliation(e.target.value)}
              />
            </>
          )}
        </div>

        {(role === 'DOCTOR' || role === 'NUTRITIONIST' || role === 'COACH') && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand-light/50">
            {role === 'DOCTOR' && (
              <>
                <Field label={t('register.fields.codParafa')} value={sp.cod_parafa} />
                <Field label={t('register.fields.unitateSanitara')} value={sp.unitate_sanitara} />
              </>
            )}
            {role === 'NUTRITIONIST' && (
              <>
                <Field label={t('register.fields.numarOndr')} value={sp.numar_ondr} />
                <Field label={t('register.fields.institutieAbsolvire')} value={sp.institutie_absolvire} />
              </>
            )}
            {role === 'COACH' && (
              <>
                <Field label={t('register.fields.tipCertificare')} value={sp.tip_certificare} />
                <Field label={t('register.fields.numarCertificare')} value={sp.numar_certificare} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white/80 border border-brand-light rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-heading text-brand-dark border-b border-brand-light/50 pb-2">
          {t('specialistVerification.documentSection')}
        </h3>
        <VerificationDocumentUpload onFileSelected={setSelectedFile} />
      </div>

      <Button onClick={handleResubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('specialistVerification.resubmitLoading') : t('specialistVerification.resubmitButton')}
      </Button>
    </div>
  );
};

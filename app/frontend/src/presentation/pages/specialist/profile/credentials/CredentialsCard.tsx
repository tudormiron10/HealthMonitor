import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { UserRole } from '@/domain/enums/UserRole';
import type { SpecialistProfileFull } from '@/domain/models/SpecialistProfileTypes';
import { useAuth } from '@/application/hooks/useAuth';
import { DocumentLink } from '@/presentation/components/ui/DocumentLink';

interface Props {
  profile: SpecialistProfileFull;
}

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  notProvided: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, notProvided }) => (
  <div>
    <p className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 mb-0.5">
      {label}
    </p>
    <p className={`text-sm ${value ? 'text-brand-dark' : 'text-brand-dark/30 italic'}`}>
      {value || notProvided}
    </p>
  </div>
);

export const CredentialsCard: React.FC<Props> = ({ profile }) => {
  const { t } = useTranslation();
  const { role } = useAuth();

  const notProvided = t('specialistProfile.credentials.notProvided');

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-dark/10">
        <h3 className="text-lg font-heading text-brand-dark">
          {t('specialistProfile.credentials.sectionTitle')}
        </h3>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Role-specific read-only fields */}
        {role === UserRole.DOCTOR && (
          <>
            <FieldRow
              label={t('specialistProfile.credentials.codParafaLabel')}
              value={profile.cod_parafa}
              notProvided={notProvided}
            />
            <FieldRow
              label={t('specialistProfile.credentials.unitateSanitaraLabel')}
              value={profile.unitate_sanitara}
              notProvided={notProvided}
            />
          </>
        )}
        {role === UserRole.NUTRITIONIST && (
          <>
            <FieldRow
              label={t('specialistProfile.credentials.numarOndrLabel')}
              value={profile.numar_ondr}
              notProvided={notProvided}
            />
            <FieldRow
              label={t('specialistProfile.credentials.institutieAbsolvireLabel')}
              value={profile.institutie_absolvire}
              notProvided={notProvided}
            />
          </>
        )}
        {role === UserRole.COACH && (
          <>
            <FieldRow
              label={t('specialistProfile.credentials.tipCertificareLabel')}
              value={profile.tip_certificare}
              notProvided={notProvided}
            />
            <FieldRow
              label={t('specialistProfile.credentials.numarCertificareLabel')}
              value={profile.numar_certificare}
              notProvided={notProvided}
            />
          </>
        )}

        {/* Verification document link */}
        {profile.verification_document_url && (
          <DocumentLink
            path={profile.verification_document_url}
            className="inline-flex items-center gap-1.5 text-xs text-accent font-bold hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {t('specialistProfile.credentials.documentLink')}
          </DocumentLink>
        )}
      </div>
    </div>
  );
};

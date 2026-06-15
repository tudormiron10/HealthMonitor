import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle2 } from 'lucide-react';

interface Props {
  inferredRole: 'DOCTOR' | 'NUTRITIONIST' | 'COACH';
  cod_parafa: string | null;
  numar_ondr: string | null;
  numar_certificare: string | null;
}

export const PublicCredentialsSection: React.FC<Props> = ({
  inferredRole,
  cod_parafa,
  numar_ondr,
  numar_certificare,
}) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-accent shrink-0" />
        <h2 className="font-heading text-lg text-brand-dark">{t('publicProfile.credentialsTitle')}</h2>
      </div>
      <div className="space-y-3">
        {inferredRole === 'DOCTOR' && cod_parafa && (
          <CredentialRow
            label={t('specialistProfile.credentials.codParafaLabel')}
            value={cod_parafa}
          />
        )}
        {inferredRole === 'NUTRITIONIST' && numar_ondr && (
          <CredentialRow
            label={t('specialistProfile.credentials.numarOndrLabel')}
            value={numar_ondr}
          />
        )}
        {inferredRole === 'COACH' && numar_certificare && (
          <CredentialRow
            label={t('specialistProfile.credentials.numarCertificareLabel')}
            value={numar_certificare}
          />
        )}
      </div>
    </section>
  );
};

function CredentialRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest">{label}</p>
        <p className="text-sm text-brand-dark font-mono">{value}</p>
        <p className="text-xs text-accent">{t('publicProfile.verifiedCredential')}</p>
      </div>
    </div>
  );
}

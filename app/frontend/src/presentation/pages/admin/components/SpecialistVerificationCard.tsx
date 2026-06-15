import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, ExternalLink } from 'lucide-react';
import type { SpecialistPending, UserRole } from '@/domain/models/AdminTypes';
import { DocumentLink } from '@/presentation/components/ui/DocumentLink';

function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useTranslation();
  const colorMap: Record<string, string> = {
    DOCTOR:       'bg-primary/15 text-primary',
    NUTRITIONIST: 'bg-amber-100 text-amber-700',
    COACH:        'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${colorMap[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`adminDashboard.users.roles.${role}`)}
    </span>
  );
}

function CredentialField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-brand-dark/40 mb-0.5">{label}</p>
      <p className="text-sm text-brand-dark font-medium">{value}</p>
    </div>
  );
}

interface Props {
  specialist: SpecialistPending;
  fading: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export const SpecialistVerificationCard: React.FC<Props> = ({ specialist, fading, onApprove, onReject }) => {
  const { t } = useTranslation();
  const fullName = `${specialist.first_name} ${specialist.last_name}`.trim() || specialist.email;
  const initials = `${specialist.first_name?.[0] ?? ''}${specialist.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div
      className={`bg-white/70 border border-brand-dark/10 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${
        fading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-brand-dark/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-brand-dark">{fullName}</p>
            <p className="text-xs text-brand-dark/50">{specialist.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={specialist.role} />
          <span className="text-xs text-brand-dark/40 hidden sm:inline">
            {new Date(specialist.created_at).toLocaleDateString('ro-RO')}
          </span>
        </div>
      </div>

      {/* Credentials */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <CredentialField label={t('register.fields.specialization')}      value={specialist.specialization} />
          <CredentialField label={t('register.fields.licenseNumber')}       value={specialist.license_number} />
          <CredentialField label={t('register.fields.clinic')}              value={specialist.clinic_affiliation} />
          <CredentialField label={t('register.fields.codParafa')}           value={specialist.cod_parafa} />
          <CredentialField label={t('register.fields.unitateSanitara')}     value={specialist.unitate_sanitara} />
          <CredentialField label={t('register.fields.numarOndr')}           value={specialist.numar_ondr} />
          <CredentialField label={t('register.fields.institutieAbsolvire')} value={specialist.institutie_absolvire} />
          <CredentialField label={t('register.fields.tipCertificare')}      value={specialist.tip_certificare} />
          <CredentialField label={t('register.fields.numarCertificare')}    value={specialist.numar_certificare} />
        </div>

        {specialist.verification_document_url && (
          <DocumentLink
            path={specialist.verification_document_url}
            className="inline-flex items-center gap-1.5 mt-4 text-xs text-accent font-bold hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('adminDashboard.users.expand.documentLink')}
          </DocumentLink>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-3 bg-brand-light/30 border-t border-brand-dark/10 flex justify-end gap-2">
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold uppercase tracking-wide transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t('adminDashboard.verification.reject')}
        </button>
        <button
          onClick={onApprove}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold uppercase tracking-wide transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {t('adminDashboard.verification.approve')}
        </button>
      </div>
    </div>
  );
};

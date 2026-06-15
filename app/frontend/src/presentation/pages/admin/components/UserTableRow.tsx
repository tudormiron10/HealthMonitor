import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DocumentLink } from '@/presentation/components/ui/DocumentLink';
import { adminApi } from '@/infrastructure/api/adminApi';
import type { UserAdmin, SpecialistPending } from '@/domain/models/AdminTypes';

const SPECIALIST_ROLES = ['DOCTOR', 'NUTRITIONIST', 'COACH'];

type Details = SpecialistPending | 'loading' | 'error';

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const colorMap: Record<string, string> = {
    PATIENT:      'bg-accent/15 text-accent',
    DOCTOR:       'bg-primary/15 text-primary',
    NUTRITIONIST: 'bg-amber-100 text-amber-700',
    COACH:        'bg-purple-100 text-purple-700',
    ADMIN:        'bg-brand-dark/15 text-brand-dark',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${colorMap[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`adminDashboard.users.roles.${role}`)}
    </span>
  );
}

function VerificationBadge({ status }: { status?: string | null }) {
  const { t } = useTranslation();
  if (!status) return null;
  const colorMap: Record<string, string> = {
    PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
    APPROVED:             'bg-green-100 text-green-700',
    REJECTED:             'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`adminDashboard.users.verificationStatuses.${status}`)}
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
  user: UserAdmin;
  onToggleRequest: (user: UserAdmin) => void;
}

export const UserTableRow: React.FC<Props> = ({ user, onToggleRequest }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);

  const isSpecialist = SPECIALIST_ROLES.includes(user.role);
  const fullName = `${user.first_name} ${user.last_name}`.trim() || '—';

  const handleRowClick = async () => {
    if (!isSpecialist) return;
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (details !== null) return;
    setDetails('loading');
    try {
      const result = await adminApi.getSpecialistProfile(user.id);
      setDetails(result);
    } catch {
      setDetails('error');
    }
  };

  return (
    <React.Fragment>
      <tr
        onClick={handleRowClick}
        className={`border-b border-brand-dark/5 transition-colors ${
          isSpecialist ? 'cursor-pointer hover:bg-brand-light/40' : 'hover:bg-brand-light/20'
        } ${expanded ? 'bg-brand-light/40' : ''}`}
      >
        <td className="px-4 py-3 font-medium text-brand-dark">
          <div className="flex items-center gap-2">
            {isSpecialist && (
              expanded
                ? <ChevronUp className="w-4 h-4 text-brand-dark/40 shrink-0" />
                : <ChevronDown className="w-4 h-4 text-brand-dark/40 shrink-0" />
            )}
            {fullName}
          </div>
        </td>
        <td className="px-4 py-3 text-brand-dark/70 hidden md:table-cell">{user.email}</td>
        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {user.is_active
              ? t('adminDashboard.users.status.active')
              : t('adminDashboard.users.status.inactive')}
          </span>
        </td>
        <td className="px-4 py-3 text-brand-dark/50 hidden lg:table-cell">
          {new Date(user.created_at).toLocaleDateString('ro-RO')}
        </td>
        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
          {user.role !== 'ADMIN' && (
            <button
              onClick={() => onToggleRequest(user)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                user.is_active
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {user.is_active
                ? t('adminDashboard.users.toggle.deactivate')
                : t('adminDashboard.users.toggle.activate')}
            </button>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-brand-light/30 border-b border-brand-dark/5">
          <td colSpan={6} className="px-6 py-4">
            {details === 'loading' || details === null ? (
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 bg-brand-dark/10 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : details === 'error' ? (
              <p className="text-sm text-red-500">{t('adminDashboard.users.expand.loadError')}</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold tracking-widest uppercase text-brand-dark/50">
                    {t('adminDashboard.users.expand.verificationStatus')}
                  </span>
                  <VerificationBadge status={details.verification_status} />
                  {details.rejection_reason && (
                    <span className="text-xs text-red-600 font-medium">
                      {t('adminDashboard.users.expand.rejectionReason')}: {details.rejection_reason}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <CredentialField label={t('register.fields.specialization')}     value={details.specialization} />
                  <CredentialField label={t('register.fields.licenseNumber')}      value={details.license_number} />
                  <CredentialField label={t('register.fields.clinic')}             value={details.clinic_affiliation} />
                  <CredentialField label={t('register.fields.codParafa')}          value={details.cod_parafa} />
                  <CredentialField label={t('register.fields.unitateSanitara')}    value={details.unitate_sanitara} />
                  <CredentialField label={t('register.fields.numarOndr')}          value={details.numar_ondr} />
                  <CredentialField label={t('register.fields.institutieAbsolvire')} value={details.institutie_absolvire} />
                  <CredentialField label={t('register.fields.tipCertificare')}     value={details.tip_certificare} />
                  <CredentialField label={t('register.fields.numarCertificare')}   value={details.numar_certificare} />
                </div>

                {details.verification_document_url && (
                  <DocumentLink
                    path={details.verification_document_url}
                    className="inline-flex items-center gap-1.5 text-xs text-accent font-bold hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('adminDashboard.users.expand.documentLink')}
                  </DocumentLink>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

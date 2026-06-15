import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CertificationEntry } from '@/domain/models/SpecialistProfileTypes';

type ExpiryStatus = 'expired' | 'soon' | 'ok';

function getExpiryStatus(expiryDateStr: string): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  if (expiry < today) return 'expired';
  const in60Days = new Date(today);
  in60Days.setDate(today.getDate() + 60);
  if (expiry <= in60Days) return 'soon';
  return 'ok';
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

interface Props {
  entries: CertificationEntry[];
}

export const PublicCertificationsSection: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6">
      <h2 className="font-heading text-lg text-brand-dark mb-4">{t('certifications.sectionTitle')}</h2>
      <div className="space-y-4">
        {entries.map((entry, idx) => {
          const expiryStatus: ExpiryStatus | null = entry.expiry_date
            ? getExpiryStatus(entry.expiry_date)
            : null;
          return (
            <div
              key={entry.id}
              className={`flex gap-3 ${idx < entries.length - 1 ? 'pb-4 border-b border-brand-dark/5' : ''}`}
            >
              <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm text-brand-dark">{entry.name}</p>
                  {expiryStatus === 'expired' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/15 text-secondary">
                      {t('certifications.expired')}
                    </span>
                  )}
                  {expiryStatus === 'soon' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {t('certifications.expiringSoon')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-dark/60">{entry.issuing_body}</p>
                <p className="text-xs text-brand-dark/40 mt-0.5">
                  {formatDate(entry.issue_date)}
                  {entry.expiry_date ? ` – ${formatDate(entry.expiry_date)}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkExperienceEntry } from '@/domain/models/SpecialistProfileTypes';

function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${month}/${year}`;
}

interface Props {
  entries: WorkExperienceEntry[];
}

export const PublicWorkExperienceSection: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6">
      <h2 className="font-heading text-lg text-brand-dark mb-4">{t('workExperience.sectionTitle')}</h2>
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex gap-3 ${idx < entries.length - 1 ? 'pb-4 border-b border-brand-dark/5' : ''}`}
          >
            <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-brand-dark">{entry.title}</p>
              <p className="text-xs text-brand-dark/60">
                {entry.employer}{entry.location ? ` · ${entry.location}` : ''}
              </p>
              <p className="text-xs text-brand-dark/40 mt-0.5">
                {formatMonthYear(entry.start_date)} –{' '}
                {entry.end_date ? formatMonthYear(entry.end_date) : t('workExperience.present')}
              </p>
              {entry.description && (
                <p className="text-xs text-brand-dark/60 mt-1">{entry.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { EducationEntry } from '@/domain/models/SpecialistProfileTypes';

interface Props {
  entries: EducationEntry[];
}

export const PublicEducationSection: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm p-6">
      <h2 className="font-heading text-lg text-brand-dark mb-4">{t('education.sectionTitle')}</h2>
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex gap-3 ${idx < entries.length - 1 ? 'pb-4 border-b border-brand-dark/5' : ''}`}
          >
            <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-brand-dark">{entry.degree}</p>
              <p className="text-xs text-brand-dark/60">
                {entry.institution}{entry.field_of_study ? ` · ${entry.field_of_study}` : ''}
              </p>
              <p className="text-xs text-brand-dark/40 mt-0.5">{entry.year_completed}</p>
              {entry.honors && (
                <p className="text-xs text-accent mt-0.5">{entry.honors}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

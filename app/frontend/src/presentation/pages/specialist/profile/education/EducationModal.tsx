import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { EducationEntry } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;
const MAX_YEAR = CURRENT_YEAR + 10;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (entry: EducationEntry) => void;
  entry?: EducationEntry | null;
}

export const EducationModal: React.FC<Props> = ({ open, onClose, onSaved, entry }) => {
  const { t } = useTranslation();

  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [yearCompleted, setYearCompleted] = useState('');
  const [honors, setHonors] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!entry;

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setInstitution(entry.institution);
      setDegree(entry.degree);
      setFieldOfStudy(entry.field_of_study ?? '');
      setYearCompleted(String(entry.year_completed));
      setHonors(entry.honors ?? '');
    } else {
      setInstitution('');
      setDegree('');
      setFieldOfStudy('');
      setYearCompleted('');
      setHonors('');
    }
    setErrors({});
  }, [open, entry]);

  if (!open) return null;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!institution.trim()) next.institution = 'required';
    if (!degree.trim()) next.degree = 'required';
    const yr = Number(yearCompleted);
    if (!yearCompleted || isNaN(yr) || yr < MIN_YEAR || yr > MAX_YEAR) next.yearCompleted = 'invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        institution: institution.trim(),
        degree: degree.trim(),
        field_of_study: fieldOfStudy.trim() || null,
        year_completed: Number(yearCompleted),
        honors: honors.trim() || null,
      };
      const saved = isEdit && entry
        ? await specialistApi.updateEducation(entry.id, payload)
        : await specialistApi.addEducation(payload);
      onSaved(saved);
      onClose();
    } catch {
      setErrors({ submit: t('education.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (field: string) =>
    `w-full rounded-xl border bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 ${
      errors[field] ? 'border-secondary/60' : 'border-brand-dark/20'
    }`;

  const labelClass = 'text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-brand-dark/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-dark/10">
          <h2 className="text-lg font-heading text-brand-dark">
            {isEdit ? t('education.modalTitleEdit') : t('education.modalTitleAdd')}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Institution */}
          <div>
            <label className={labelClass}>{t('education.fields.institution')}</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value.slice(0, 200))}
              className={fieldClass('institution')}
            />
          </div>

          {/* Degree */}
          <div>
            <label className={labelClass}>{t('education.fields.degree')}</label>
            <input
              type="text"
              value={degree}
              onChange={(e) => setDegree(e.target.value.slice(0, 200))}
              className={fieldClass('degree')}
            />
          </div>

          {/* Field of study */}
          <div>
            <label className={labelClass}>{t('education.fields.fieldOfStudy')}</label>
            <input
              type="text"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value.slice(0, 200))}
              className={fieldClass('fieldOfStudy')}
            />
          </div>

          {/* Year completed */}
          <div>
            <label className={`${labelClass} ${errors.yearCompleted ? 'text-secondary' : ''}`}>
              {t('education.fields.yearCompleted')}
            </label>
            <input
              type="number"
              value={yearCompleted}
              onChange={(e) => setYearCompleted(e.target.value)}
              min={MIN_YEAR}
              max={MAX_YEAR}
              className={fieldClass('yearCompleted')}
            />
          </div>

          {/* Honors */}
          <div>
            <label className={labelClass}>{t('education.fields.honors')}</label>
            <input
              type="text"
              value={honors}
              onChange={(e) => setHonors(e.target.value.slice(0, 200))}
              className={fieldClass('honors')}
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-secondary">{errors.submit}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-dark/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
          >
            {t('education.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('education.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

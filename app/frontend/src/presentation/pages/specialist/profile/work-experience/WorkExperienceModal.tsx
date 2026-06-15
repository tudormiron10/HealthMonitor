import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Info } from 'lucide-react';
import type { WorkExperienceEntry } from '@/domain/models/SpecialistProfileTypes';
import { specialistApi } from '@/infrastructure/api/specialistApi';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

interface Prefill {
  employer: string;
  location?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (entry: WorkExperienceEntry) => void;
  entry?: WorkExperienceEntry | null;
  prefill?: Prefill | null;
}

function parseDateParts(dateStr: string): { year: string; month: string } {
  const [year, month] = dateStr.split('-');
  return { year, month };
}

function combineDateParts(year: string, month: string): string {
  return `${year}-${month}-01`;
}

export const WorkExperienceModal: React.FC<Props> = ({ open, onClose, onSaved, entry, prefill }) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [employer, setEmployer] = useState('');
  const [location, setLocation] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  const [isCurrentPosition, setIsCurrentPosition] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!entry;

  useEffect(() => {
    if (!open) return;
    if (entry) {
      const start = parseDateParts(entry.start_date);
      const end = entry.end_date ? parseDateParts(entry.end_date) : { year: '', month: '' };
      setTitle(entry.title);
      setEmployer(entry.employer);
      setLocation(entry.location ?? '');
      setStartMonth(start.month);
      setStartYear(start.year);
      setEndMonth(end.month);
      setEndYear(end.year);
      setIsCurrentPosition(!entry.end_date);
      setDescription(entry.description ?? '');
    } else {
      setTitle('');
      setEmployer(prefill?.employer ?? '');
      setLocation(prefill?.location ?? '');
      setStartMonth('');
      setStartYear('');
      setEndMonth('');
      setEndYear('');
      setIsCurrentPosition(false);
      setDescription('');
    }
    setErrors({});
  }, [open, entry, prefill]);

  if (!open) return null;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'required';
    if (!employer.trim()) next.employer = 'required';
    if (!startMonth || !startYear) next.startDate = 'required';
    if (!isCurrentPosition && endYear && !endMonth) next.endDate = 'required';
    if (!isCurrentPosition && endMonth && !endYear) next.endDate = 'required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const startDate = combineDateParts(startYear, startMonth);
      const endDate =
        isCurrentPosition ? null
        : endYear && endMonth ? combineDateParts(endYear, endMonth)
        : null;

      let saved: WorkExperienceEntry;
      if (isEdit && entry) {
        saved = await specialistApi.updateWorkExperience(entry.id, {
          title: title.trim(),
          employer: employer.trim(),
          location: location.trim() || null,
          start_date: startDate,
          end_date: endDate,
          description: description.trim() || null,
        });
      } else {
        saved = await specialistApi.addWorkExperience({
          title: title.trim(),
          employer: employer.trim(),
          location: location.trim() || null,
          start_date: startDate,
          end_date: endDate,
          description: description.trim() || null,
        });
      }
      onSaved(saved);
      onClose();
    } catch {
      setErrors({ submit: t('workExperience.saveError') });
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl border border-brand-dark/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-dark/10">
          <h2 className="text-lg font-heading text-brand-dark">
            {isEdit ? t('workExperience.modalTitleEdit') : t('workExperience.modalTitleAdd')}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Prefill notice */}
          {!isEdit && prefill && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent/10 text-accent text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('specialistProfile.workplacePrefill')}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelClass}>{t('workExperience.fields.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              className={fieldClass('title')}
            />
          </div>

          {/* Employer */}
          <div>
            <label className={labelClass}>{t('workExperience.fields.employer')}</label>
            <input
              type="text"
              value={employer}
              onChange={(e) => setEmployer(e.target.value.slice(0, 200))}
              className={fieldClass('employer')}
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>{t('workExperience.fields.location')}</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, 200))}
              className={fieldClass('location')}
            />
          </div>

          {/* Start date */}
          <div>
            <label className={`${labelClass} ${errors.startDate ? 'text-secondary' : ''}`}>
              {t('workExperience.fields.startDate')}
            </label>
            <div className="flex gap-2">
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className={`flex-1 ${fieldClass('startDate')}`}
              >
                <option value="">MM</option>
                {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className={`flex-1 ${fieldClass('startDate')}`}
              >
                <option value="">YYYY</option>
                {YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Current position checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCurrentPosition}
              onChange={(e) => {
                setIsCurrentPosition(e.target.checked);
                if (e.target.checked) { setEndMonth(''); setEndYear(''); }
              }}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-sm text-brand-dark">{t('workExperience.fields.currentPosition')}</span>
          </label>

          {/* End date (hidden when current position) */}
          {!isCurrentPosition && (
            <div>
              <label className={`${labelClass} ${errors.endDate ? 'text-secondary' : ''}`}>
                {t('workExperience.fields.endDate')}
              </label>
              <div className="flex gap-2">
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className={`flex-1 ${fieldClass('endDate')}`}
                >
                  <option value="">MM</option>
                  {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className={`flex-1 ${fieldClass('endDate')}`}
                >
                  <option value="">YYYY</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelClass}>{t('workExperience.fields.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          {/* Submit error */}
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
            {t('workExperience.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('workExperience.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { MedicGrade } from '@/domain/enums/SpecialistEnums';
import { MEDICAL_SPECIALIZATIONS } from '@/domain/models/MedicalSpecialization';
import type { MedicalSpecialization } from '@/domain/models/MedicalSpecialization';

const GRADE_OPTIONS = Object.values(MedicGrade);
const TAG_MAX_LEN = 50;
const TAG_MAX_COUNT = 10;

interface Props {
  primarySpec: string;
  grad: string;
  onGradChange: (v: string) => void;
  specializariSecundare: MedicalSpecialization[];
  onToggleSecundara: (spec: MedicalSpecialization) => void;
  competente: string[];
  onRemoveTag: (tag: string) => void;
  tagInput: string;
  onTagInputChange: (v: string) => void;
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const DoctorFields: React.FC<Props> = ({
  primarySpec,
  grad,
  onGradChange,
  specializariSecundare,
  onToggleSecundara,
  competente,
  onRemoveTag,
  tagInput,
  onTagInputChange,
  onTagKeyDown,
}) => {
  const { t } = useTranslation();

  const secondaryOptions = MEDICAL_SPECIALIZATIONS.filter((s) => s !== primarySpec);
  const atLimit = competente.length >= TAG_MAX_COUNT;

  return (
    <>
      {/* Grad profesional */}
      <div>
        <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-1">
          {t('specialistProfile.roleSpecific.gradLabel')}
        </label>
        <select
          value={grad}
          onChange={(e) => onGradChange(e.target.value)}
          className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">{t('specialistProfile.roleSpecific.gradPlaceholder')}</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {t(`specialistGrade.${g}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Specializări secundare */}
      <div>
        <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-2">
          {t('specialistProfile.roleSpecific.specializariSecundareLabel')}
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {secondaryOptions.map((spec) => (
            <label key={spec} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={specializariSecundare.includes(spec)}
                onChange={() => onToggleSecundara(spec)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-brand-dark">{spec}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Competențe atestate */}
      <div>
        <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-1">
          {t('specialistProfile.roleSpecific.competenteAtestateLabel')}
        </label>
        {competente.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {competente.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="ml-0.5 hover:text-secondary transition-colors"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value.slice(0, TAG_MAX_LEN))}
          onKeyDown={onTagKeyDown}
          placeholder={
            atLimit
              ? t('specialistProfile.roleSpecific.maxTagsReached')
              : t('specialistProfile.roleSpecific.competenteAtestateHint')
          }
          disabled={atLimit}
          className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
        />
      </div>
    </>
  );
};

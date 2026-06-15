import React from 'react';
import { useTranslation } from 'react-i18next';
import { NutritionSpecialization } from '@/domain/enums/SpecialistEnums';

const NUTRITION_OPTIONS = Object.values(NutritionSpecialization);
const FILOSOFIE_MAX = 300;

interface Props {
  specializareNutritie: string[];
  onToggleNutritie: (code: string) => void;
  filosofie: string;
  onFilosofieChange: (v: string) => void;
}

export const NutritionistFields: React.FC<Props> = ({
  specializareNutritie,
  onToggleNutritie,
  filosofie,
  onFilosofieChange,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Specializare nutriție */}
      <div>
        <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-2">
          {t('specialistProfile.roleSpecific.specializareNutritieLabel')}
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {NUTRITION_OPTIONS.map((code) => (
            <label key={code} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={specializareNutritie.includes(code)}
                onChange={() => onToggleNutritie(code)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-brand-dark">{t(`nutritionSpecialization.${code}`)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filosofie profesională */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50">
            {t('specialistProfile.roleSpecific.filosofieProfesionalaLabel')}
          </label>
          <span className="text-xs text-brand-dark/30">
            {t('specialistProfile.basicInfo.charsRemaining', { count: FILOSOFIE_MAX - filosofie.length })}
          </span>
        </div>
        <textarea
          value={filosofie}
          onChange={(e) => onFilosofieChange(e.target.value.slice(0, FILOSOFIE_MAX))}
          rows={3}
          placeholder={t('specialistProfile.roleSpecific.filosofieProfesionalaPlaceholder')}
          className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
        />
      </div>
    </>
  );
};

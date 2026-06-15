import React from 'react';
import { useTranslation } from 'react-i18next';
import { SportSpecialization } from '@/domain/enums/SpecialistEnums';

const SPORT_OPTIONS = Object.values(SportSpecialization);
const FILOSOFIE_MAX = 300;

interface Props {
  specializareSportiva: string[];
  onToggleSportiva: (code: string) => void;
  filosofie: string;
  onFilosofieChange: (v: string) => void;
}

export const CoachFields: React.FC<Props> = ({
  specializareSportiva,
  onToggleSportiva,
  filosofie,
  onFilosofieChange,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Specializare sportivă */}
      <div>
        <label className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/50 block mb-2">
          {t('specialistProfile.roleSpecific.specializareSportivaLabel')}
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SPORT_OPTIONS.map((code) => (
            <label key={code} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={specializareSportiva.includes(code)}
                onChange={() => onToggleSportiva(code)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-brand-dark">{t(`sportSpecialization.${code}`)}</span>
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

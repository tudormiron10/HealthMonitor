import { useTranslation } from 'react-i18next';
import { Stethoscope } from 'lucide-react';

const SPECIALISTS = [
  'cardiologie',
  'endocrinologie',
  'diabetNutritie',
  'gastroenterologie',
  'hepatologie',
  'nefrologie',
  'hematologie',
  'urologie',
  'medicinaInterna',
  'nutritionist',
  'antrenor',
] as const;

export const PlatformSpecialists: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-12">
      {/* Section header */}
      <div className="max-w-4xl space-y-4">
        <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
          {t('platform.specialists.sectionLabel')}
        </p>
        <h2 className="text-4xl md:text-6xl font-heading tracking-wide text-brand-dark">
          {t('platform.specialists.title')}
        </h2>
        <p className="text-lg text-brand-dark/60 leading-relaxed max-w-2xl">
          {t('platform.specialists.subtitle')}
        </p>
      </div>

      {/* Verification banner */}
      <div className="p-6 bg-bg-main/50 rounded-2xl border border-brand-dark/10 shadow-sm flex items-start gap-4">
        <div className="bg-accent/10 rounded-xl w-10 h-10 p-2 flex items-center justify-center shrink-0">
          <Stethoscope className="w-6 h-6 text-accent" />
        </div>
        <p className="text-sm text-brand-dark/70 leading-relaxed">
          {t('platform.specialists.verificationIntro')}
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {SPECIALISTS.map((key) => (
          <div
            key={key}
            className="bg-bg-main/50 rounded-xl border border-brand-dark/10 p-5 space-y-2 hover:border-accent hover:bg-bg-main transition-colors"
          >
            <h3 className="text-xl font-heading text-primary tracking-wide">
              {t(`platform.specialists.${key}.name`)}
            </h3>
            <p className="text-sm text-brand-dark/70 leading-relaxed">
              {t(`platform.specialists.${key}.description`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

import { useTranslation } from 'react-i18next';
import { BookOpen, GitBranch, ShieldAlert } from 'lucide-react';

const AUC_CHIPS = [
  { pctKey: 'accuracyCardiovascular', labelKey: 'accuracyCardiovascularLabel' },
  { pctKey: 'accuracyHepaticSteatosis', labelKey: 'accuracyHepaticSteatosisLabel' },
  { pctKey: 'accuracyCkd', labelKey: 'accuracyCkdLabel' },
  { pctKey: 'accuracyAnemia', labelKey: 'accuracyAnemiaLabel' },
  { pctKey: 'accuracyMetabolicSyndrome', labelKey: 'accuracyMetabolicSyndromeLabel' },
  { pctKey: 'accuracyHypertension', labelKey: 'accuracyHypertensionLabel' },
  { pctKey: 'accuracyDyslipidemia', labelKey: 'accuracyDyslipidemiaLabel' },
] as const;

export const PlatformMLAccuracy: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
        {t('platform.mlAccuracy.sectionLabel')}
      </p>
      <h2 className="text-4xl md:text-6xl font-heading tracking-wide leading-tight">
        <span className="text-primary">{t('platform.mlAccuracy.title1')}</span>
        <br />
        <span className="text-accent italic">{t('platform.mlAccuracy.title2')}</span>
      </h2>
      <p className="text-lg text-brand-dark/60 leading-relaxed max-w-3xl">
        {t('platform.mlAccuracy.subtitle')}
      </p>

      {/* NHANES card */}
      <div className="bg-white/60 rounded-3xl border border-brand-dark/10 p-10 shadow-sm flex gap-6 items-start mt-16">
        <div className="bg-accent/10 rounded-xl w-12 h-12 p-3 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="text-2xl font-heading text-primary">{t('platform.mlAccuracy.nhanesTitle')}</h3>
          <p className="text-base text-brand-dark/70 leading-relaxed mt-3">
            {t('platform.mlAccuracy.nhanesBody')}
          </p>
        </div>
      </div>

      {/* Model B card */}
      <div className="bg-white/60 rounded-3xl border border-brand-dark/10 p-10 shadow-sm flex gap-6 items-start mt-6">
        <div className="bg-secondary/10 rounded-xl w-12 h-12 p-3 flex items-center justify-center shrink-0">
          <GitBranch className="w-6 h-6 text-secondary" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-heading text-primary">{t('platform.mlAccuracy.modelBTitle')}</h3>
          <p className="text-base text-brand-dark/70 leading-relaxed mt-3">
            {t('platform.mlAccuracy.modelBBody')}
          </p>
          <p className="text-xs text-brand-dark/50 italic mt-4 pt-4 border-t border-brand-dark/10">
            {t('platform.mlAccuracy.treesNote')}
          </p>
        </div>
      </div>

      {/* Accuracy grid */}
      <div className="mt-16">
        <h3 className="text-2xl font-heading text-brand-dark mb-8">
          {t('platform.mlAccuracy.accuracyTitle')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {AUC_CHIPS.map(({ pctKey, labelKey }) => (
            <div
              key={pctKey}
              className="bg-white rounded-2xl border border-brand-dark/10 p-5 text-center hover:border-accent transition-colors"
            >
              <p className="text-4xl font-heading text-accent">
                {t(`platform.mlAccuracy.${pctKey}`)}
              </p>
              <p className="text-xs font-mono uppercase tracking-widest text-brand-dark/60 mt-2 leading-snug">
                {t(`platform.mlAccuracy.${labelKey}`)}
              </p>
            </div>
          ))}

          {/* Diabetes note chip — no big percent */}
          <div className="bg-white rounded-2xl border border-brand-dark/10 p-5 text-center hover:border-accent transition-colors flex items-center justify-center">
            <p className="text-xs italic text-brand-dark/60 leading-snug p-2">
              {t('platform.mlAccuracy.accuracyDiabetesNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-secondary/5 border-l-4 border-secondary rounded-r-2xl p-8 mt-12">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-secondary shrink-0" />
          <h4 className="text-xl font-heading text-brand-dark">
            {t('platform.mlAccuracy.disclaimerTitle')}
          </h4>
        </div>
        <p className="text-sm text-brand-dark/70 leading-relaxed mt-3">
          {t('platform.mlAccuracy.disclaimerBody')}
        </p>
      </div>
    </div>
  );
};

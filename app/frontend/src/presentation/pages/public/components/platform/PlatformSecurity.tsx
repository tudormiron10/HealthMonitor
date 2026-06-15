import { useTranslation } from 'react-i18next';
import { AlertTriangle, KeyRound, FileCheck, ShieldCheck } from 'lucide-react';

const TABLE_ROWS = [
  'Row1',
  'Row2',
  'Row3',
  'Row4',
] as const;

const STEPS = ['block3Step1', 'block3Step2', 'block3Step3', 'block3Step4', 'block3Step5'] as const;

export const PlatformSecurity: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="text-brand-light relative overflow-hidden">
      {/* Decorative radial gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-160 h-160 bg-[radial-gradient(circle,rgba(57,115,103,0.1),transparent_60%)]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-160 h-160 bg-[radial-gradient(circle,rgba(46,61,36,0.2),transparent_60%)]" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
          {t('platform.security.sectionLabel')}
        </p>
        <h2 className="text-4xl md:text-6xl font-heading tracking-wide leading-tight">
          <span className="text-white">{t('platform.security.title1')}</span>
          <br />
          <span className="text-secondary italic">{t('platform.security.title2')}</span>
        </h2>
        <p className="text-xl text-brand-light/60 max-w-2xl leading-relaxed">
          {t('platform.security.subtitle')}
        </p>

        {/* Row 1 — problem + solution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12!">
          {/* Block 1 — Problem */}
          <div className="bg-brand-light rounded-3xl p-10 text-brand-dark space-y-6 shadow-inner">
            <div className="flex items-center gap-3 border-b border-brand-dark/20 pb-3">
              <AlertTriangle className="text-secondary w-6 h-6 shrink-0" />
              <h3 className="text-2xl font-heading text-secondary tracking-wide">
                {t('platform.security.block1Title')}
              </h3>
            </div>
            <p className="text-lg leading-relaxed text-brand-dark/80">
              {t('platform.security.block1Body')}
            </p>
          </div>

          {/* Block 2 — Solution */}
          <div className="bg-brand-light rounded-3xl p-10 text-brand-dark space-y-6 shadow-inner">
            <div className="flex items-center gap-3 border-b border-brand-dark/20 pb-3">
              <KeyRound className="text-primary w-6 h-6 shrink-0" />
              <h3 className="text-2xl font-heading text-primary tracking-wide">
                {t('platform.security.block2Title')}
              </h3>
            </div>
            <p className="text-lg leading-relaxed text-brand-dark/80">
              {t('platform.security.block2Body')}
            </p>
          </div>
        </div>

        {/* Row 2 — consent flow */}
        <div className="bg-brand-light/10 border border-brand-light/20 rounded-3xl p-10 mt-8!">
          <h3 className="text-3xl font-heading text-accent flex items-center gap-3">
            <FileCheck className="w-8 h-8 shrink-0" />
            {t('platform.security.block3Title')}
          </h3>
          <p className="text-brand-light/70 mt-4 leading-relaxed">
            {t('platform.security.block3Intro')}
          </p>
          <ol className="space-y-4 mt-8">
            {STEPS.map((key, i) => (
              <li key={key}>
                {i > 0 && (
                  <div className="border-l-2 border-accent/30 ml-5 -mt-2 h-4 mb-2" />
                )}
                <div className="flex items-start gap-5">
                  <span className="w-10 h-10 rounded-full bg-accent/20 text-accent font-heading text-xl flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-base text-brand-light/80 leading-relaxed pt-1.5">
                    {t(`platform.security.${key}`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Row 3 — comparison table */}
        <h3 className="text-3xl font-heading text-white tracking-wide mt-12! mb-8!">
          {t('platform.security.block4Title')}
        </h3>

        {/* Desktop table */}
        <div className="hidden md:block mt-0!">
          <table className="w-full border-collapse rounded-2xl overflow-hidden">
            <thead>
              <tr className="bg-brand-light text-brand-dark font-heading uppercase tracking-widest text-sm">
                <th className="text-left p-4 w-1/3" />
                <th className="text-left p-4">{t('platform.security.block4ColTraditional')}</th>
                <th className="text-left p-4">{t('platform.security.block4ColHealthMonitor')}</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row, i) => (
                <tr key={row} className={i % 2 === 0 ? 'bg-brand-light/5' : 'bg-brand-light/10'}>
                  <td className="p-4 text-brand-light/60 font-bold uppercase tracking-wider text-xs">
                    {t(`platform.security.block4${row}Label`)}
                  </td>
                  <td className="p-4 text-secondary">
                    <AlertTriangle className="w-4 h-4 inline mr-2 shrink-0" />
                    {t(`platform.security.block4${row}Traditional`)}
                  </td>
                  <td className="p-4 text-accent">
                    <ShieldCheck className="w-4 h-4 inline mr-2 shrink-0" />
                    {t(`platform.security.block4${row}HealthMonitor`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="md:hidden space-y-4 mt-0!">
          {TABLE_ROWS.map((row) => (
            <div key={row} className="bg-brand-light/5 rounded-2xl p-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-light/50">
                {t(`platform.security.block4${row}Label`)}
              </p>
              <p className="text-secondary text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {t(`platform.security.block4${row}Traditional`)}
              </p>
              <p className="text-accent text-sm flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                {t(`platform.security.block4${row}HealthMonitor`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

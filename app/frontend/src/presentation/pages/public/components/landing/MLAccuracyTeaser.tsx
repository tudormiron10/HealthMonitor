import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const MLAccuracyTeaser: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="ml-accuracy-teaser" className="py-24 px-6 bg-bg-main relative scroll-mt-20">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
          {t('landing.mlAccuracyTeaser.sectionLabel')}
        </p>

        <h3 className="text-4xl md:text-5xl font-heading text-brand-dark tracking-wide">
          {t('landing.mlAccuracyTeaser.title')}
        </h3>

        <div className="space-y-2 py-4">
          <p className="text-5xl md:text-6xl font-heading text-accent">
            {t('landing.mlAccuracyTeaser.aucValue')}
          </p>
          <p className="text-sm font-mono uppercase tracking-widest text-brand-dark/60">
            {t('landing.mlAccuracyTeaser.aucLabel')}
          </p>
        </div>

        <p className="text-sm text-brand-dark/60 italic">
          {t('landing.mlAccuracyTeaser.disclaimerShort')}
        </p>

        <Link
          to="/platform#ml-accuracy"
          className="group inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase text-accent hover:text-primary transition-colors"
        >
          {t('landing.mlAccuracyTeaser.viewMethodologyCta')}
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </section>
  );
};

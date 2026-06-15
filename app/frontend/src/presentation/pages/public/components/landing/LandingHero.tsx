import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import HealthLogo from '@/presentation/components/ui/HealthLogo';
import { Button } from '@/presentation/components/ui/Button';

export const LandingHero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="relative px-6 py-20 lg:py-32 overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left Column */}
        <div className="space-y-10 z-10">
          <h2 className="text-5xl sm:text-6xl md:text-8xl font-heading leading-[0.9] text-primary tracking-tighter wrap-break-word">
            {t('landing.hero.title1')} <br />
            <span className="text-brand-dark italic opacity-70">{t('landing.hero.title2')}</span> <br />
            <span className="text-accent drop-shadow-md">{t('landing.hero.title3')}</span>
          </h2>

          <p className="text-xl md:text-2xl text-brand-dark/70 max-w-xl leading-relaxed font-heading tracking-wide">
            <Trans
              i18nKey="landing.hero.subtitle"
              components={{ 1: <span className="font-bold underline decoration-secondary" /> }}
            />
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 pt-4">
            <Button
              size="lg"
              variant="primary"
              className="text-xl sm:text-2xl px-8 sm:px-12 py-4 sm:py-5 w-full sm:w-auto"
              onClick={() => navigate('/register')}
            >
              {t('landing.hero.startAnalysis')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-xl sm:text-2xl px-8 sm:px-10 py-4 sm:py-5 group w-full sm:w-auto"
            >
              {t('landing.hero.howItWorks')}
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Button>
          </div>

          <p className="text-xs font-mono uppercase tracking-[0.3em] text-brand-dark/40 pt-2 max-w-md">
            {t('landing.hero.poweredBy')}
          </p>
        </div>

        {/* Right Column */}
        <div className="relative group lg:pl-10">
          <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 via-accent/10 to-secondary/20 rounded-[3rem] blur-2xl opacity-60 group-hover:opacity-100 transition duration-1000" />

          <div className="relative bg-brand-light/90 border border-brand-light p-8 md:p-12 rounded-4xl shadow-2xl shadow-brand-dark/5 backdrop-blur-md flex flex-col items-center">
            <HealthLogo className="w-40 h-40 md:w-56 md:h-56 drop-shadow-lg mb-8 transition-transform duration-700 hover:scale-[1.05]" />

            <div className="w-full space-y-6">
              <div className="flex justify-between items-end border-b border-brand-light/50 pb-2">
                <p className="text-sm font-bold tracking-[0.3em] font-heading uppercase text-brand-dark/50">
                  {t('landing.hero.aiPrediction')}
                </p>
                <p className="text-lg font-heading text-accent">{t('landing.hero.accuracy')}</p>
              </div>

              <div className="flex justify-between items-center bg-brand-light/40 py-3 px-4 rounded-xl border border-brand-dark/5">
                <span className="font-mono text-sm tracking-widest text-primary font-bold">
                  {t('landing.hero.cvRisk')}
                </span>
                <span className="text-secondary font-bold text-lg">{t('landing.hero.cvRiskLow')}</span>
              </div>

              <div className="flex justify-between items-center bg-brand-light/40 py-3 px-4 rounded-xl border border-brand-dark/5">
                <span className="font-mono text-sm tracking-widest text-primary font-bold">
                  {t('landing.hero.healthScore')}
                </span>
                <span className="text-accent font-black text-2xl font-heading">
                  85<span className="text-sm text-brand-dark/30">/100</span>
                </span>
              </div>

              <div className="flex justify-between items-center bg-brand-light/40 py-3 px-4 rounded-xl border border-brand-dark/5">
                <span className="font-mono text-sm tracking-widest text-primary font-bold">
                  {t('landing.hero.diabetesRisk')}
                </span>
                <span className="text-primary font-bold text-lg">{t('landing.hero.diabetesRiskValue')}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/presentation/components/ui/Button';

export const ClosingCTA: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
    <section id="cta" className="py-24 px-6 bg-brand-dark/90 text-brand-light relative overflow-hidden scroll-mt-20">
      {/* Decorative radial blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-160 h-160 bg-[radial-gradient(circle,rgba(193,124,116,0.15),transparent_60%)]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-160 h-160 bg-[radial-gradient(circle,rgba(247,231,206,0.08),transparent_60%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Centered title block */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-secondary">
            {t('landing.cta.sectionLabel')}
          </p>
          <h3 className="text-4xl md:text-6xl font-heading tracking-wide text-brand-light max-w-3xl mx-auto">
            {t('landing.cta.title')}
          </h3>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">

          {/* Patient column */}
          <div className="bg-brand-light border-brand-dark text-brand-dark rounded-3xl p-12 shadow-2xl space-y-6">
            <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent flex items-center gap-2">
              {t('landing.cta.patientLabel')}
            </p>
            <h4 className="text-4xl md:text-5xl font-heading text-primary tracking-tight">
              {t('landing.cta.patientHeadline')}
            </h4>
            <p className="text-base text-brand-dark leading-relaxed">
              {t('landing.cta.patientBody')}
            </p>
            <Button variant="primary" size="lg" onClick={() => navigate('/register')}>
              {t('landing.cta.patientCta')}
            </Button>
          </div>

          {/* Specialist column */}
          <div className="bg-brand-dark border border-brand-light text-brand-light rounded-3xl p-12 backdrop-blur-sm space-y-6">
            <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-secondary">
              {t('landing.cta.specialistLabel')}
            </p>
            <h4 className="text-4xl md:text-5xl font-heading text-brand-light tracking-tight">
              {t('landing.cta.specialistHeadline')}
            </h4>
            <p className="text-base text-brand-light/70 leading-relaxed">
              {t('landing.cta.specialistBody')}
            </p>
            <button
              type="button"
              className="bg-brand-light text-primary hover:bg-primary hover:text-brand-light px-8 py-4 rounded-xl font-heading text-xl tracking-wide transition-colors"
              onClick={() => navigate('/register')}
            >
              {t('landing.cta.specialistCta')}
            </button>
          </div>

        </div>
      </div>
    </section>
    <div className="h-30 bg-linear-to-b from-brand-dark/90 to-primary" />
    </>
  );
};

import { useTranslation } from 'react-i18next';

export const HowItWorks: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      id: '01',
      title: t('landing.howItWorks.step1Title'),
      subtitle: t('landing.howItWorks.step1Sub'),
      description: t('landing.howItWorks.step1Desc'),
      color: 'text-primary border-primary',
      bg: 'bg-primary/5',
    },
    {
      id: '02',
      title: t('landing.howItWorks.step2Title'),
      subtitle: t('landing.howItWorks.step2Sub'),
      description: t('landing.howItWorks.step2Desc'),
      color: 'text-accent border-accent',
      bg: 'bg-accent/5',
    },
    {
      id: '03',
      title: t('landing.howItWorks.step3Title'),
      subtitle: t('landing.howItWorks.step3Sub'),
      description: t('landing.howItWorks.step3Desc'),
      color: 'text-secondary border-secondary',
      bg: 'bg-secondary/5',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 bg-brand-light/50 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-6">
          <h3 className="text-5xl md:text-6xl font-heading tracking-[0.2em] text-brand-dark">
            {t('landing.howItWorks.sectionSuperTitle')}{' '}
            <span className="text-primary font-bold">{t('landing.howItWorks.sectionSuperTitleBold')}</span>
          </h3>
          <p className="text-xl md:text-2xl text-brand-dark/60 font-heading uppercase tracking-widest max-w-2xl mx-auto">
            {t('landing.howItWorks.sectionSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (hidden on mobile) */}
          <div className="hidden md:block absolute top-18 left-[10%] right-[10%] h-0.5 bg-brand-light/30 z-0" />

          {steps.map((step) => (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl border border-brand-light shadow-sm hover:-translate-y-2 transition-transform duration-500 bg-white group"
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-heading font-bold shadow-inner ${step.bg} ${step.color} mb-8 border-4 border-white group-hover:scale-110 transition-transform`}
              >
                {step.id}
              </div>
              <h4 className={`text-4xl font-heading tracking-widest ${step.color.split(' ')[0]} mb-2`}>
                {step.title}
              </h4>
              <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase opacity-40 mb-6">
                {step.subtitle}
              </p>
              <p className="text-brand-dark/70 leading-relaxed font-medium max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

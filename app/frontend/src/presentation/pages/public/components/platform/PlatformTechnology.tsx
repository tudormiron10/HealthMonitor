import { useTranslation } from 'react-i18next';

export const PlatformTechnology: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="text-brand-light relative overflow-hidden">
      {/* Decorative radial gradients */}
      <div className="absolute top-[-10%] right-[-5%] w-160 h-160 bg-[radial-gradient(circle,rgba(57,115,103,0.1),transparent_60%)]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-160 h-160 bg-[radial-gradient(circle,rgba(46,61,36,0.2),transparent_60%)]" />

      <div className="relative z-10 space-y-10">
        {/* Header row */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-brand-light/20 pb-8">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-heading tracking-wide text-white">
              {t('platform.technology.title1')}{' '}
              <span className="text-accent italic">{t('platform.technology.title2')}</span>
            </h2>
            <p className="text-xl text-brand-light/60">{t('platform.technology.subtitle')}</p>
          </div>
          <button className="text-sm font-bold tracking-[0.3em] uppercase text-accent hover:text-brand-light transition-colors hidden md:block shrink-0">
            {t('platform.technology.explore')}
          </button>
        </div>

        {/* 4-card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1 — ABE Security (full width) */}
          <div className="md:col-span-2 bg-brand-light rounded-3xl p-10 md:p-12 text-brand-dark space-y-8 shadow-inner group">
            <h4 className="text-2xl font-bold font-heading tracking-widest border-b border-brand-dark/20 pb-4">
              {t('platform.technology.abeTitle')}
            </h4>
            <div className="p-6 bg-brand-dark/5 border-l-4 border-secondary-soft rounded-r-xl group-hover:bg-brand-dark/10 transition-colors">
              <p className="text-xl font-heading mt-2 leading-relaxed">
                {t('platform.technology.abeDesc')}
              </p>
              <div className="mt-6 w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2 — Health Score */}
          <div className="p-10 bg-linear-to-br from-accent/20 to-transparent border border-accent/20 rounded-4xl relative overflow-hidden group">
            <div className="absolute top-4 right-4 w-24 h-24 bg-accent/30 rounded-full blur-2xl group-hover:bg-accent/50 transition-colors duration-500" />
            <h4 className="text-5xl font-heading text-accent mb-4 mt-8">{t('platform.technology.scoreTitle')}</h4>
            <p className="text-brand-light/70 text-sm leading-relaxed mb-8">
              {t('platform.technology.scoreDesc')}
            </p>
            <div className="text-7xl font-heading text-white drop-shadow-sm group-hover:scale-105 transition-transform origin-left">
              85<span className="text-2xl opacity-40">/100</span>
            </div>
          </div>

          {/* Card 3 — Mirror Graphs */}
          <div className="p-10 bg-brand-light/5 border border-brand-light/10 rounded-4xl group">
            <h4 className="text-4xl font-heading text-white mb-4">{t('platform.technology.mirrorTitle')}</h4>
            <p className="text-brand-light/60 text-sm leading-relaxed mb-6">
              {t('platform.technology.mirrorDesc')}
            </p>
            <div className="flex gap-2 h-16 items-end border-b border-brand-light/20 pb-2">
              <div className="w-1/4 bg-secondary/40 h-[40%] rounded-t-sm group-hover:h-[60%] transition-all" />
              <div className="w-1/4 bg-primary/40 h-[70%] rounded-t-sm group-hover:h-[85%] transition-all delay-75" />
              <div className="w-1/4 bg-secondary h-[90%] rounded-t-sm group-hover:h-[50%] transition-all delay-150" />
              <div className="w-1/4 bg-primary h-[30%] rounded-t-sm group-hover:h-[80%] transition-all delay-200" />
            </div>
          </div>

          {/* Card 4 — Live Ecosystem (full width) */}
          <div className="md:col-span-2 bg-brand-light rounded-3xl p-10 md:p-12 text-brand-dark space-y-8 shadow-inner group">
            <h4 className="text-2xl font-bold font-heading tracking-widest border-b border-brand-dark/20 pb-4">
              {t('platform.technology.ecoTitle')}
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-accent/10 border-l-4 border-accent rounded-r-xl">
                <p className="text-lg font-medium mt-2 leading-relaxed">
                  {t('platform.technology.ecoDesc')}
                </p>
              </div>
              <div className="w-full flex-1 rounded-xl border border-brand-dark/10 bg-white/50 p-4 space-y-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/80 shrink-0" />
                  <div className="bg-white rounded-xl rounded-tl-sm p-3 text-xs text-brand-dark shadow-sm">
                    {t('platform.technology.chatMsg1')}
                  </div>
                </div>
                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-accent/80 shrink-0" />
                  <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tr-sm p-3 text-xs text-brand-dark shadow-sm">
                    {t('platform.technology.chatMsg2')}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

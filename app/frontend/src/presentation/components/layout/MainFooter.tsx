import React from 'react';
import { Link } from 'react-router-dom';
import HealthLogo from '@/presentation/components/ui/HealthLogo';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/presentation/components/ui/LanguageSwitcher';

export const MainFooter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="pt-10 pb-12 bg-primary text-brand-light relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/gravel.png')] opacity-60 mask-[linear-gradient(to_bottom,transparent,black_15%)]"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center space-y-16">
        <div className="space-y-6">
          <HealthLogo className="w-16 h-16 md:w-24 md:h-24 mx-auto drop-shadow-2xl opacity-80" hexagonClassName="fill-brand-light" pulseClassName="fill-accent-hover" />
          <h5 className="text-3xl sm:text-4xl md:text-6xl font-heading tracking-widest md:tracking-[0.3em] opacity-90 uppercase transition-all hover:tracking-[0.4em] duration-1000 cursor-default">
            Health<span className="text-accent">Monitor</span>
          </h5>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-60 font-heading tracking-widest uppercase">
            {t('footer.slogan')}
          </p>
        </div>
        
        <div className="w-full h-px bg-brand-light/10"></div>
        
        <div className="w-full flex flex-col items-center gap-8 font-heading text-xl tracking-widest opacity-60">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            <Link to="/#how-it-works" className="hover:text-accent transition-colors">{t('navbar.workflow')}</Link>
            <Link to="/platform" className="hover:text-accent transition-colors">{t('navbar.platform')}</Link>
            <Link to="/platform#security" className="hover:text-accent transition-colors">{t('navbar.security')}</Link>
            <a href="mailto:contact@healthmonitor.ro" className="hover:text-accent transition-colors">{t('footer.contact')}</a>
            <div className="hidden md:block w-px h-5 bg-brand-light/30"></div>
            <LanguageSwitcher />
          </div>
          <p className="text-lg opacity-60">{t('footer.copyright')}</p>
        </div>
      </div>
      {/* Bottom Color Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-r from-primary via-secondary to-accent"></div>
    </footer>
  );
};

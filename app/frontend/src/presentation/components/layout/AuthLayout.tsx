import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import HealthLogo from '@/presentation/components/ui/HealthLogo';
import { LanguageSwitcher } from '@/presentation/components/ui/LanguageSwitcher';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AuthLayout: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-bg-main font-sans selection:bg-secondary selection:text-bg-main relative">
      {/* Floating Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher className="text-brand-dark hover:text-accent" />
      </div>

      {/* Floating Back to Home */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 z-80 flex items-center gap-2 text-brand-light hover:text-accent transition-colors font-heading tracking-widest text-lg group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="hidden sm:inline">Back to Home</span>
      </Link>

      {/* Left Panel: Branding (Hidden on small screens, takes half width on lg+) */}
      <div className="hidden lg:flex w-1/2 bg-primary text-brand-light relative overflow-hidden flex-col justify-center items-center p-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/gravel.png')] opacity-60"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-lg">
          <HealthLogo className="w-32 h-32 md:w-48 md:h-48 drop-shadow-2xl opacity-80" hexagonClassName="fill-brand-light" pulseClassName="fill-accent-hover" />
          <h1 className="text-5xl md:text-6xl font-heading tracking-widest md:tracking-[0.3em] opacity-90 uppercase transition-all hover:tracking-[0.4em] duration-1000 cursor-default drop-shadow-lg">
            Health<span className="text-accent">Monitor</span>
          </h1>
          <p className="text-xl font-heading tracking-wider uppercase opacity-70">
            {t('footer.slogan', 'Your precision health platform powered by AI')}
          </p>
        </div>
      </div>

      {/* Right Panel: Content Area (Full width on mobile, half width on lg+) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="w-full max-w-md">
          {/* Logo for mobile only */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <HealthLogo className="w-20 h-20 mb-4 drop-shadow-md" />
            <h1 className="text-3xl font-heading tracking-widest text-primary uppercase">
              Health<span className="text-accent">Monitor</span>
            </h1>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

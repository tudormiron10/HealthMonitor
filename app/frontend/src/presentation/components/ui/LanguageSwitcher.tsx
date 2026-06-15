import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = "text-brand-light/60 hover:text-accent" 
}) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.resolvedLanguage === 'ro' ? 'en' : 'ro';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 transition-colors font-heading tracking-widest text-xl group ${className}`}
      title={i18n.resolvedLanguage === 'ro' ? "Switch to English" : "Schimbă în Română"}
    >
      <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
      <span>{i18n.resolvedLanguage === 'ro' ? 'RO' : 'EN'}</span>
    </button>
  );
};

import { useTranslation } from 'react-i18next';

export const PlatformHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-accent">
        {t('platform.header.sectionLabel')}
      </p>
      <h1 className="text-4xl md:text-6xl font-heading text-brand-dark tracking-wide">
        {t('platform.header.title')}
      </h1>
      <p className="text-lg text-brand-dark/70 leading-relaxed max-w-3xl">
        {t('platform.header.intro')}
      </p>
    </div>
  );
};

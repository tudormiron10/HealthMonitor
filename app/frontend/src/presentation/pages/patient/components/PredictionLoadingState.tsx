import React from 'react';
import { useTranslation } from 'react-i18next';
import HealthLogo from '@/presentation/components/ui/HealthLogo';

export const PredictionLoadingState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="relative flex items-center justify-center w-32 h-32">
        <HealthLogo className="w-full h-full animate-pulse-scale" />
      </div>
      <div className="text-center">
        <h3 className="text-3xl font-iceland text-brand-dark mb-2">{t('predictions.loading.title')}</h3>
        <p className="text-brand-dark/60 max-w-md font-medium">
          {t('predictions.loading.description')}
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/presentation/components/ui/Button';

export const RegistrationSuccess: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-5xl font-heading text-primary tracking-tighter mb-2">
        {t('register.success.title')}
      </h2>
      <p className="text-brand-dark/70 text-lg">
        {t('register.success.message')}
      </p>
      <Button onClick={() => window.location.href = '/login'} className="w-full mt-4">
        {t('register.success.loginButton')}
      </Button>
    </div>
  );
};

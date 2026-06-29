import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/infrastructure';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';

interface ForgotPasswordForm {
  email: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ defaultValues: { email: '' } });

  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const onSubmit = async ({ email }: ForgotPasswordForm) => {
    try {
      await requestPasswordReset(email, i18n.language.startsWith('en') ? 'en' : 'ro');
    } catch {
      // Neutral anti-enumeration UX: always show the success view.
    }
    setSubmittedEmail(email);
  };

  return (
    <div className="relative group animate-fade-in w-full">
      {/* Biometrics glow effect */}
      <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 via-accent/10 to-secondary/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

      {/* Glassmorphism Card */}
      <div className="relative bg-brand-light/90 border border-brand-light p-6 md:p-8 rounded-4xl shadow-2xl backdrop-blur-sm">

        {submittedEmail === null ? (
          <>
            <div className="mb-5 border-b border-brand-light/50 pb-3 text-center">
              <h2 className="text-5xl font-heading text-primary tracking-tighter drop-shadow-sm uppercase">
                {t('forgotPassword.title')}
              </h2>
              <p className="text-brand-dark/60 text-sm mt-2 font-medium">
                {t('forgotPassword.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label={t('forgotPassword.emailLabel')}
                type="email"
                placeholder={t('forgotPassword.emailPlaceholder')}
                error={errors.email ? t('forgotPassword.invalidEmail') : undefined}
                {...register('email', { required: true, pattern: EMAIL_PATTERN })}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full text-lg mt-2">
                {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
              </Button>
            </form>

            <div className="mt-6 text-center pt-5 border-t border-brand-light/40">
              <Link to="/login" className="text-primary font-bold hover:underline text-sm">
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-2">
              <MailCheck className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-heading text-primary tracking-tighter uppercase">
              {t('forgotPassword.successTitle')}
            </h2>
            <p className="text-brand-dark/70 text-base leading-relaxed">
              {t('forgotPassword.successMessage', { email: submittedEmail })}
            </p>
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmittedEmail(null)}
                className="text-primary font-bold hover:underline text-sm"
              >
                {t('forgotPassword.changeEmail')}
              </button>
              <Link to="/login" className="text-brand-dark/60 hover:text-primary hover:underline text-sm font-medium">
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

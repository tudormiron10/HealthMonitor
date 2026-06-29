import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { verifyResetToken, resetPassword } from '@/infrastructure';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';

interface ResetForm {
  newPassword: string;
  confirmPassword: string;
}

type Status = 'verifying' | 'valid' | 'invalid';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('verifying');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ResetForm>({
    mode: 'onChange',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const ok = await verifyResetToken(token);
        if (!cancelled) setStatus(ok ? 'valid' : 'invalid');
      } catch {
        if (!cancelled) setStatus('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async ({ newPassword }: ResetForm) => {
    try {
      await resetPassword(token, newPassword);
      navigate('/login', { state: { resetSuccess: true } });
    } catch {
      setStatus('invalid');
    }
  };

  return (
    <div className="relative group animate-fade-in w-full">
      {/* Biometrics glow effect */}
      <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 via-accent/10 to-secondary/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

      {/* Glassmorphism Card */}
      <div className="relative bg-brand-light/90 border border-brand-light p-6 md:p-8 rounded-4xl shadow-2xl backdrop-blur-sm">

        {status === 'verifying' && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-brand-dark/70 font-medium">{t('resetPassword.verifying')}</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-heading text-primary tracking-tighter uppercase">
              {t('resetPassword.invalidTitle')}
            </h2>
            <p className="text-brand-dark/70 text-base leading-relaxed">
              {t('resetPassword.invalidMessage')}
            </p>
            <Link to="/forgot-password" className="w-full">
              <Button type="button" className="w-full">
                {t('resetPassword.requestNewLink')}
              </Button>
            </Link>
          </div>
        )}

        {status === 'valid' && (
          <>
            <div className="mb-5 border-b border-brand-light/50 pb-3 text-center">
              <h2 className="text-5xl font-heading text-primary tracking-tighter drop-shadow-sm uppercase">
                {t('resetPassword.title')}
              </h2>
              <p className="text-brand-dark/60 text-sm mt-2 font-medium">
                {t('resetPassword.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label={t('resetPassword.newPasswordLabel')}
                type="password"
                placeholder={t('resetPassword.passwordPlaceholder')}
                error={errors.newPassword ? t('resetPassword.errors.tooShort') : undefined}
                {...register('newPassword', {
                  required: true,
                  minLength: 8,
                  deps: ['confirmPassword'],
                })}
              />

              <Input
                label={t('resetPassword.confirmPasswordLabel')}
                type="password"
                placeholder={t('resetPassword.passwordPlaceholder')}
                error={errors.confirmPassword ? t('resetPassword.errors.mismatch') : undefined}
                {...register('confirmPassword', {
                  validate: (value) => value === getValues('newPassword'),
                })}
              />

              <Button type="submit" disabled={!isValid || isSubmitting} className="w-full text-lg mt-2">
                {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogin } from '@/application';
import { UserRole } from '@/domain';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, error, submitLogin } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSuccess] = useState<boolean>(
    () => !!(location.state as { resetSuccess?: boolean } | null)?.resetSuccess
  );

  useEffect(() => {
    if ((location.state as { resetSuccess?: boolean } | null)?.resetSuccess) {
      // Drop the router state so the banner does not reappear on reload/back.
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password) {
      setValidationError(t('login.errors.missingFields'));
      return;
    }

    try {
      const role = await submitLogin(email, password);
      if (role === UserRole.DOCTOR || role === UserRole.NUTRITIONIST || role === UserRole.COACH) {
        navigate('/dashboard/specialist');
      } else if (role === UserRole.ADMIN) {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard/patient');
      }
    } catch (err) {
      // Error is handled by the useLogin hook
    }
  };

  return (
    <div className="relative group animate-fade-in w-full">
      {/* Biometrics glow effect */}
      <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 via-accent/10 to-secondary/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

      {/* Glassmorphism Card */}
      <div className="relative bg-brand-light/90 border border-brand-light p-6 md:p-8 rounded-4xl shadow-2xl backdrop-blur-sm">

        <div className="mb-5 border-b border-brand-light/50 pb-3 text-center">
          <h2 className="text-5xl font-heading text-primary tracking-tighter drop-shadow-sm uppercase">
            {t('login.title')}
          </h2>
          <p className="text-brand-dark/60 text-sm mt-2 font-medium">
            {t('login.subtitle')}
          </p>
        </div>

        {resetSuccess && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-l-green-500 border-green-200 text-green-700 rounded-lg text-sm shadow-sm font-medium">
            {t('login.resetSuccess')}
          </div>
        )}

        {(error || validationError) && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-l-red-500 border-red-200 text-red-600 rounded-lg text-sm shadow-sm font-medium">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('login.fields.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nume@exemplu.ro"
            required
          />

          <Input
            label={t('login.fields.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="flex justify-center -mt-2">
            <Link to="/forgot-password" className="text-sm text-primary/80 hover:text-primary font-medium hover:underline">
              {t('login.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full text-lg mt-2">
            {isLoading ? t('login.buttons.loading') : t('login.buttons.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center pt-5 border-t border-brand-light/40">
          <p className="text-brand-dark/60 text-sm font-medium">
            {t('login.noAccount')}{' '}
            <a href="/register" className="text-primary font-bold hover:underline">
              {t('login.registerLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Stethoscope, ArrowRight } from 'lucide-react';
import { UserRole } from '@/domain';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import type { StepProps } from '../types';

interface Props extends StepProps {
  onNext: () => void;
}

export const Step1Credentials: React.FC<Props> = ({ formData, updateForm, onNext }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Role Selection */}
      <div className="space-y-2">
        <label className="text-sm font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1">
          {t('register.role.label')}
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => updateForm({ role: UserRole.PATIENT })}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              formData.role === UserRole.PATIENT
                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                : 'border-brand-light/60 bg-white/40 hover:bg-white/60 hover:border-primary/50'
            }`}
          >
            <User className={formData.role === UserRole.PATIENT ? 'text-primary' : 'text-brand-dark/40'} size={28} />
            <span className={`font-heading tracking-widest text-lg ${formData.role === UserRole.PATIENT ? 'text-primary font-bold' : 'text-brand-dark/60'}`}>
              {t('register.role.patient')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ role: UserRole.SPECIALIST })}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              formData.role === UserRole.SPECIALIST
                ? 'border-accent bg-accent/5 shadow-md ring-2 ring-accent/20'
                : 'border-brand-light/60 bg-white/40 hover:bg-white/60 hover:border-accent/50'
            }`}
          >
            <Stethoscope className={formData.role === UserRole.SPECIALIST ? 'text-accent' : 'text-brand-dark/40'} size={28} />
            <span className={`font-heading tracking-widest text-lg ${formData.role === UserRole.SPECIALIST ? 'text-accent font-bold' : 'text-brand-dark/60'}`}>
              {t('register.role.specialist')}
            </span>
          </button>
        </div>
      </div>

      <Input
        label={t('register.fields.email')}
        type="email"
        value={formData.email}
        onChange={(e) => updateForm({ email: e.target.value })}
        placeholder="nume@exemplu.ro"
        required
      />
      
      <Input
        label={t('register.fields.password')}
        type="password"
        value={formData.password}
        onChange={(e) => updateForm({ password: e.target.value })}
        placeholder="••••••••"
        required
      />
      
      <Input
        label={t('register.fields.confirmPassword')}
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => updateForm({ confirmPassword: e.target.value })}
        placeholder="••••••••"
        required
      />

      <Button type="button" onClick={onNext} className="w-full flex justify-between items-center group">
        <span>{t('register.buttons.next')}</span>
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
};

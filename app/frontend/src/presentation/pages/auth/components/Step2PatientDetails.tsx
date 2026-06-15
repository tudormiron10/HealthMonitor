import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import type { StepProps } from '../types';

interface Props extends StepProps {
  onBack: () => void;
  isLoading: boolean;
}

export const Step2PatientDetails: React.FC<Props> = ({ formData, updateForm, onBack, isLoading }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('register.fields.firstName')}
          value={formData.firstName}
          onChange={(e) => updateForm({ firstName: e.target.value })}
          required
        />
        <Input
          label={t('register.fields.lastName')}
          value={formData.lastName}
          onChange={(e) => updateForm({ lastName: e.target.value })}
          required
        />
      </div>

      <Input
        label={t('register.fields.dateOfBirth')}
        type="date"
        value={formData.dateOfBirth}
        onChange={(e) => updateForm({ dateOfBirth: e.target.value })}
        required
      />
      
      <div className="space-y-1.5 flex flex-col w-full">
        <label className="text-sm font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1">
          {t('register.fields.sex')}
        </label>
        <select
          value={formData.sex}
          onChange={(e) => updateForm({ sex: Number(e.target.value) })}
          className="w-full bg-white/40 border border-brand-light/60 text-brand-dark px-4 py-3 rounded-xl shadow-sm backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        >
          <option value={1}>{t('register.params.male')}</option>
          <option value={2}>{t('register.params.female')}</option>
        </select>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="px-4">
          <ArrowLeft size={20} />
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? t('register.buttons.loading') : t('register.buttons.submit')}
        </Button>
      </div>
    </div>
  );
};

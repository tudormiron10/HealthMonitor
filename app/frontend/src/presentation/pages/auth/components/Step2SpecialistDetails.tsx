import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Stethoscope, Leaf, Dumbbell } from 'lucide-react';
import { Input } from '@/presentation/components/ui/Input';
import { Button } from '@/presentation/components/ui/Button';
import { UserRole } from '@/domain/enums/UserRole';
import { MedicalSpecialization, MEDICAL_SPECIALIZATIONS } from '@/domain/models/MedicalSpecialization';
import type { StepProps } from '../types';

interface Props extends StepProps {
  onBack: () => void;
  isLoading: boolean;
}

function specializationKey(value: string): string {
  const entry = Object.entries(MedicalSpecialization).find(([, v]) => v === value);
  return entry ? entry[0] : value;
}

const SUB_ROLES = [
  { role: UserRole.DOCTOR,       icon: Stethoscope, key: 'register.subrole.doctor'       },
  { role: UserRole.NUTRITIONIST, icon: Leaf,        key: 'register.subrole.nutritionist' },
  { role: UserRole.COACH,        icon: Dumbbell,    key: 'register.subrole.coach'         },
] as const;

export const Step2SpecialistDetails: React.FC<Props> = ({ formData, updateForm, onBack, isLoading }) => {
  const { t } = useTranslation();

  // Initialise sub-role on first render (coming from the generic SPECIALIST selection)
  useEffect(() => {
    if (formData.role !== UserRole.DOCTOR && formData.role !== UserRole.NUTRITIONIST && formData.role !== UserRole.COACH) {
      updateForm({ role: UserRole.DOCTOR, specialization: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubRoleChange = (role: string) => {
    if (role === UserRole.NUTRITIONIST) {
      updateForm({ role, specialization: MedicalSpecialization.NUTRITIONIST });
    } else if (role === UserRole.COACH) {
      updateForm({ role, specialization: MedicalSpecialization.COACH });
    } else {
      updateForm({ role, specialization: '' });
    }
  };

  const isDoctor = formData.role === UserRole.DOCTOR;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Name */}
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

      {/* Sub-role selector */}
      <div className="space-y-2">
        <label className="text-sm font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1">
          {t('register.subrole.label')}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {SUB_ROLES.map(({ role, icon: Icon, key }) => {
            const active = formData.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleSubRoleChange(role)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  active
                    ? 'border-accent bg-accent/5 shadow-md ring-2 ring-accent/20'
                    : 'border-brand-light/60 bg-white/40 hover:bg-white/60 hover:border-accent/50'
                }`}
              >
                <Icon size={22} className={active ? 'text-accent' : 'text-brand-dark/40'} />
                <span className={`font-heading tracking-widest text-sm ${active ? 'text-accent font-bold' : 'text-brand-dark/60'}`}>
                  {t(key)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specialization */}
      <div className="space-y-2">
        <label className="text-sm font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1">
          {t('register.fields.specialization')}
          {isDoctor && <span className="text-secondary ml-1">*</span>}
        </label>
        {isDoctor ? (
          <select
            value={formData.specialization}
            onChange={(e) => updateForm({ specialization: e.target.value })}
            required
            className="w-full px-4 py-3 rounded-xl border border-brand-light/60 bg-white/70 text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          >
            <option value="">{t('register.placeholders.specialization')}</option>
            {MEDICAL_SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>
                {t(`specialistDashboard.specialization.${specializationKey(spec)}`)}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full px-4 py-3 rounded-xl border border-brand-light/40 bg-brand-light/40 text-brand-dark/60 font-medium">
            {formData.role === UserRole.NUTRITIONIST
              ? t('specialistDashboard.specialization.NUTRITIONIST')
              : t('specialistDashboard.specialization.COACH')}
          </div>
        )}
      </div>

      {formData.role !== UserRole.DOCTOR && (
        <>
          <Input
            label={t('register.fields.licenseNumber')}
            value={formData.licenseNumber}
            onChange={(e) => updateForm({ licenseNumber: e.target.value })}
            placeholder={t('register.placeholders.optional')}
          />
          <Input
            label={t('register.fields.clinic')}
            value={formData.clinic}
            onChange={(e) => updateForm({ clinic: e.target.value })}
            placeholder={t('register.placeholders.optional')}
          />
        </>
      )}

      {/* Role-specific credential fields */}
      {formData.role === UserRole.DOCTOR && (
        <div className="space-y-4 pt-2 border-t border-brand-light/50">
          <Input
            label={t('register.fields.codParafa')}
            value={formData.codParafa}
            onChange={(e) => updateForm({ codParafa: e.target.value })}
            required
          />
          <Input
            label={t('register.fields.unitateSanitara')}
            value={formData.unitateSanitara}
            onChange={(e) => updateForm({ unitateSanitara: e.target.value })}
            required
          />
        </div>
      )}

      {formData.role === UserRole.NUTRITIONIST && (
        <div className="space-y-4 pt-2 border-t border-brand-light/50">
          <Input
            label={t('register.fields.numarOndr')}
            value={formData.numarOndr}
            onChange={(e) => updateForm({ numarOndr: e.target.value })}
            placeholder={t('register.placeholders.optional')}
          />
          <Input
            label={t('register.fields.institutieAbsolvire')}
            value={formData.institutieAbsolvire}
            onChange={(e) => updateForm({ institutieAbsolvire: e.target.value })}
            required
          />
        </div>
      )}

      {formData.role === UserRole.COACH && (
        <div className="space-y-4 pt-2 border-t border-brand-light/50">
          <div className="space-y-2">
            <label className="text-sm font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1">
              {t('register.fields.tipCertificare')}
              <span className="text-secondary ml-1">*</span>
            </label>
            <select
              value={formData.tipCertificare}
              onChange={(e) => updateForm({ tipCertificare: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-brand-light/60 bg-white/70 text-brand-dark font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            >
              <option value="">{t('register.tipCertificare.placeholder')}</option>
              {(['ANEFS', 'NASM', 'ACE', 'ISSA', 'ALTELE'] as const).map((val) => (
                <option key={val} value={val}>{t(`register.tipCertificare.${val}`)}</option>
              ))}
            </select>
          </div>
          <Input
            label={t('register.fields.numarCertificare')}
            value={formData.numarCertificare}
            onChange={(e) => updateForm({ numarCertificare: e.target.value })}
            required
          />
        </div>
      )}

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

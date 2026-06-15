import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import type { UseFormRegister, UseFormHandleSubmit, FieldValues } from 'react-hook-form';
import { Input } from '@/presentation/components/ui/Input';

const TOTAL_MARKERS = 26;

interface ManualEntryFormProps {
  register: UseFormRegister<FieldValues>;
  handleSubmit: UseFormHandleSubmit<FieldValues>;
  onSubmit: (data: FieldValues) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  filledCount: number;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({
  register,
  handleSubmit,
  onSubmit,
  isSubmitting,
  canSubmit,
  filledCount,
}) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      {/* General Info */}
      <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-secondary-soft">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(193,124,116,0.05),transparent_50%)]"></div>
        <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
          {t('records.generalInfo')}
          <span className="text-[10px] font-mono text-secondary-soft tracking-[0.2em] uppercase">SYSTEM SYNC</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
          <Input
            label={t('records.date')}
            type="date"
            {...register('record_date')}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>
      </section>

      {/* Completeness indicator */}
      {(() => {
        const pct = Math.round((filledCount / TOTAL_MARKERS) * 100);
        const barColor = filledCount < 8 ? 'bg-secondary' : filledCount < 19 ? 'bg-amber-500' : 'bg-emerald-500';
        const labelColor = filledCount < 8 ? 'text-secondary' : filledCount < 19 ? 'text-amber-600' : 'text-emerald-600';
        const statusKey = filledCount < 8 ? 'records.completenessLow' : filledCount < 19 ? 'records.completenessModerate' : 'records.completenessGood';
        return (
          <div className="bg-white/80 border border-brand-light rounded-2xl px-5 py-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm text-brand-dark/70">
                  {t('records.completenessEncouragement')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold font-mono text-brand-dark">
                  {filledCount}<span className="text-brand-dark/40">/{TOTAL_MARKERS}</span>
                </span>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>
                  {t(statusKey)} · {pct}%
                </p>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-brand-dark/8 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-primary">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(46,61,36,0.05),transparent_50%)]"></div>
            <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
              {t('records.biometrics')}
              <span className="text-[10px] font-mono text-primary tracking-[0.2em] uppercase">REAL-TIME FEED</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div className="flex flex-col gap-1.5 w-full min-w-0">
                <label 
                  className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1 truncate block"
                  title={t('records.sexLabel')}
                >
                  {t('records.sexLabel')}
                </label>
                <select 
                  {...register('sex')}
                  className="w-full bg-white/40 border border-brand-light/60 text-brand-dark px-4 py-3 rounded-xl shadow-sm backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="">{t('records.sexNone')}</option>
                  <option value="1">{t('records.sexMale')}</option>
                  <option value="2">{t('records.sexFemale')}</option>
                </select>
              </div>
              <Input label={t('records.age')} type="number" step="any" {...register('age')} />
              <Input label="BMI" type="number" step="any" {...register('bmi')} />
              <Input label={t('records.waist')} type="number" step="any" {...register('waist_circumference')} />
              <div className="flex flex-col gap-1.5 w-full min-w-0">
                <label 
                  className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1 truncate block"
                  title={t('records.smokerLabel')}
                >
                  {t('records.smokerLabel')}
                </label>
                <select 
                  {...register('smoker_status')}
                  className="w-full bg-white/40 border border-brand-light/60 text-brand-dark px-4 py-3 rounded-xl shadow-sm backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                >
                  <option value="">{t('records.sexNone')}</option>
                  <option value="0">{t('records.smokerNo')}</option>
                  <option value="1">{t('records.smokerYes')}</option>
                </select>
              </div>
              <Input label={t('records.systolic')} type="number" step="any" {...register('systolic_bp')} />
              <Input label={t('records.diastolic')} type="number" step="any" {...register('diastolic_bp')} />
            </div>
          </section>

          <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-accent">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(57,115,103,0.05),transparent_50%)]"></div>
            <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
              {t('records.glucoseLipids')}
              <span className="text-[10px] font-mono text-accent tracking-[0.2em] uppercase">METABOLIC DATA</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <Input label="HbA1c (%)" type="number" step="any" {...register('hba1c')} />
              <Input label={t('records.fastingGlucose')} type="number" step="any" {...register('fasting_glucose')} />
              <Input label={t('records.totalCholesterol')} type="number" step="any" {...register('total_cholesterol')} />
              <Input label="HDL (mg/dL)" type="number" step="any" {...register('hdl')} />
              <Input label="LDL (mg/dL)" type="number" step="any" {...register('ldl')} />
              <Input label={t('records.triglycerides')} type="number" step="any" {...register('triglycerides')} />
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-primary-hover">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(140,70,43,0.05),transparent_50%)]"></div>
            <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
              {t('records.liverInflammation')}
              <span className="text-[10px] font-mono text-primary-hover tracking-[0.2em] uppercase">ORGAN STATUS</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <Input label="ALT (U/L)" type="number" step="any" {...register('alt')} />
              <Input label="AST (U/L)" type="number" step="any" {...register('ast')} />
              <Input label="GGT (U/L)" type="number" step="any" {...register('ggt')} />
              <Input label="CRP (mg/L)" type="number" step="any" {...register('crp')} />
            </div>
          </section>

          <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-accent-hover">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,127,80,0.05),transparent_50%)]"></div>
            <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
              {t('records.kidneyFunction')}
              <span className="text-[10px] font-mono text-accent-hover tracking-[0.2em] uppercase">FILTRATION</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <Input label={t('records.creatinine')} type="number" step="any" {...register('creatinine')} />
              <Input label={t('records.urea')} type="number" step="any" {...register('urea')} />
              <Input label="UACR (mg/g)" type="number" step="any" {...register('uacr')} />
              <Input label={t('records.uricAcid')} type="number" step="any" {...register('uric_acid')} />
            </div>
          </section>

          <section className="relative bg-white/80 p-6 rounded-2xl border border-brand-light shadow-lg backdrop-blur-sm group border-l-4 border-l-brand-dark">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(94,10,10,0.05),transparent_50%)]"></div>
            <h3 className="text-2xl font-iceland text-brand-dark flex items-center justify-between border-b border-brand-dark/10 pb-3 mb-5 relative z-10">
              {t('records.hematology')}
              <span className="text-[10px] font-mono text-brand-dark/40 tracking-[0.2em] uppercase">BLOOD PANEL</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <Input label={t('records.hemoglobin')} type="number" step="any" {...register('hemoglobin')} />
              <Input label="MCV (fL)" type="number" step="any" {...register('mcv')} />
              <Input label={t('records.ferritin')} type="number" step="any" {...register('ferritin')} />
              <Input label={t('records.vitaminD')} type="number" step="any" {...register('vitamin_d')} />
              <Input label={t('records.folate')} type="number" step="any" {...register('folate')} />
            </div>
          </section>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        {!canSubmit && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <span>⚠</span>
            <span>{t('records.minimumFieldsRequired')}</span>
          </div>
        )}
        {canSubmit && filledCount < 8 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <span>ℹ</span>
            <span>{t('records.lowDataWarning', { count: filledCount })}</span>
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`w-full md:w-auto px-10 py-3 font-iceland text-2xl rounded-xl transition-all duration-300 shadow-lg hover:-translate-y-0.5 ${
              isSubmitting || !canSubmit
                ? 'bg-brand-dark/30 text-white/50 cursor-not-allowed'
                : 'bg-primary-hover text-brand-light hover:bg-primary'
            }`}
          >
            {isSubmitting ? t('records.saveLoading') : t('records.saveButton')}
          </button>
        </div>
      </div>
    </form>
  );
};

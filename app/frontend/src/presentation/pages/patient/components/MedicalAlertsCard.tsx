import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';

const RED_FLAG_THRESHOLD = 0.7;
const STALE_AFTER_DAYS = 180;

interface MedicalAlertsCardProps {
  records: MedicalRecordRead[];
  prediction: PredictionRead | null;
  loading: boolean;
}

export const MedicalAlertsCard: React.FC<MedicalAlertsCardProps> = ({ records, prediction, loading }) => {
  const { t } = useTranslation();

  const riskAlerts = prediction
    ? Object.entries(prediction.metrics)
        .filter(([, m]) => m.probability != null && m.probability >= RED_FLAG_THRESHOLD)
        .map(([slug, m]) => ({ slug, pct: Math.round((m.probability as number) * 100) }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  const latestRecordDate = records[0]?.record_date ?? null;
  const ageDays = latestRecordDate
    ? Math.floor((Date.now() - new Date(latestRecordDate).getTime()) / 86_400_000)
    : null;
  const stale = ageDays != null && ageDays >= STALE_AFTER_DAYS;
  const staleMonths = ageDays != null ? Math.round(ageDays / 30) : 0;

  const hasData = records.length > 0;
  const allClear = hasData && riskAlerts.length === 0 && !stale;

  return (
    <div className="h-44 rounded-xl border border-brand-dark/10 bg-white/50 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <AlertTriangle className="w-4 h-4 text-secondary" />
        <span className="font-heading text-lg text-brand-dark">{t('patientDashboard.alerts')}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
        {loading ? (
          <div className="h-full flex items-center justify-center text-brand-dark/40 text-sm">
            {t('patientDashboard.loading')}
          </div>
        ) : !hasData ? (
          <Link
            to="/dashboard/patient/add-record"
            className="flex items-start gap-2 text-sm text-brand-dark/70 hover:text-primary transition-colors"
          >
            <Upload className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t('patientDashboard.alertsNoData')}</span>
          </Link>
        ) : (
          <>
            {riskAlerts.map(({ slug, pct }) => (
              <div key={slug} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-brand-dark/80 truncate">
                  {t(`predictions.conditions.${slug}`, slug)}
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-semibold text-xs">
                  {pct}%
                </span>
              </div>
            ))}

            {stale && (
              <div className="flex items-start gap-2 text-sm text-brand-dark/60">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t('patientDashboard.alertsStale', { months: staleMonths })}</span>
              </div>
            )}

            {allClear && (
              <div className="h-full flex items-center gap-2 text-sm text-accent">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t('patientDashboard.alertsNone')}</span>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && riskAlerts.length > 0 && prediction && (
        <div className="shrink-0 pt-2 mt-1 border-t border-brand-dark/5 flex items-center justify-between">
          <span className="text-[11px] text-brand-dark/40">{t('patientDashboard.alertsDisclaimer')}</span>
          <Link
            to={`/dashboard/patient/predictions/${prediction.medical_record_id}`}
            className="text-xs text-primary hover:underline shrink-0"
          >
            {t('patientDashboard.alertsViewResults')}
          </Link>
        </div>
      )}
    </div>
  );
};

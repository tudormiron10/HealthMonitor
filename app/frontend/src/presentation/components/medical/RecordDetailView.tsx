import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, Edit3, Lock } from 'lucide-react';
import { HealthScoreGauge } from '@/presentation/components/charts/HealthScoreGauge';
import { RiskGrid } from '@/presentation/components/charts/RiskGrid';
import { SingleRecordMarkersTable } from '@/presentation/components/medical/SingleRecordMarkersTable';
import { DocumentLink } from '@/presentation/components/ui/DocumentLink';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';
import { formatDate } from '@/application/utils/formatDate';

export type RecordDetailError = 'notFound' | 'noAccess';

interface Props {
  record: MedicalRecordRead | null;
  prediction: PredictionRead | null;
  loading: boolean;
  error: RecordDetailError | null;
  backTo: string;
  backLabelKey: string;
  onRequestAccess?: (marker?: string) => void;
}

const Skeleton: React.FC = () => (
  <div className="w-full max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-brand-dark/10" />
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-xl bg-brand-dark/10" />
        <div className="h-4 w-24 rounded-full bg-brand-dark/8" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 h-56 rounded-3xl bg-brand-dark/8" />
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-brand-dark/8" />
        ))}
      </div>
    </div>
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-brand-dark/8" />
      ))}
    </div>
  </div>
);

export const RecordDetailView: React.FC<Props> = ({
  record,
  prediction,
  loading,
  error,
  backTo,
  backLabelKey,
  onRequestAccess,
}) => {
  const { t, i18n } = useTranslation();

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-xl font-heading text-brand-dark">
          {error === 'noAccess' ? t('recordDetail.noAccess') : t('recordDetail.notFound')}
        </p>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t(backLabelKey)}
        </Link>
      </div>
    );
  }

  if (!record) return null;

  const isPdf = record.source === 'PDF_PARSED';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to={backTo}
            className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-primary hover:bg-white transition-all shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col">
              <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark">
                {formatDate(record.record_date, i18n.language)}
              </h1>
              <span className="text-xs text-brand-dark/40">
                {t('recordDetail.uploadedAt', { date: formatDate(record.created_at, i18n.language, 'short') })}
              </span>
            </div>
            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              isPdf ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
            }`}>
              {isPdf ? <FileText className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              {isPdf ? t('recordDetail.sourcePdf') : t('recordDetail.sourceManual')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {record.document_url && (
            <DocumentLink
              path={record.document_url}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 bg-white/60 text-brand-dark/70 hover:bg-primary hover:text-white hover:border-primary transition-colors text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              {t('recordDetail.viewOriginalPdf')}
            </DocumentLink>
          )}
          {onRequestAccess && (
            <button
              type="button"
              onClick={() => onRequestAccess()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 bg-white/60 text-brand-dark/70 hover:bg-primary hover:text-white hover:border-primary transition-colors text-sm font-medium"
            >
              <Lock className="w-4 h-4" />
              {t('recordDetail.requestAccessCta')}
            </button>
          )}
        </div>
      </div>

      {/* Health Score + Risk Grid */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <HealthScoreGauge healthScore={prediction.health_score} />
          </div>
          <div className="lg:col-span-2">
            <RiskGrid metrics={prediction.metrics} />
          </div>
        </div>
      )}

      {/* Markers vs. clinical standards */}
      <SingleRecordMarkersTable record={record} onRequestAccess={onRequestAccess} />
    </div>
  );
};

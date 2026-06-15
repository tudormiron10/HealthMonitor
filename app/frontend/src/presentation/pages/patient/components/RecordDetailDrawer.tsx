import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Activity, ArrowRight, Loader2, FileText, Edit3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { predictionsApi, type PredictionRead } from '@/infrastructure/api/predictionsApi';
import { SingleRecordMarkersTable } from '@/presentation/components/medical/SingleRecordMarkersTable';
import { DocumentLink } from '@/presentation/components/ui/DocumentLink';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import { formatDate } from '@/application/utils/formatDate';

interface Props {
  record: MedicalRecordRead | null;
  isOpen: boolean;
  onClose: () => void;
}

const getScoreStyle = (score: number) => {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (score >= 50) return 'bg-amber-50 border-amber-200 text-amber-700';
  return 'bg-rose-50 border-rose-200 text-rose-700';
};

const getRiskBarColor = (pct: number) =>
  pct >= 70 ? 'bg-rose-500' : pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500';

const getRiskChipStyle = (pct: number) =>
  pct >= 70 ? 'bg-rose-50 text-rose-700' : pct >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

export const RecordDetailDrawer: React.FC<Props> = ({ record, isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [prediction, setPrediction] = useState<PredictionRead | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !record) { setPrediction(null); return; }
    let cancelled = false;
    setLoading(true);
    setPrediction(null);
    predictionsApi.getRecordPredictions(record.id)
      .then((preds) => { if (!cancelled) setPrediction(preds[0] ?? null); })
      .catch(() => { if (!cancelled) setPrediction(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, record?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const isPdf = record?.source === 'PDF_PARSED';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-bg-main shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-dark/10 flex items-start gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-heading text-brand-dark">{t('timeline.drawerTitle')}</h2>
            {record && (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-brand-dark/60">
                    {formatDate(record.record_date, i18n.language)}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isPdf ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isPdf ? <FileText className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                    {isPdf ? t('timeline.sourcePdf') : t('timeline.sourceManual')}
                  </span>
                </div>
                <span className="block text-xs text-brand-dark/40 mt-0.5">
                  {t('timeline.uploadedAt', { date: formatDate(record.created_at, i18n.language, 'short') })}
                </span>
                {record.document_url && (
                  <DocumentLink
                    path={record.document_url}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-accent font-bold hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {t('recordDetail.viewOriginalPdf')}
                  </DocumentLink>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 p-2 rounded-xl text-brand-dark/40 hover:text-brand-dark hover:bg-brand-dark/5 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && record && (
            <>
              {/* Health Score */}
              {prediction ? (
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${getScoreStyle(prediction.health_score)}`}>
                  <Activity className="w-7 h-7 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 leading-none">
                      {t('timeline.healthScore')}
                    </p>
                    <p className="text-4xl font-iceland font-bold leading-none mt-1">
                      {prediction.health_score}
                      <span className="text-xl opacity-60">/100</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 rounded-2xl border border-dashed border-brand-dark/20 text-brand-dark/40 text-sm font-mono text-center">
                  {t('timeline.noPrediction')}
                </div>
              )}

              {/* Risk summary */}
              {prediction && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/50 font-heading mb-3">
                    {t('timeline.riskSummary')}
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(prediction.metrics).map(([slug, result]) => {
                      if (result.probability === null) return null;
                      const pct = Math.round(result.probability * 100);
                      return (
                        <div key={slug} className="flex items-center gap-3 py-2 px-4 bg-brand-dark/2 rounded-xl">
                          <span className="flex-1 text-sm text-brand-dark font-medium truncate">
                            {t(`predictions.conditions.${slug}`, slug)}
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-brand-dark/10 overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full ${getRiskBarColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${getRiskChipStyle(pct)}`}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Raw markers */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/50 font-heading mb-3">
                  {t('timeline.rawMarkers')}
                </h3>
                <SingleRecordMarkersTable record={record} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {record && (
          <div className="px-6 py-4 border-t border-brand-dark/10 shrink-0">
            <Link
              to={`/dashboard/patient/predictions/${record.id}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              {t('timeline.viewFullResults')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

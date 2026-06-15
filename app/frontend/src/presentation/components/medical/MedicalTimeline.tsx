import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Edit3, Activity, ArrowRight, Download, Loader2 } from 'lucide-react';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';
import { formatDate } from '@/application/utils/formatDate';

interface MedicalTimelineProps {
  records: MedicalRecordRead[];
  predictions: PredictionRead[];
  onDownloadReport?: (predictionId: string) => Promise<void>;
  onOpenDrawer?: (record: MedicalRecordRead) => void;
  getRecordUrl?: (record: MedicalRecordRead) => string;
}

export const MedicalTimeline: React.FC<MedicalTimelineProps> = ({ records, predictions, onDownloadReport, onOpenDrawer, getRecordUrl }) => {
  const { t, i18n } = useTranslation();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const sortedRecords = [...records].sort((a, b) => {
    const byDate = new Date(b.record_date).getTime() - new Date(a.record_date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="bg-white/80 border border-brand-light shadow-xl shadow-brand-dark/5 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
      <div className="mb-8">
        <h3 className="text-2xl font-iceland text-brand-dark tracking-wide">
          {t('timeline.title')}
        </h3>
        <p className="text-xs font-mono text-brand-dark/50 uppercase tracking-widest mt-1">
          {t('timeline.subtitle')}
        </p>
      </div>

      <div className="relative border-l-2 border-brand-light/50 ml-4 space-y-8 pb-4">
        {sortedRecords.map((record) => {
          const prediction = predictions.find(p => p.medical_record_id === record.id);
          const isPdf = record.source === 'PDF_PARSED';
          const score = prediction?.health_score;

          return (
            <div key={record.id} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute -left-2.75 top-1.5 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm" />

              <div className="bg-white border border-brand-light/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                  {/* Left info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-brand-dark">
                        {formatDate(record.record_date, i18n.language)}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isPdf ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isPdf ? <FileText className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                        {isPdf ? t('timeline.sourcePdf') : t('timeline.sourceManual')}
                      </span>
                    </div>
                    <span className="text-xs text-brand-dark/40">
                      {t('timeline.uploadedAt', { date: formatDate(record.created_at, i18n.language, 'short') })}
                    </span>
                  </div>

                  {/* Right actions & score */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {score !== undefined ? (
                      <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${getScoreColor(score)}`}>
                        <Activity className="w-4 h-4" />
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-bold opacity-80 leading-none">
                            {t('timeline.healthScore')}
                          </span>
                          <span className="text-xl font-iceland font-bold leading-none mt-1">{score}/100</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2 rounded-xl border border-dashed border-brand-light bg-slate-50 text-slate-400 text-xs font-mono">
                        {t('timeline.noPrediction')}
                      </div>
                    )}

                    {onDownloadReport && prediction && (
                      <button
                        onClick={async () => {
                          setDownloadingId(prediction.id);
                          try { await onDownloadReport(prediction.id); }
                          finally { setDownloadingId(null); }
                        }}
                        disabled={downloadingId === prediction.id}
                        className="p-3 rounded-xl bg-brand-light/20 text-brand-dark hover:bg-accent hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={t('predictions.downloadReport')}
                      >
                        {downloadingId === prediction.id
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <Download className="w-5 h-5" />}
                      </button>
                    )}

                    {onOpenDrawer ? (
                      <button
                        type="button"
                        onClick={() => onOpenDrawer(record)}
                        className="ml-auto sm:ml-0 p-3 rounded-xl bg-brand-light/20 text-brand-dark hover:bg-primary hover:text-white transition-colors group-hover:shadow-lg group-hover:shadow-primary/20"
                        title={t('timeline.viewDetails')}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <Link
                        to={getRecordUrl ? getRecordUrl(record) : `/dashboard/patient/predictions/${record.id}`}
                        className="ml-auto sm:ml-0 p-3 rounded-xl bg-brand-light/20 text-brand-dark hover:bg-primary hover:text-white transition-colors group-hover:shadow-lg group-hover:shadow-primary/20"
                        title={t('timeline.viewDetails')}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    )}
                  </div>

                </div>
              </div>
            </div>
          );
        })}

        {sortedRecords.length === 0 && (
          <div className="pl-8 text-brand-dark/50 font-mono text-sm">
            {t('timeline.noRecords')}
          </div>
        )}
      </div>
    </div>
  );
};

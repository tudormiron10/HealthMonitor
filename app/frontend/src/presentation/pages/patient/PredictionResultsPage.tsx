import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Download, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { predictionsApi, type PredictionRead } from '@/infrastructure/api/predictionsApi';
import { recordsApi } from '@/infrastructure/api/recordsApi';

import { PredictionLoadingState } from './components/PredictionLoadingState';
import { PredictionErrorState } from './components/PredictionErrorState';
import { HealthScoreGauge } from '@/presentation/components/charts/HealthScoreGauge';
import { RiskGrid } from '@/presentation/components/charts/RiskGrid';

const TOTAL_MARKERS = 26;

export const PredictionResultsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionRead | null>(null);
  const [markerCount, setMarkerCount] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!prediction) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await predictionsApi.downloadReport(prediction.id, i18n.language.startsWith("en") ? "en" : "ro");
    } catch {
      setDownloadError(t('predictions.downloadError'));
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;

    const loadPrediction = async () => {
      try {
        const [existing, allRecords] = await Promise.all([
          predictionsApi.getRecordPredictions(recordId),
          recordsApi.getMyRecords(),
        ]);
        if (cancelled) return;

        const record = allRecords.find((r) => r.id === recordId);
        if (record?.raw_markers) {
          const markers = record.raw_markers as Record<string, unknown>;
          const filled = Object.values(markers).filter((v) => v !== null && v !== undefined).length;
          setMarkerCount(filled);
        }

        // Predictions are generated eagerly at record save, so one should already
        // exist. A missing one is an edge case (legacy data) recoverable via retry.
        if (existing && existing.length > 0) {
          setPrediction(existing[0]);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Error fetching predictions:", err);
          setError(err.response?.data?.detail || t('predictions.error.defaultMsg'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPrediction();
    return () => { cancelled = true; };
  }, [recordId]);

  const handleRetry = async () => {
    if (!recordId) return;
    setRetrying(true);
    setError(null);
    try {
      const created = await predictionsApi.runPredictions(recordId);
      setPrediction(created);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('predictions.error.defaultMsg'));
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <PredictionLoadingState />;
  }

  if (!prediction) {
    return (
      <PredictionErrorState
        error={error ?? t('predictions.error.notFoundMsg')}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  const { health_score, metrics } = prediction;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-slide-up">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/dashboard/patient')}
          className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-primary hover:bg-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-4xl md:text-5xl font-iceland tracking-wide text-brand-dark flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            {t('predictions.title')}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-brand-light rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            {t('predictions.downloadReport')}
          </button>
          {downloadError && (
            <p className="text-xs text-red-600">{downloadError}</p>
          )}
        </div>
      </div>

      {/* Data completeness banner */}
      {markerCount !== null && markerCount < Math.round(TOTAL_MARKERS * 0.7) && (
        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${
          markerCount < Math.round(TOTAL_MARKERS * 0.3)
            ? 'bg-secondary/10 border-secondary/30 text-secondary'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            {markerCount < Math.round(TOTAL_MARKERS * 0.3)
              ? t('predictions.completenessLow', { count: markerCount, total: TOTAL_MARKERS })
              : t('predictions.completenessMedium', { count: markerCount, total: TOTAL_MARKERS })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <HealthScoreGauge healthScore={health_score} />
        </div>
        <div className="lg:col-span-2">
          <RiskGrid metrics={metrics} />
        </div>
      </div>
    </div>
  );
};

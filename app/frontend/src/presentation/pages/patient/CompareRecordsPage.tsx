import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitCompare, Loader2 } from 'lucide-react';


import { recordsApi } from '@/infrastructure/api/recordsApi';
import { predictionsApi } from '@/infrastructure/api/predictionsApi';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';
import { HealthScoreGauge } from '@/presentation/components/charts/HealthScoreGauge';
import { RiskGrid } from '@/presentation/components/charts/RiskGrid';
import { CompareSelectors } from './components/CompareSelectors';
import { RawMarkersTable } from '@/presentation/components/medical/RawMarkersTable';

export const CompareRecordsPage: React.FC = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<MedicalRecordRead[]>([]);
  const [predictions, setPredictions] = useState<PredictionRead[]>([]);
  const [loading, setLoading] = useState(true);

  const [recordAId, setRecordAId] = useState<string>('');
  const [recordBId, setRecordBId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recs, preds] = await Promise.all([
          recordsApi.getMyRecords(),
          predictionsApi.getMyHistory()
        ]);
        
        const now = Date.now();
        const sortedRecs = [...recs].sort((a, b) => {
          const byDate = new Date(b.record_date).getTime() - new Date(a.record_date).getTime();
          if (byDate !== 0) return byDate;
          // Tiebreaker: smallest distance to now = most recently created
          const distA = Math.abs(now - new Date(a.created_at).getTime());
          const distB = Math.abs(now - new Date(b.created_at).getTime());
          return distA - distB;
        });

        setRecords(sortedRecs);
        setPredictions(preds);

        if (sortedRecs.length >= 2) {
          setRecordAId(sortedRecs[0].id);
          setRecordBId(sortedRecs[1].id);
        } else if (sortedRecs.length === 1) {
          setRecordAId(sortedRecs[0].id);
        }
      } catch (err) {
        console.error("Error fetching comparison data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (recordAId && recordBId && records.length >= 2) {
      const idxA = records.findIndex(r => r.id === recordAId);
      const idxB = records.findIndex(r => r.id === recordBId);
      
      if (idxB !== -1 && idxA !== -1 && idxB < idxA) {
        setRecordAId(recordBId);
        setRecordBId(recordAId);
      }
    }
  }, [recordAId, recordBId, records]);

  if (loading) {
    return (
      <div className="flex-1 w-full h-full min-h-100 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-brand-dark/60 font-mono animate-pulse">
          {t('comparePage.loading')}
        </p>
      </div>
    );
  }

  if (records.length < 2) {
    return (
      <div className="flex-1 w-full h-full min-h-100 flex flex-col items-center justify-center p-8">
        <GitCompare className="w-16 h-16 text-brand-dark/20 mb-4" />
        <h2 className="text-2xl font-heading text-brand-dark mb-2">{t('comparePage.insufficientTitle')}</h2>
        <p className="text-brand-dark/60">
          {t('comparePage.noRecords')}
        </p>
        <Link to="/dashboard/patient/add-record" className="mt-6 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
          {t('comparePage.addRecordsLink')}
        </Link>
      </div>
    );
  }

  const recordA = records.find(r => r.id === recordAId);
  const recordB = records.find(r => r.id === recordBId);
  
  const predictionA = predictions.find(p => p.medical_record_id === recordAId);
  const predictionB = predictions.find(p => p.medical_record_id === recordBId);


  // List of all keys we care about
  const markerKeys = recordA && recordB ? Array.from(new Set([
    ...Object.keys(recordA.raw_markers || {}),
    ...Object.keys(recordB.raw_markers || {})
  ])) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link 
          to="/dashboard"
          className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-primary hover:bg-white transition-all shadow-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark flex items-center gap-3">
            {t('comparePage.title')}
          </h1>
          <p className="text-brand-dark/60 mt-1 font-medium">
            {t('comparePage.subtitle')}
          </p>
        </div>
      </div>

      {/* Selectors */}
      <CompareSelectors
        records={records}
        recordAId={recordAId}
        recordBId={recordBId}
        setRecordAId={setRecordAId}
        setRecordBId={setRecordBId}
      />

      {recordA && recordB && (
        <div className="space-y-8">
          {/* Health Scores Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative">
              <HealthScoreGauge healthScore={predictionA?.health_score || 0} />
            </div>
            <div className="relative">
              <HealthScoreGauge healthScore={predictionB?.health_score || 0} />
            </div>
          </div>

          {/* Risks Comparison */}
          {predictionA && predictionB && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 p-6 rounded-3xl shadow-sm border border-brand-light/50 backdrop-blur-sm">
                <RiskGrid metrics={predictionA.metrics} />
              </div>
              <div className="bg-white/80 p-6 rounded-3xl shadow-sm border border-brand-light/50 backdrop-blur-sm">
                <RiskGrid metrics={predictionB.metrics} />
              </div>
            </div>
          )}

          {/* Raw Markers Comparison */}
          <RawMarkersTable 
            recordA={recordA} 
            recordB={recordB} 
            markerKeys={markerKeys} 
          />
        </div>
      )}
    </div>
  );
};

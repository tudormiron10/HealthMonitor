import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import { predictionsApi, type PredictionRead } from '@/infrastructure/api/predictionsApi';
import { RecordDetailView, type RecordDetailError } from '@/presentation/components/medical/RecordDetailView';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';

export const SingleRecordDetailPage: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>();
  const [record, setRecord] = useState<MedicalRecordRead | null>(null);
  const [prediction, setPrediction] = useState<PredictionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RecordDetailError | null>(null);

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [rec, preds] = await Promise.all([
          recordsApi.getRecord(recordId),
          predictionsApi.getRecordPredictions(recordId),
        ]);
        if (!cancelled) {
          setRecord(rec);
          setPrediction(preds[0] ?? null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.status === 403 ? 'noAccess' : 'notFound');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [recordId]);

  return (
    <RecordDetailView
      record={record}
      prediction={prediction}
      loading={loading}
      error={error}
      backTo="/dashboard/patient/history"
      backLabelKey="recordDetail.backToHistory"
    />
  );
};

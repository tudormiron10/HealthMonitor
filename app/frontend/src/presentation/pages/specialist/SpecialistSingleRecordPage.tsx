import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import { predictionsApi, type PredictionRead } from '@/infrastructure/api/predictionsApi';
import { accessRequestsApi } from '@/infrastructure/api/accessRequestsApi';
import { chatApi } from '@/infrastructure/api/chatApi';
import { useChatContext } from '@/application/hooks/useChatContext';
import { RecordDetailView, type RecordDetailError } from '@/presentation/components/medical/RecordDetailView';
import { AccessRequestModal } from './components/AccessRequestModal';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';

export const SpecialistSingleRecordPage: React.FC = () => {
  const { patientUserId, recordId } = useParams<{ patientUserId: string; recordId: string }>();
  const { latestKeyReissueEvent } = useChatContext();

  const [record, setRecord] = useState<MedicalRecordRead | null>(null);
  const [prediction, setPrediction] = useState<PredictionRead | null>(null);
  const [effectiveAccess, setEffectiveAccess] = useState<Record<string, 'DECRYPTED' | 'LOCKED'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RecordDetailError | null>(null);

  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessConvId, setAccessConvId] = useState<string | null>(null);
  const [openingModal, setOpeningModal] = useState(false);
  const [preCheckedMarker, setPreCheckedMarker] = useState<string | undefined>(undefined);

  const fetchData = async (cancelled: { value: boolean }) => {
    if (!recordId) return;
    try {
      const [rec, preds, access] = await Promise.all([
        recordsApi.getRecordAsSpecialist(recordId),
        predictionsApi.getRecordPredictionsAsSpecialist(recordId),
        patientUserId
          ? accessRequestsApi.getEffectiveAccess(patientUserId)
          : Promise.resolve({} as Record<string, 'DECRYPTED' | 'LOCKED'>),
      ]);
      if (!cancelled.value) {
        setRecord(rec);
        setPrediction(preds[0] ?? null);
        setEffectiveAccess(access);
      }
    } catch (err: any) {
      if (!cancelled.value) setError(err?.response?.status === 403 ? 'noAccess' : 'notFound');
    } finally {
      if (!cancelled.value) setLoading(false);
    }
  };

  useEffect(() => {
    if (!recordId) return;
    const cancelled = { value: false };
    fetchData(cancelled);
    return () => { cancelled.value = true; };
  }, [recordId]);

  useEffect(() => {
    if (latestKeyReissueEvent === 0 || !recordId) return;
    const cancelled = { value: false };
    fetchData(cancelled);
    return () => { cancelled.value = true; };
  }, [latestKeyReissueEvent]);

  const handleOpenAccessModal = async (marker?: string) => {
    if (!patientUserId) return;
    setPreCheckedMarker(marker);
    setOpeningModal(true);
    try {
      const conv = await chatApi.openOrCreateConversation(patientUserId);
      setAccessConvId(conv.id);
      setShowAccessModal(true);
    } catch (err) {
      console.error('Access modal open error:', err);
    } finally {
      setOpeningModal(false);
    }
  };

  return (
    <>
      <RecordDetailView
        record={record}
        prediction={prediction}
        loading={loading}
        error={error}
        backTo={patientUserId ? `/dashboard/specialist/patients/${patientUserId}` : '/dashboard/specialist/patients'}
        backLabelKey="recordDetail.backToPatientSheet"
        onRequestAccess={openingModal ? undefined : handleOpenAccessModal}
      />

      {showAccessModal && accessConvId && patientUserId && (
        <AccessRequestModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          conversationId={accessConvId}
          patientUserId={patientUserId}
          currentMarkersAccess={effectiveAccess}
          preCheckedMarker={preCheckedMarker}
          onSuccess={() => setShowAccessModal(false)}
        />
      )}
    </>
  );
};

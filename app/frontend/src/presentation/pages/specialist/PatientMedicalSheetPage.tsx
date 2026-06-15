import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, MessageSquare, ShieldOff, KeyRound } from 'lucide-react';
import { chatApi } from '@/infrastructure/api/chatApi';
import { useAuth } from '@/application/hooks/useAuth';
import { useChatContext } from '@/application/hooks/useChatContext';
import { UserRole } from '@/domain';
import { recordsApi } from '@/infrastructure/api/recordsApi';
import { predictionsApi } from '@/infrastructure/api/predictionsApi';
import { accessRequestsApi } from '@/infrastructure/api/accessRequestsApi';
import type { PredictionRead } from '@/infrastructure/api/predictionsApi';
import type { MedicalRecordRead } from '@/domain/models/MedicalRecord';
import { MarkerTrendChart } from '@/presentation/components/charts/MarkerTrendChart';
import { MedicalTimeline } from '@/presentation/components/medical/MedicalTimeline';
import { RawMarkersTable } from '@/presentation/components/medical/RawMarkersTable';
import { AccessRequestModal } from './components/AccessRequestModal';

export const PatientMedicalSheetPage: React.FC = () => {
  const { patientUserId } = useParams<{ patientUserId: string }>();
  const { role } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { latestKeyReissueEvent } = useChatContext();

  const [records, setRecords] = useState<MedicalRecordRead[]>([]);
  const [effectiveAccess, setEffectiveAccess] = useState<Record<string, 'DECRYPTED' | 'LOCKED'>>({});
  const [chatting, setChatting] = useState(false);
  const [predictions, setPredictions] = useState<PredictionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessConvId, setAccessConvId] = useState<string | null>(null);
  const [openingModal, setOpeningModal] = useState(false);
  const [preCheckedMarker, setPreCheckedMarker] = useState<string | undefined>(undefined);

  const isSpecialist =
    role === UserRole.DOCTOR ||
    role === UserRole.NUTRITIONIST ||
    role === UserRole.COACH;

  useEffect(() => {
    if (!patientUserId || !isSpecialist) {
      setLoading(false);
      return;
    }

    Promise.all([
      recordsApi.getPatientRecords(patientUserId),
      predictionsApi.getPatientHistory(patientUserId),
      accessRequestsApi.getEffectiveAccess(patientUserId),
    ])
      .then(([recs, preds, access]) => {
        setRecords(recs);
        setPredictions(preds);
        setEffectiveAccess(access);
      })
      .catch((err: any) => {
        if (err?.response?.status === 403) {
          setForbidden(true);
        } else {
          console.error('Error loading patient medical sheet:', err);
        }
      })
      .finally(() => setLoading(false));
  }, [patientUserId, isSpecialist]);

  useEffect(() => {
    if (latestKeyReissueEvent === 0 || !patientUserId || !isSpecialist) return;
    recordsApi.getPatientRecords(patientUserId).then(setRecords).catch(() => {});
    accessRequestsApi.getEffectiveAccess(patientUserId).then(setEffectiveAccess).catch(() => {});
  }, [latestKeyReissueEvent, patientUserId, isSpecialist]);

  const handleChat = async () => {
    if (!patientUserId) return;
    setChatting(true);
    try {
      const conv = await chatApi.openOrCreateConversation(patientUserId);
      navigate(`/dashboard/messages/${conv.id}`);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatting(false);
    }
  };

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

  // Only redirect once role is confirmed — avoids navigating away before auth resolves
  if (role !== null && !isSpecialist) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex-1 w-full min-h-64 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-brand-dark/60 font-mono animate-pulse">
          {t('patientSheet.loading')}
        </p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ShieldOff className="w-16 h-16 text-secondary/60" />
        <h2 className="text-2xl font-heading text-brand-dark">
          {t('patientSheet.noAccess')}
        </h2>
        <p className="text-brand-dark/60 text-center max-w-sm">
          {t('patientSheet.noAccessDesc')}
        </p>
        <Link
          to="/dashboard/specialist"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 text-sm font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patientSheet.back')}
        </Link>
      </div>
    );
  }

  const sortedRecords = [...records].sort((a, b) => {
    const byDate = new Date(b.record_date).getTime() - new Date(a.record_date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const mergedMarkersAccess = records.reduce<Record<string, 'DECRYPTED' | 'LOCKED'>>((acc, rec) => {
    for (const [marker, status] of Object.entries(rec.markers_access ?? {})) {
      if (acc[marker] !== 'DECRYPTED') acc[marker] = status;
    }
    return acc;
  }, {});

  const allMarkerKeys = sortedRecords.length >= 2
    ? [
        ...new Set(
          sortedRecords
            .slice(0, 2)
            .flatMap((r) => Object.keys((r.raw_markers as Record<string, unknown>) ?? {}))
        ),
      ]
    : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/specialist/patients"
          className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-primary hover:bg-white transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark">
          {t('patientSheet.title')}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleOpenAccessModal()}
            disabled={openingModal}
            className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-secondary hover:bg-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('accessRequest.requestAccessButton')}
            title={t('accessRequest.requestAccessButton')}
          >
            {openingModal ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
          </button>
          <button
            onClick={handleChat}
            disabled={chatting}
            className="p-3 bg-white/50 border border-brand-dark/10 rounded-xl text-brand-dark/60 hover:text-accent hover:bg-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('patientSheet.chat')}
          >
            {chatting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Trend chart */}
      <div className="h-100">
        <MarkerTrendChart records={records} />
      </div>

      {/* Timeline */}
      <MedicalTimeline
        records={records}
        predictions={predictions}
        onDownloadReport={(predictionId) =>
          predictionsApi.downloadReport(predictionId, i18n.language.startsWith('en') ? 'en' : 'ro')
        }
        getRecordUrl={(record) => `/dashboard/specialist/patients/${patientUserId}/records/${record.id}`}
      />

      {/* Raw markers comparison — most recent two records */}
      {sortedRecords.length >= 2 && (
        <RawMarkersTable
          recordA={sortedRecords[0]}
          recordB={sortedRecords[1]}
          markerKeys={allMarkerKeys}
          markersAccess={mergedMarkersAccess}
          onRequestAccess={(marker) => handleOpenAccessModal(marker)}
        />
      )}

      {showAccessModal && accessConvId && (
        <AccessRequestModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          conversationId={accessConvId}
          patientUserId={patientUserId!}
          currentMarkersAccess={effectiveAccess}
          preCheckedMarker={preCheckedMarker}
          onSuccess={() => setShowAccessModal(false)}
        />
      )}
    </div>
  );
};

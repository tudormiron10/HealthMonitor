import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, X, Loader2 } from 'lucide-react';
import { specialistApi } from '@/infrastructure/api/specialistApi';
import { relationsApi } from '@/infrastructure/api/relationsApi';
import type { Relation } from '@/domain/models/Relation';
import { RequestInbox } from './components/RequestInbox';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import { useChatContext } from '@/application/hooks/useChatContext';

export const SpecialistRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const { latestRelationEvent, clearRelationEvent } = useChatContext();

  const [received, setReceived] = useState<Relation[]>([]);
  const [active, setActive] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [revokeModal, setRevokeModal] = useState<{ open: boolean; relId: string | null }>({
    open: false,
    relId: null,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      specialistApi.getPendingRequests(),
      relationsApi.getApproved(),
    ])
      .then(([receivedData, activeData]) => {
        setReceived(receivedData);
        setActive(activeData);
      })
      .catch((err) => console.error('Error loading requests page:', err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (latestRelationEvent?.status === 'PENDING') {
      handleRefresh();
      clearRelationEvent();
    }
  }, [latestRelationEvent, handleRefresh, clearRelationEvent]);

  const handleRevoke = async (relationId: string) => {
    setProcessing((prev) => ({ ...prev, [relationId]: true }));
    try {
      await relationsApi.revoke(relationId);
      handleRefresh();
    } catch (err) {
      console.error('Error revoking connection:', err);
    } finally {
      setProcessing((prev) => ({ ...prev, [relationId]: false }));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-heading text-brand-dark">
          {t('specialistRequests.title')}
        </h1>
        <p className="text-brand-dark/60 mt-1 font-medium">
          {t('specialistRequests.subtitle')}
        </p>
      </div>

      {/* Section 1: Received */}
      <RequestInbox
        requests={received}
        loading={loading}
        onRefresh={handleRefresh}
        title={t('specialistRequests.received.title')}
        emptyMessage={t('specialistRequests.received.empty')}
      />

      {/* Section 2: Active */}
      <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-dark/5">
          <h3 className="font-heading text-xl text-brand-dark">
            {t('specialistRequests.active.title')}
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-brand-dark/5 rounded-xl animate-pulse" />
            ))}

          {!loading && active.length === 0 && (
            <p className="py-8 text-center text-brand-dark/40 font-heading text-lg">
              {t('specialistRequests.active.empty')}
            </p>
          )}

          {!loading &&
            active.map((rel) => {
              const isProcessing = processing[rel.id] ?? false;
              const name = rel.counterparty
                ? `${rel.counterparty.first_name} ${rel.counterparty.last_name}`
                : rel.patient_id;

              return (
                <div
                  key={rel.id}
                  className="flex items-center gap-3 rounded-xl border border-brand-dark/8 bg-white/50 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-dark truncate">{name}</p>
                  </div>
                  <button
                    onClick={() => setRevokeModal({ open: true, relId: rel.id })}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors shrink-0"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>{t('specialistRequests.active.revokeButton')}</span>
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      <ConfirmModal
        open={revokeModal.open}
        title={t('specialistRequests.active.revokeTitle')}
        message={t('specialistRequests.active.revokeConfirm')}
        danger
        onConfirm={() => {
          if (revokeModal.relId) handleRevoke(revokeModal.relId);
          setRevokeModal({ open: false, relId: null });
        }}
        onCancel={() => setRevokeModal({ open: false, relId: null })}
      />
    </div>
  );
};

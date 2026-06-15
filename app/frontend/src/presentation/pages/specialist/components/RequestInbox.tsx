import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Check, X } from 'lucide-react';
import { relationsApi } from '@/infrastructure/api/relationsApi';
import type { Relation } from '@/domain/models/Relation';

interface Props {
  requests: Relation[];
  loading: boolean;
  onRefresh: () => void;
  title?: string;
  emptyMessage?: string;
}

export const RequestInbox: React.FC<Props> = ({ requests, loading, onRefresh, title, emptyMessage }) => {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAction = async (relationId: string, action: 'approve' | 'reject') => {
    setProcessing((prev) => ({ ...prev, [relationId]: true }));
    setErrors((prev) => ({ ...prev, [relationId]: '' }));

    try {
      if (action === 'approve') {
        await relationsApi.approve(relationId);
      } else {
        await relationsApi.reject(relationId);
      }
      onRefresh();
    } catch {
      setErrors((prev) => ({
        ...prev,
        [relationId]: t(
          action === 'approve'
            ? 'specialistDashboard.requestInbox.approveError'
            : 'specialistDashboard.requestInbox.rejectError'
        ),
      }));
    } finally {
      setProcessing((prev) => ({ ...prev, [relationId]: false }));
    }
  };

  return (
    <div className="bg-white/60 rounded-2xl border border-brand-dark/10 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-brand-dark/5">
        <h3 className="font-heading text-xl text-brand-dark">
          {title ?? t('specialistDashboard.requestInbox.title')}
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {loading &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-brand-dark/5 rounded-xl animate-pulse" />
          ))}

        {!loading && requests.length === 0 && (
          <p className="py-8 text-center text-brand-dark/40 font-heading text-lg">
            {emptyMessage ?? t('specialistDashboard.requestInbox.empty')}
          </p>
        )}

        {!loading &&
          requests.map((req) => {
            const isProcessing = processing[req.id] ?? false;
            const error = errors[req.id];
            const name = req.counterparty
              ? `${req.counterparty.first_name} ${req.counterparty.last_name}`
              : req.patient_id;

            return (
              <div
                key={req.id}
                className="flex flex-col gap-1 rounded-xl border border-brand-dark/8 bg-white/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-dark truncate">{name}</p>
                    <p className="text-xs text-brand-dark/40 uppercase tracking-widest">
                      {t('specialistDashboard.requestInbox.from')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(req.id, 'approve')}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('specialistDashboard.requestInbox.approve')}</span>
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'reject')}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('specialistDashboard.requestInbox.reject')}</span>
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-red-600 pl-12">{error}</p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

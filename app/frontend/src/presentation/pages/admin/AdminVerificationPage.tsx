import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/infrastructure/api/adminApi';
import { useChatContext } from '@/application/hooks/useChatContext';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';
import type { SpecialistPending } from '@/domain/models/AdminTypes';
import { SpecialistVerificationCard } from './components/SpecialistVerificationCard';
import { RejectModal } from './components/RejectModal';

export const AdminVerificationPage: React.FC = () => {
  const { t } = useTranslation();
  const { latestAdminEvent, clearAdminEvent } = useChatContext();
  const [specialists, setSpecialists] = useState<SpecialistPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [approveTarget, setApproveTarget] = useState<SpecialistPending | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SpecialistPending | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPending = useCallback(() => {
    adminApi.getPendingSpecialists()
      .then(setSpecialists)
      .catch(() => setError(t('adminDashboard.verification.errorLoad')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  useEffect(() => {
    if (latestAdminEvent) {
      fetchPending();
      clearAdminEvent();
    }
  }, [latestAdminEvent, fetchPending, clearAdminEvent]);

  const fadeOutAndRemove = (userId: string) => {
    setFadingIds(prev => new Set(prev).add(userId));
    setTimeout(() => {
      setSpecialists(prev => prev.filter(s => s.user_id !== userId));
      setFadingIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
    }, 350);
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    const target = approveTarget;
    setApproveTarget(null);
    setIsSubmitting(true);
    setActionError(null);
    try {
      await adminApi.approveSpecialist(target.user_id);
      fadeOutAndRemove(target.user_id);
    } catch {
      setActionError(t('adminDashboard.verification.actionError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    setIsSubmitting(true);
    setActionError(null);
    try {
      await adminApi.rejectSpecialist(target.user_id, reason);
      fadeOutAndRemove(target.user_id);
    } catch {
      setActionError(t('adminDashboard.verification.actionError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveName = approveTarget
    ? `${approveTarget.first_name} ${approveTarget.last_name}`.trim() || approveTarget.email
    : '';
  const rejectName = rejectTarget
    ? `${rejectTarget.first_name} ${rejectTarget.last_name}`.trim() || rejectTarget.email
    : '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading text-brand-dark">
            {t('adminDashboard.verification.title')}
          </h1>
          {!loading && (
            <p className="text-sm text-brand-dark/50 mt-1">
              {specialists.length} {t('adminDashboard.verification.resultCount')}
            </p>
          )}
        </div>
        <Link
          to="/dashboard/admin"
          className="flex items-center gap-2 text-sm text-brand-dark/60 hover:text-brand-dark transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminDashboard.users.backToDashboard')}
        </Link>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}

      {isSubmitting && (
        <div className="p-3 bg-brand-light/60 border border-brand-dark/10 rounded-lg text-sm text-brand-dark/60 font-medium">
          {t('adminDashboard.verification.submitting')}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-brand-dark/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 font-medium">{error}</div>
      ) : specialists.length === 0 ? (
        <div className="py-20 text-center text-brand-dark/40 font-medium">
          {t('adminDashboard.verification.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {specialists.map(s => (
            <SpecialistVerificationCard
              key={s.user_id}
              specialist={s}
              fading={fadingIds.has(s.user_id)}
              onApprove={() => setApproveTarget(s)}
              onReject={() => setRejectTarget(s)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!approveTarget}
        title={t('adminDashboard.verification.approveTitle')}
        message={t('adminDashboard.verification.approveMessage', { name: approveName })}
        confirmLabel={t('adminDashboard.verification.approve')}
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveTarget(null)}
        danger={false}
      />

      <RejectModal
        open={!!rejectTarget}
        name={rejectName}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
};

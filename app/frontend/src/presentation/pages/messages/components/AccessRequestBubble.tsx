import { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/domain/models/Message';
import { accessRequestsApi } from '@/infrastructure/api/accessRequestsApi';
import { MARKER_GROUPS } from '@/application/utils/markerGroups';

interface Props {
  message: Message;
  isOwn: boolean;
  requestStatus?: 'PENDING' | 'APPROVED' | 'DECLINED';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AccessRequestBubble({ message, isOwn, requestStatus = 'PENDING' }: Props) {
  const { t } = useTranslation();

  const payload = (message.payload ?? {}) as Record<string, unknown>;
  const requestId = payload.request_id as string;
  const requestedMarkers = (payload.requested_markers as string[]) ?? [];
  const justification = message.message_text;

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [pendingDecline, setPendingDecline] = useState(false);
  const [checkedMarkers, setCheckedMarkers] = useState<Set<string>>(new Set(requestedMarkers));
  const [submitting, setSubmitting] = useState(false);
  const [localResolved, setLocalResolved] = useState(false);
  const [resolvedAs, setResolvedAs] = useState<'APPROVED' | 'DECLINED' | null>(null);

  const effectiveStatus = localResolved && resolvedAs ? resolvedAs : requestStatus;
  const canAct = !isOwn && effectiveStatus === 'PENDING';

  const openApproveDialog = () => {
    setCheckedMarkers(new Set(requestedMarkers));
    setShowApproveDialog(true);
  };

  const handleConfirmApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await accessRequestsApi.respondToRequest(requestId, 'approve', [...checkedMarkers]);
      setResolvedAs('APPROVED');
      setLocalResolved(true);
      setShowApproveDialog(false);
    } catch {
      setShowApproveDialog(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await accessRequestsApi.respondToRequest(requestId, 'decline');
      setResolvedAs('DECLINED');
      setLocalResolved(true);
      setPendingDecline(false);
    } catch {
      setPendingDecline(false);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedDisplay = Object.entries(MARKER_GROUPS)
    .map(([groupKey, allInGroup]) => ({
      groupKey,
      markers: allInGroup.filter((m) => requestedMarkers.includes(m)),
    }))
    .filter((g) => g.markers.length > 0);

  const statusBadge = () => {
    if (effectiveStatus === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          {t('chat.accessRequest.approvedStatus')}
        </span>
      );
    }
    if (effectiveStatus === 'DECLINED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" />
          {t('chat.accessRequest.declinedStatus')}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        {t('chat.accessRequest.pending')}
      </span>
    );
  };

  return (
    <>
      <div className="flex justify-center my-2 px-4">
        <div className="w-full max-w-md border border-brand-dark/15 bg-white rounded-xl p-4 flex flex-col gap-3 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-brand-dark">
              <ShieldCheck className="w-4 h-4 shrink-0 text-secondary" />
              <span className="font-semibold text-sm">{t('chat.accessRequest.title')}</span>
            </div>
            {statusBadge()}
          </div>

          {/* Requested markers grouped by clinical category */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/40 mb-1.5">
              {t('chat.accessRequest.requested')}
            </p>
            <div className="space-y-2">
              {groupedDisplay.map(({ groupKey, markers }) => (
                <div key={groupKey}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/30 mb-0.5">
                    {t(`markerGroups.${groupKey}`)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {markers.map((m) => (
                      <span key={m} className="text-xs bg-brand-light/60 text-brand-dark px-2 py-0.5 rounded-full border border-brand-dark/10">
                        {t(`markers.${m}`)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Justification */}
          {justification && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/40 mb-1">
                {t('chat.accessRequest.justification')}
              </p>
              <p className="text-xs text-brand-dark/70 leading-relaxed">{justification}</p>
            </div>
          )}

          {/* Patient action buttons */}
          {canAct && !pendingDecline && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={openApproveDialog}
                className="flex-1 py-1.5 rounded-lg bg-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-colors"
              >
                {t('chat.accessRequest.approveSelected')}
              </button>
              <button
                type="button"
                onClick={() => setPendingDecline(true)}
                className="flex-1 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest hover:bg-secondary/20 transition-colors"
              >
                {t('chat.accessRequest.declineAll')}
              </button>
            </div>
          )}

          {/* Inline decline confirmation */}
          {canAct && pendingDecline && (
            <div className="flex flex-col gap-2 pt-1">
              <p className="text-xs text-brand-dark/70">{t('chat.accessRequest.confirmDeclinePrompt')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  disabled={submitting}
                  className="flex-1 py-1.5 rounded-lg bg-secondary text-white text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  {t('chat.accessRequest.declineAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDecline(false)}
                  disabled={submitting}
                  className="flex-1 py-1.5 rounded-lg bg-brand-dark/5 text-brand-dark text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/10 transition-colors disabled:opacity-40"
                >
                  {t('chat.accessRequest.subDialogCancel')}
                </button>
              </div>
            </div>
          )}

          <span className="text-xs text-brand-dark/30 self-end">{formatTime(message.sent_at)}</span>
        </div>
      </div>

      {/* Approve sub-dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowApproveDialog(false)} />
          <div className="relative bg-white rounded-2xl border border-brand-dark/10 shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-brand-dark/10 shrink-0">
              <h3 className="text-base font-heading text-brand-dark">{t('chat.accessRequest.subDialogTitle')}</h3>
              <p className="text-xs text-brand-dark/50 mt-0.5">{t('chat.accessRequest.subDialogSubtitle')}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {requestedMarkers.map((m) => (
                <label key={m} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-light/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedMarkers.has(m)}
                    onChange={() =>
                      setCheckedMarkers((prev) => {
                        const next = new Set(prev);
                        next.has(m) ? next.delete(m) : next.add(m);
                        return next;
                      })
                    }
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <span className="text-sm text-brand-dark">{t(`markers.${m}`)}</span>
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-brand-dark/10 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowApproveDialog(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
              >
                {t('chat.accessRequest.subDialogCancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={checkedMarkers.size === 0 || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                {t('chat.accessRequest.confirmApproval')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

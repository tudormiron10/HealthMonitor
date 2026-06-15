import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { accessRequestsApi } from '@/infrastructure/api/accessRequestsApi';
import { MARKER_GROUPS } from '@/application/utils/markerGroups';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  patientUserId: string;
  currentMarkersAccess: Record<string, 'DECRYPTED' | 'LOCKED'>;
  preCheckedMarker?: string;
  onSuccess?: () => void;
}

export const AccessRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  conversationId,
  currentMarkersAccess,
  preCheckedMarker,
  onSuccess,
}) => {
  const { t } = useTranslation();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initial = new Set<string>();
    if (preCheckedMarker && currentMarkersAccess[preCheckedMarker] !== 'DECRYPTED') {
      initial.add(preCheckedMarker);
    }
    setSelected(initial);
    setCollapsed({});
    setJustification('');
    setError(null);
    setSucceeded(false);
  }, [isOpen, preCheckedMarker, currentMarkersAccess]);

  if (!isOpen) return null;

  const isDecrypted = (marker: string) => currentMarkersAccess[marker] === 'DECRYPTED';

  const toggleMarker = (marker: string) => {
    if (isDecrypted(marker)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(marker) ? next.delete(marker) : next.add(marker);
      return next;
    });
  };

  const selectAllLocked = (groupKey: string) => {
    const locked = MARKER_GROUPS[groupKey].filter((m) => !isDecrypted(m));
    setSelected((prev) => {
      const next = new Set(prev);
      locked.forEach((m) => next.add(m));
      return next;
    });
  };

  const toggleCollapse = (groupKey: string) => {
    setCollapsed((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const canSubmit = selected.size > 0 && justification.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await accessRequestsApi.createRequest(
        conversationId,
        [...selected],
        justification.trim(),
      );
      setSucceeded(true);
      onSuccess?.();
      setTimeout(onClose, 1800);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError(t('accessRequest.conflictMessage'));
      } else {
        setError(t('accessRequest.errorMessage'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl border border-brand-dark/10 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-dark/10 shrink-0">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-secondary shrink-0" />
            <div>
              <h2 className="text-lg font-heading text-brand-dark">{t('accessRequest.title')}</h2>
              <p className="text-xs text-brand-dark/50 mt-0.5">{t('accessRequest.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {succeeded ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-brand-dark font-bold">{t('accessRequest.successMessage')}</p>
            </div>
          ) : (
            <>
              {/* Marker groups */}
              {Object.entries(MARKER_GROUPS).map(([groupKey, markers]) => {
                const lockedInGroup = markers.filter((m) => !isDecrypted(m));
                const allGroupLocked = lockedInGroup.length === markers.length;
                const isCollapsed = collapsed[groupKey] ?? false;

                return (
                  <div key={groupKey} className="border border-brand-dark/10 rounded-xl overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-brand-dark/3 hover:bg-brand-dark/5 cursor-pointer select-none" onClick={() => toggleCollapse(groupKey)}>
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <ChevronRight className="w-4 h-4 text-brand-dark/40" />
                          : <ChevronDown className="w-4 h-4 text-brand-dark/40" />
                        }
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-dark/70 font-heading">
                          {t(`markerGroups.${groupKey}`)}
                        </span>
                        {!allGroupLocked && (
                          <span className="ml-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            {markers.filter(isDecrypted).length}/{markers.length}
                          </span>
                        )}
                      </div>
                      {lockedInGroup.length > 0 && !isCollapsed && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); selectAllLocked(groupKey); }}
                          className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
                        >
                          {t('accessRequest.selectAllLocked')}
                        </button>
                      )}
                    </div>

                    {/* Markers list */}
                    {!isCollapsed && (
                      <div className="divide-y divide-brand-dark/5">
                        {markers.map((marker) => {
                          const decrypted = isDecrypted(marker);
                          const checked = decrypted || selected.has(marker);
                          return (
                            <label
                              key={marker}
                              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                decrypted
                                  ? 'cursor-default bg-emerald-50/50'
                                  : 'cursor-pointer hover:bg-brand-light/20'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={decrypted}
                                onChange={() => toggleMarker(marker)}
                                className="w-4 h-4 rounded accent-accent shrink-0"
                              />
                              <span className={`text-sm flex-1 ${decrypted ? 'text-brand-dark/50' : 'text-brand-dark'}`}>
                                {t(`markers.${marker}`)}
                              </span>
                              {decrypted && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                  {t('accessRequest.alreadyAccessible')}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Justification */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-dark/50 font-heading">
                    {t('accessRequest.justificationLabel')}
                  </label>
                  <span className={`text-[10px] font-mono ${justification.length < 20 ? 'text-secondary' : 'text-brand-dark/40'}`}>
                    {t('accessRequest.charCount', { count: justification.length })}
                  </span>
                </div>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder={t('accessRequest.justificationPlaceholder')}
                  className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
                {justification.length > 0 && justification.trim().length < 20 && (
                  <p className="text-[11px] text-secondary mt-1">{t('accessRequest.minCharsHint')}</p>
                )}
              </div>

              {/* Error */}
              {error && <p className="text-sm text-secondary">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {!succeeded && (
          <div className="px-6 py-4 border-t border-brand-dark/10 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
            >
              {t('accessRequest.cancelButton')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t('accessRequest.submitting') : t('accessRequest.submitButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

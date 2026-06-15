import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download, Dumbbell, Loader2, UtensilsCrossed, X } from 'lucide-react';
import { plansApi } from '@/infrastructure/api/plansApi';

export interface PlanViewData {
  message_id: string;
  plan_type: 'MEAL_PLAN' | 'WORKOUT_PLAN';
  title: string;
  content: string;
  sender_name?: string;
  sent_at: string;
}

interface Props {
  plan: PlanViewData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlanViewModal: React.FC<Props> = ({ plan, isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  if (!isOpen || !plan) return null;

  const isMeal = plan.plan_type === 'MEAL_PLAN';
  const Icon = isMeal ? UtensilsCrossed : Dumbbell;
  const typeLabel = isMeal ? t('plans.viewModal.mealPlanLabel') : t('plans.viewModal.workoutPlanLabel');
  const sentAt = new Date(plan.sent_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plan.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = async () => {
    setDownloadError('');
    setDownloading(true);
    try {
      const lang = i18n.language.startsWith('en') ? 'en' : 'ro';
      await plansApi.downloadPdf(plan.message_id, lang);
    } catch {
      setDownloadError(t('plans.viewModal.downloadError'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl border border-brand-dark/10 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-dark/10 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 text-accent shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent block">
                  {typeLabel}
                </span>
                <h2 className="text-lg font-heading text-brand-dark leading-tight truncate">
                  {plan.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-brand-dark/40 hover:text-brand-dark hover:bg-brand-dark/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-3 text-xs text-brand-dark/50">
            {plan.sender_name && (
              <>
                <span>{t('plans.viewModal.sentBy', { name: plan.sender_name })}</span>
                <span>·</span>
              </>
            )}
            <span>{t('plans.viewModal.sentOn', { date: sentAt })}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[60vh]">
          <p className="text-sm text-brand-dark whitespace-pre-wrap leading-relaxed">
            {plan.content}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-dark/10 flex flex-col gap-2 shrink-0">
          {downloadError && (
            <p className="text-xs text-red-500 text-right">{downloadError}</p>
          )}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark text-sm font-bold uppercase tracking-widest transition-colors"
            >
              {t('plans.viewModal.close')}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-dark/15 text-brand-dark/70 text-sm font-bold uppercase tracking-widest hover:bg-brand-dark/5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600">{t('plans.viewModal.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    {t('plans.viewModal.copyButton')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold uppercase tracking-widest hover:bg-accent/80 transition-colors disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {t('plans.viewModal.downloadPdf')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

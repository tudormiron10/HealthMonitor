import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Dumbbell, Loader2, UtensilsCrossed } from 'lucide-react';
import { chatApi } from '@/infrastructure/api/chatApi';
import { useAuth } from '@/application/hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

const MAX_TITLE = 100;
const MAX_CONTENT = 8000;

export const PlanComposerModal: React.FC<Props> = ({ isOpen, onClose, conversationId }) => {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const isNutritionist = role === 'NUTRITIONIST';
  const planType = isNutritionist ? 'MEAL_PLAN' : 'WORKOUT_PLAN';
  const Icon = isNutritionist ? UtensilsCrossed : Dumbbell;
  const modalTitle = isNutritionist ? t('chat.plan.mealPlanTitle') : t('chat.plan.workoutPlanTitle');

  const adjustHeight = () => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setContent('');
    setError(null);
    setSucceeded(false);
    if (contentRef.current) contentRef.current.style.height = 'auto';
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await chatApi.sendPlan(conversationId, planType as 'MEAL_PLAN' | 'WORKOUT_PLAN', title.trim(), content.trim());
      setSucceeded(true);
      setTimeout(onClose, 1800);
    } catch {
      setError(t('chat.plan.error'));
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
            <Icon className="w-5 h-5 text-accent shrink-0" />
            <h2 className="text-lg font-heading text-brand-dark">{modalTitle}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {succeeded ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-brand-dark font-bold">{t('chat.plan.successMessage')}</p>
            </div>
          ) : (
            <>
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-dark/50 font-heading">
                    {t('chat.plan.titleLabel')}
                  </label>
                  <span className={`text-[10px] font-mono ${title.length >= MAX_TITLE ? 'text-secondary' : 'text-brand-dark/40'}`}>
                    {t('chat.plan.charCountTitle', { count: title.length, max: MAX_TITLE })}
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                  placeholder={t('chat.plan.titlePlaceholder')}
                  className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-dark/50 font-heading">
                    {t('chat.plan.contentLabel')}
                  </label>
                  <span className={`text-[10px] font-mono ${content.length >= MAX_CONTENT ? 'text-secondary' : 'text-brand-dark/40'}`}>
                    {t('chat.plan.charCountContent', { count: content.length, max: MAX_CONTENT })}
                  </span>
                </div>
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => { setContent(e.target.value.slice(0, MAX_CONTENT)); adjustHeight(); }}
                  placeholder={t('chat.plan.contentPlaceholder')}
                  rows={6}
                  className="w-full rounded-xl border border-brand-dark/20 bg-white/80 px-4 py-2.5 text-sm text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

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
              {t('chat.plan.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-bold uppercase tracking-widest transition-colors hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t('chat.plan.sending') : t('chat.plan.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

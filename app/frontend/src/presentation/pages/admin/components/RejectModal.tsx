import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  name: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const RejectModal: React.FC<Props> = ({ open, name, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) { setReason(''); setTouched(false); return; }
    const id = setTimeout(() => textareaRef.current?.focus(), 50);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => { clearTimeout(id); document.removeEventListener('keydown', handleKey); };
  }, [open, onCancel]);

  if (!open) return null;

  const tooShort = reason.trim().length < 10;

  const handleConfirm = () => {
    setTouched(true);
    if (!tooShort) onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-brand-light/70 backdrop-blur-md" onClick={onCancel} />
      <div className="relative bg-primary border border-white/10 shadow-2xl rounded-3xl p-8 w-full max-w-md animate-fade-in">
        <h2 className="text-xl font-heading text-white mb-2">
          {t('adminDashboard.verification.rejectTitle')}
        </h2>
        <p className="text-sm text-white/70 mb-5">
          {t('adminDashboard.verification.rejectMessage', { name })}
        </p>
        <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-1.5">
          {t('adminDashboard.verification.rejectReason')}
        </label>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={e => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={3}
          placeholder={t('adminDashboard.verification.rejectPlaceholder')}
          className="w-full rounded-xl border bg-white/10 border-white/20 text-white placeholder:text-white/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
        />
        {touched && tooShort && (
          <p className="text-xs text-secondary mt-1">{t('adminDashboard.verification.rejectMinChars')}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-sm font-bold uppercase tracking-widest transition-colors"
          >
            {t('confirmModal.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={tooShort}
            title={tooShort ? t('adminDashboard.verification.rejectMinChars') : undefined}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary"
          >
            {t('adminDashboard.verification.rejectConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

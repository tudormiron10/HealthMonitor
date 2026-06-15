import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  danger = false,
}) => {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-light/70 backdrop-blur-md"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-primary border border-white/10 shadow-2xl rounded-3xl p-8 w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-white/80" />
          </div>
          <h2 className="text-xl font-heading text-white">{title}</h2>
          <p className="text-sm text-white/70 leading-relaxed">{message}</p>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-sm font-bold uppercase tracking-widest transition-colors"
          >
            {cancelLabel ?? t('confirmModal.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold uppercase tracking-widest transition-colors ${
              danger
                ? 'bg-secondary hover:bg-secondary/90'
                : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {confirmLabel ?? t('confirmModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

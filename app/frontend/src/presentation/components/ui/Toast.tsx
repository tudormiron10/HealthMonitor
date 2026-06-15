import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AUTO_DISMISS_MS = 8000;

export type ToastVariant = 'redFlag' | 'success' | 'warning' | 'error' | 'info';

interface ToastProps {
  open: boolean;
  variant?: ToastVariant;
  title: string;
  body?: string;
  linkLabel?: string;
  linkTo?: string;
  onClose: () => void;
}

const VARIANT_STYLES: Record<ToastVariant, {
  container: string;
  gradient: string;
  icon: React.ReactNode;
  titleColor: string;
}> = {
  redFlag: {
    container: 'border border-primary/30 border-l-4 border-l-primary',
    gradient: 'bg-[radial-gradient(circle_at_top_right,rgba(46,61,36,0.07),transparent_60%)]',
    icon: <AlertTriangle className="w-5 h-5 text-primary" />,
    titleColor: 'text-primary',
  },
  success: {
    container: 'border border-accent/30 border-l-4 border-l-accent',
    gradient: 'bg-[radial-gradient(circle_at_top_right,rgba(57,115,103,0.07),transparent_60%)]',
    icon: <CheckCircle className="w-5 h-5 text-accent" />,
    titleColor: 'text-accent',
  },
  warning: {
    container: 'border border-brand-dark/25 border-l-4 border-l-brand-dark',
    gradient: 'bg-[radial-gradient(circle_at_top_right,rgba(94,10,10,0.08),transparent_60%)]',
    icon: <AlertTriangle className="w-5 h-5 text-brand-dark" />,
    titleColor: 'text-brand-dark',
  },
  error: {
    container: 'border border-brand-dark/30 border-l-4 border-l-brand-dark',
    gradient: 'bg-[radial-gradient(circle_at_top_right,rgba(94,10,10,0.07),transparent_60%)]',
    icon: <XCircle className="w-5 h-5 text-brand-dark" />,
    titleColor: 'text-brand-dark',
  },
  info: {
    container: 'border border-accent/30 border-l-4 border-l-accent',
    gradient: 'bg-[radial-gradient(circle_at_top_right,rgba(57,115,103,0.06),transparent_60%)]',
    icon: <Info className="w-5 h-5 text-accent" />,
    titleColor: 'text-accent',
  },
};

export function Toast({ open, variant = 'redFlag', title, body, linkLabel, linkTo, onClose }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [open, onClose]);

  if (!open) return null;

  const { container, gradient, icon, titleColor } = VARIANT_STYLES[variant];

  return (
    <div className="fixed top-6 right-6 z-100 max-w-md w-full animate-slide-in-right">
      <div className={`relative rounded-2xl shadow-lg overflow-hidden bg-white ${container}`}>
        <div className={`absolute inset-0 ${gradient} pointer-events-none`} />
        <div className="relative flex gap-3 p-5">
          <div className="shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-base ${titleColor}`}>{title}</p>
            {body && (
              <p className="text-sm text-brand-dark/60 mt-0.5 leading-relaxed">{body}</p>
            )}
            {linkLabel && linkTo && (
              <Link
                to={linkTo}
                onClick={onClose}
                className="inline-block mt-2 text-sm font-medium text-accent hover:underline"
              >
                {linkLabel} →
              </Link>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-brand-dark/30 hover:text-brand-dark transition-colors"
            aria-label="close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';

interface PredictionErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}

export const PredictionErrorState: React.FC<PredictionErrorStateProps> = ({ error, onRetry, retrying }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-red-500/10 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center text-center">
      <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
      <h3 className="text-2xl font-heading text-red-800 mb-2">{t('predictions.error.title')}</h3>
      <p className="text-red-700/80 mb-6">{error || t('predictions.error.defaultMsg')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-brand-light font-bold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('predictions.error.retryButton')}
          </button>
        )}
        <button
          onClick={() => navigate('/dashboard/patient')}
          className="px-6 py-2 bg-white text-red-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          {t('predictions.error.backButton')}
        </button>
      </div>
    </div>
  );
};

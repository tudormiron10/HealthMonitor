import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ConditionPrediction } from '@/infrastructure/api/predictionsApi';

interface RiskGridProps {
  metrics: Record<string, ConditionPrediction>;
}

const getRiskColor = (probability: number) => {
  if (probability >= 0.7) return 'bg-red-500';
  if (probability >= 0.4) return 'bg-amber-500';
  return 'bg-primary';
};

const getRiskTextClass = (probability: number) => {
  if (probability >= 0.7) return 'text-red-700';
  if (probability >= 0.4) return 'text-amber-700';
  return 'text-primary-hover';
};

const getRiskBadgeClass = (probability: number) => {
  if (probability >= 0.7) return 'bg-red-50 text-red-700 border border-red-200';
  if (probability >= 0.4) return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-green-50 text-primary border border-primary/20';
};

interface ProbabilityRowProps {
  conditionSlug: string;
  probability: number;
  predictedClass: number | null;
  label: string | null;
}

const ProbabilityRow: React.FC<ProbabilityRowProps> = ({ conditionSlug, probability, predictedClass, label }) => {
  const { t } = useTranslation();
  const probPercent = Math.round(probability * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${getRiskBadgeClass(probability)}`}>
          {t(`predictions.classes.${conditionSlug}.${predictedClass}`, { defaultValue: label || t('predictions.classes.default') })}
        </span>
        <span className={`text-xl font-iceland ${getRiskTextClass(probability)}`}>
          {probPercent}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getRiskColor(probability)}`}
          style={{ width: `${probPercent}%` }}
        />
      </div>
    </div>
  );
};

export const RiskGrid: React.FC<RiskGridProps> = ({ metrics }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(metrics).map(([conditionSlug, data]) => {
        const probability = data.probability ?? 0;
        const hasModelA = data.model_a != null;

        return (
          <div
            key={conditionSlug}
            className="bg-white/60 border border-white hover:border-primary/30 shadow-md hover:shadow-xl rounded-2xl p-5 transition-all duration-300 group"
          >
            <h4 className="font-heading text-brand-dark font-medium mb-3 truncate">
              {t(`predictions.conditions.${conditionSlug}`, conditionSlug)}
            </h4>

            {hasModelA ? (
              <div className="space-y-3">
                {/* Model B — screening result */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-dark/40">
                    {t('predictions.modelB')}
                  </span>
                  <ProbabilityRow
                    conditionSlug={conditionSlug}
                    probability={probability}
                    predictedClass={data.predicted_class}
                    label={data.label}
                  />
                </div>

                <div className="border-t border-dashed border-accent/30" />

                {/* Model A — diagnostic confirmation */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                    {t('predictions.modelA')}
                  </span>
                  <ProbabilityRow
                    conditionSlug={conditionSlug}
                    probability={data.model_a!.probability}
                    predictedClass={data.model_a!.predicted_class}
                    label={data.model_a!.label}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                    probability >= 0.7 ? 'bg-red-50 text-red-700 border border-red-200' :
                    probability >= 0.4 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-green-50 text-primary border border-primary/20'
                  }`}>
                    {t(`predictions.classes.${conditionSlug}.${data.predicted_class}`, { defaultValue: data.label || t('predictions.classes.default') })}
                  </span>
                  <span className={`text-2xl font-iceland ${getRiskTextClass(probability)}`}>
                    {Math.round(probability * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getRiskColor(probability)}`}
                    style={{ width: `${Math.round(probability * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

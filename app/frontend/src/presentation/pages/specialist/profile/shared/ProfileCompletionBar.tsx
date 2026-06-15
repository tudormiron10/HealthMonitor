import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { ProfileCompletionResult } from '@/application/utils/profileCompletion';

interface Props {
  completion: ProfileCompletionResult;
}

export const ProfileCompletionBar: React.FC<Props> = ({ completion }) => {
  const { t } = useTranslation();
  const { percent, tier, nextAction } = completion;

  if (percent === 100) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
        <span className="font-bold text-accent">
          {t('profileCompletion.tier.complet')}
        </span>
        <span className="text-white/50">
          {t('profileCompletion.percentLabel', { percent })}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Percentage + tier label row */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-white/80">
          {t('profileCompletion.percentLabel', { percent })}
        </span>
        <span className="text-xs text-white/50 uppercase tracking-widest font-heading">
          {t(`profileCompletion.tier.${tier}`)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: '#F7E7CE' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: '#5e0a0a' }}
        />
      </div>

      {/* Next action hint */}
      {nextAction && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <ArrowRight className="w-3 h-3 text-accent shrink-0" />
          <span className="text-xs text-white/50">
            {t(`profileCompletion.nextAction.${nextAction}`)}
          </span>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import { Dumbbell, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/domain/models/Message';
import { MessageKind } from '@/domain/enums/MessageKind';
import { PlanViewModal } from '@/presentation/components/medical/PlanViewModal';
import type { PlanViewData } from '@/presentation/components/medical/PlanViewModal';

interface Props {
  message: Message;
  isOwn: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function PlanMessageBubble({ message, isOwn }: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const isMeal = message.message_kind === MessageKind.MEAL_PLAN;
  const Icon = isMeal ? UtensilsCrossed : Dumbbell;
  const typeLabel = isMeal ? t('chat.planBubble.mealPlanLabel') : t('chat.planBubble.workoutPlanLabel');

  const payload = (message.payload ?? {}) as Record<string, unknown>;
  const title = (payload.title as string) ?? message.message_text;
  const content = (payload.content as string) ?? '';
  const senderDisplay = isOwn ? t('chat.bubble.you') : undefined;

  const planData: PlanViewData = {
    message_id: message.id,
    plan_type: message.message_kind as 'MEAL_PLAN' | 'WORKOUT_PLAN',
    title,
    content,
    sender_name: senderDisplay,
    sent_at: message.sent_at,
  };

  return (
    <>
      <div className="flex justify-center my-2 px-4">
        <div className="w-full max-w-md border border-accent/20 bg-accent/5 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent block">
                {typeLabel}
              </span>
              <p className="text-sm font-semibold text-brand-dark truncate mt-0.5">{title}</p>
              <p className="text-xs text-brand-dark/50 mt-0.5">
                {isOwn
                  ? t('chat.planBubble.sentBy', { name: t('chat.bubble.you') })
                  : t('chat.planBubble.sentBy', { name: typeLabel })}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-brand-dark/40">{formatTime(message.sent_at)}</span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
            >
              {t('chat.planBubble.viewPlanCta')}
            </button>
          </div>
        </div>
      </div>

      <PlanViewModal
        plan={planData}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

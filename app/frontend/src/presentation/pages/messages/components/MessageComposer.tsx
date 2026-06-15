import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dumbbell, Send, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { PlanComposerModal } from './PlanComposerModal';

interface Props {
  onSend: (text: string) => void;
  isConnected: boolean;
  error: string | null;
  conversationId: string;
}

const MAX_HEIGHT_PX = 144; // ~6 rows at 24px line-height

export function MessageComposer({ onSend, isConnected, error, conversationId }: Props) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [value, setValue] = useState('');
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text || !isConnected) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isPlanRole = role === 'NUTRITIONIST' || role === 'COACH';
  const PlanIcon = role === 'NUTRITIONIST' ? UtensilsCrossed : Dumbbell;

  return (
    <>
      <div className="shrink-0 border-t border-brand-dark/10 px-4 py-3 flex flex-col gap-1.5">
        {error && (
          <p className="text-xs text-secondary px-1">{error}</p>
        )}
        {!isConnected && (
          <p className="text-xs text-brand-dark/40 px-1">{t('chat.composer.disconnected')}</p>
        )}
        <div className="flex items-end gap-2">
          {isPlanRole && (
            <button
              type="button"
              onClick={() => setPlanModalOpen(true)}
              aria-label={role === 'NUTRITIONIST' ? t('chat.plan.mealPlanTitle') : t('chat.plan.workoutPlanTitle')}
              className="shrink-0 w-10 h-10 rounded-xl bg-brand-dark/5 text-brand-dark/60 flex items-center justify-center hover:bg-brand-dark/10 hover:text-accent transition-colors"
            >
              <PlanIcon className="w-4 h-4" />
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            disabled={!isConnected}
            placeholder={isConnected ? t('chat.composer.placeholder') : t('chat.composer.disconnected')}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-brand-dark/15 bg-bg-main px-4 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:border-accent overflow-y-auto disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ maxHeight: MAX_HEIGHT_PX }}
            onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !value.trim()}
            aria-label={t('chat.composer.send')}
            className="shrink-0 w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PlanComposerModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        conversationId={conversationId}
      />
    </>
  );
}

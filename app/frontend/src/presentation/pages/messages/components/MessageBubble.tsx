import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/domain/models/Message';
import { MessageKind } from '@/domain/enums/MessageKind';
import { useAuth } from '@/application/hooks/useAuth';
import { AccessRequestBubble } from './AccessRequestBubble';
import { AccessResponseBubble } from './AccessResponseBubble';
import { PlanMessageBubble } from './PlanMessageBubble';

interface Props {
  message: Message;
  isOwn: boolean;
  requestStatus?: 'PENDING' | 'APPROVED' | 'DECLINED';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, isOwn, requestStatus }: Props) {
  const { t } = useTranslation();
  const { role } = useAuth();

  if (message.message_kind === MessageKind.MEAL_PLAN || message.message_kind === MessageKind.WORKOUT_PLAN) {
    return <PlanMessageBubble message={message} isOwn={isOwn} />;
  }

  if (message.message_kind === MessageKind.ACCESS_REQUEST) {
    return <AccessRequestBubble message={message} isOwn={isOwn} requestStatus={requestStatus} />;
  }

  if (message.message_kind === MessageKind.ACCESS_RESPONSE) {
    return <AccessResponseBubble message={message} />;
  }

  if (message.message_kind === MessageKind.SYSTEM_RED_FLAG) {
    const payload = (message.payload ?? {}) as Record<string, unknown>;
    const conditions = (payload.conditions as string[] | undefined) ?? [];
    const patientUserId = payload.patient_user_id as string | undefined;
    const recordId = payload.record_id as string | undefined;

    const isSpecialist = role === 'DOCTOR' || role === 'NUTRITIONIST' || role === 'COACH';
    const recordLink = isSpecialist && patientUserId && recordId
      ? `/dashboard/specialist/patients/${patientUserId}/records/${recordId}`
      : !isSpecialist && recordId
        ? `/dashboard/patient/records/${recordId}`
        : null;

    return (
      <div className="flex justify-center my-2 px-4" role="alert">
        <div className="w-full max-w-md border border-red-300 bg-red-50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-sm">{t('chat.systemRedFlagLabel')}</span>
          </div>
          {conditions.length > 0 && (
            <div className="text-xs text-red-700">
              <p className="font-medium mb-1">{t('chat.systemRedFlagConditions')}:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {conditions.map((cond) => (
                  <li key={cond}>
                    {t(`predictions.classes.${cond}.label`, { defaultValue: cond.replace(/_/g, ' ') })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recordLink && (
            <Link
              to={recordLink}
              className="text-xs text-accent hover:underline font-medium mt-1"
            >
              {t('chat.systemRedFlagLink')}
            </Link>
          )}
          <span className="text-xs text-red-400 self-end">{formatTime(message.sent_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 my-1`}>
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-brand-light text-brand-dark rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap wrap-break-word">{message.message_text}</p>
        <div
          className={`flex items-center gap-1 mt-1 text-xs ${
            isOwn ? 'justify-end text-white/60' : 'text-brand-dark/40'
          }`}
        >
          <span>{formatTime(message.sent_at)}</span>
          {isOwn && (
            <span>{message.is_read ? t('chat.bubble.read') : t('chat.bubble.delivered')}</span>
          )}
        </div>
      </div>
    </div>
  );
}

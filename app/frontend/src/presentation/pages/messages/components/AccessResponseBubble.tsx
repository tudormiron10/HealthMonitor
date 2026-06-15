import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/domain/models/Message';

interface Props {
  message: Message;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AccessResponseBubble({ message }: Props) {
  const { t } = useTranslation();

  const payload = (message.payload ?? {}) as Record<string, unknown>;
  const status = payload.status as 'APPROVED' | 'DECLINED';
  const approvedMarkers = (payload.approved_markers as string[] | undefined) ?? [];

  const isApproved = status === 'APPROVED';

  return (
    <div className="flex justify-center my-2 px-4">
      <div
        className={`w-full max-w-md border rounded-xl p-4 flex flex-col gap-2 shadow-sm ${
          isApproved ? 'border-emerald-200 bg-emerald-50' : 'border-secondary/20 bg-secondary/5'
        }`}
      >
        <div className="flex items-center gap-2">
          {isApproved
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            : <XCircle className="w-4 h-4 shrink-0 text-secondary" />
          }
          <span className={`font-semibold text-sm ${isApproved ? 'text-emerald-700' : 'text-secondary'}`}>
            {isApproved ? t('chat.accessResponse.approved') : t('chat.accessResponse.declined')}
          </span>
        </div>

        {isApproved && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mb-1">
              {t('chat.accessResponse.approvedMarkers')}
            </p>
            {approvedMarkers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {approvedMarkers.map((m) => (
                  <span key={m} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    {t(`markers.${m}`)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600/70">{t('chat.accessResponse.noMarkers')}</p>
            )}
          </div>
        )}

        <span className="text-xs text-brand-dark/30 self-end">{formatTime(message.sent_at)}</span>
      </div>
    </div>
  );
}

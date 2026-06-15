import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message } from '@/domain/models/Message';
import { MessageKind } from '@/domain/enums/MessageKind';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: Message[];
  currentUserId: string | null;
}

type ThreadItem =
  | { type: 'divider'; label: string; key: string }
  | { type: 'message'; msg: Message };

function dayKey(isoStr: string): string {
  return isoStr.slice(0, 10);
}

function dateDividerLabel(isoStr: string, today: string, yesterday: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (msgMs === todayMs) return today;
  if (msgMs === todayMs - 86_400_000) return yesterday;
  return d.toLocaleDateString();
}

export function MessageThread({ messages, currentUserId }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
  };

  const todayLabel = t('chat.today');
  const yesterdayLabel = t('chat.yesterday');

  const requestStatusMap: Record<string, 'PENDING' | 'APPROVED' | 'DECLINED'> = {};
  for (const msg of messages) {
    if (msg.message_kind === MessageKind.ACCESS_RESPONSE) {
      const p = (msg.payload ?? {}) as Record<string, unknown>;
      const rid = p.request_id as string | undefined;
      const status = p.status as 'APPROVED' | 'DECLINED' | undefined;
      if (rid && status) requestStatusMap[rid] = status;
    }
  }

  const items: ThreadItem[] = [];
  let lastDay = '';

  for (const msg of messages) {
    const day = dayKey(msg.sent_at);
    if (day !== lastDay) {
      items.push({ type: 'divider', label: dateDividerLabel(msg.sent_at, todayLabel, yesterdayLabel), key: `div-${day}` });
      lastDay = day;
    }
    items.push({ type: 'message', msg });
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
      {items.map((item) =>
        item.type === 'divider' ? (
          <div key={item.key} className="flex items-center gap-3 px-6 my-3">
            <div className="flex-1 h-px bg-brand-dark/10" />
            <span className="text-xs text-brand-dark/30 shrink-0">{item.label}</span>
            <div className="flex-1 h-px bg-brand-dark/10" />
          </div>
        ) : (
          <MessageBubble
            key={item.msg.id}
            message={item.msg}
            isOwn={item.msg.sender_id === currentUserId}
            requestStatus={
              item.msg.message_kind === MessageKind.ACCESS_REQUEST
                ? (requestStatusMap[(item.msg.payload as Record<string, unknown>)?.request_id as string] ?? 'PENDING')
                : undefined
            }
          />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}

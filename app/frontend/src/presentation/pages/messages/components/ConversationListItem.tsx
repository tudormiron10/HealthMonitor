import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Conversation } from '@/domain/models/Conversation';
import apiClient from '@/infrastructure/api/apiClient';

interface Props {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string | null;
  onClick: () => void;
}

function formatLastActive(iso: string, yesterday: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '< 1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return yesterday;
  return `${Math.floor(hours / 24)}d`;
}

export function ConversationListItem({ conversation, isActive, currentUserId, onClick }: Props) {
  const { t } = useTranslation();
  const { counterparty_first_name, counterparty_last_name, counterparty_photo_url, last_message, unread_count, updated_at } = conversation;

  const name = `${counterparty_first_name} ${counterparty_last_name}`;
  const timeStr = formatLastActive(updated_at, t('chat.yesterday'));

  let preview = '';
  if (last_message) {
    const isOwn = last_message.sender_id === currentUserId;
    preview = isOwn
      ? `${t('chat.conversationList.you')}: ${last_message.text}`
      : last_message.text;
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-light/60 ${
        isActive ? 'bg-brand-light border-l-2 border-accent' : ''
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
        {counterparty_photo_url ? (
          <img
            src={`${apiClient.defaults.baseURL}/${counterparty_photo_url}`}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-accent" />
        )}
      </div>

      {/* Name + preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-brand-dark truncate">{name}</span>
          <span className="text-xs text-brand-dark/40 shrink-0">{timeStr}</span>
        </div>
        <p className="text-xs text-brand-dark/50 truncate mt-0.5">{preview}</p>
      </div>

      {/* Unread badge */}
      {unread_count > 0 && (
        <span
          className="shrink-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-accent text-white text-xs px-1"
          aria-label={t('chat.conversationList.unreadAria', { count: unread_count })}
        >
          {unread_count > 99 ? '99+' : unread_count}
        </span>
      )}
    </button>
  );
}

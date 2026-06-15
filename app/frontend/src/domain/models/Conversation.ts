import type { MessageKind } from '@/domain/enums/MessageKind';

export interface MessagePreview {
  id: string;
  kind: MessageKind;
  text: string;
  sent_at: string;
  sender_id: string | null;
}

export interface Conversation {
  id: string;
  counterparty_user_id: string;
  counterparty_first_name: string;
  counterparty_last_name: string;
  counterparty_role: string;
  counterparty_photo_url: string | null;
  unread_count: number;
  last_message: MessagePreview | null;
  updated_at: string;
}

export interface UnreadSummary {
  total: number;
  by_conversation: Record<string, number>;
}

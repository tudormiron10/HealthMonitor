import type { MessageKind } from '@/domain/enums/MessageKind';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_kind: MessageKind;
  message_text: string;
  payload: Record<string, unknown> | null;
  sent_at: string;
  is_read: boolean;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '@/domain/models/Message';
import { chatApi } from '@/infrastructure/api/chatApi';
import { ChatSocket } from '@/infrastructure/realtime/chatSocket';
import { tokenStorage } from '@/infrastructure/storage/tokenStorage';
import { useAuth } from './useAuth';
import { useChatContext } from './useChatContext';

const MARK_READ_DEBOUNCE_MS = 300;

export function useChat(conversationId: string | null) {
  const { userId } = useAuth();
  const { refreshUnread } = useChatContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<ChatSocket | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const refreshUnreadRef = useRef(refreshUnread);
  refreshUnreadRef.current = refreshUnread;

  useEffect(() => {
    if (!conversationId) return;

    setMessages([]);
    setError(null);

    const token = tokenStorage.getToken();
    if (!token) return;

    let cancelled = false;
    let markReadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleMarkRead = () => {
      if (markReadTimer) clearTimeout(markReadTimer);
      markReadTimer = setTimeout(() => {
        chatApi.markRead(conversationId)
          .then(() => refreshUnreadRef.current())
          .catch(() => {});
      }, MARK_READ_DEBOUNCE_MS);
    };

    chatApi.getMessages(conversationId).then((history) => {
      if (cancelled) return;
      setMessages(history);
      scheduleMarkRead();
    }).catch(() => {});

    const socket = new ChatSocket({
      conversationId,
      token,
      onOpen: () => { if (!cancelled) setIsConnected(true); },
      onClose: () => { if (!cancelled) setIsConnected(false); },
      onMessage: (data) => {
        if (cancelled || typeof data !== 'object' || data === null) return;
        const frame = data as Record<string, unknown>;

        if (frame.type === 'message') {
          const incoming = frame.message as Message;
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return ids.has(incoming.id) ? prev : [...prev, incoming];
          });
          if (incoming.sender_id !== userIdRef.current) {
            scheduleMarkRead();
          }
          refreshUnreadRef.current();
        } else if (frame.type === 'error') {
          if (!cancelled) setError(frame.message as string);
        }
      },
    });
    socketRef.current = socket;

    return () => {
      cancelled = true;
      socket.close();
      socketRef.current = null;
      if (markReadTimer) clearTimeout(markReadTimer);
    };
  }, [conversationId]);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.send(text);
  }, []);

  return { messages, sendMessage, isConnected, error };
}

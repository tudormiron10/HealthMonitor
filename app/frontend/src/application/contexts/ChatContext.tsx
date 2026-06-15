import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { chatApi } from '@/infrastructure/api/chatApi';
import { useAuth } from '@/application/hooks/useAuth';
import { UserSocket } from '@/infrastructure/realtime/userSocket';
import { tokenStorage } from '@/infrastructure/storage/tokenStorage';

const POLL_INTERVAL_MS = 5_000;

export type ToastPayload =
  | { variant: 'redFlag'; conversationId: string; patientUserId: string; conditions: string[] }
  | { variant: 'success' | 'warning' | 'error' | 'info'; titleKey: string; bodyKey?: string; linkPath?: string; linkLabelKey?: string };

export type RelationEvent = { status: 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'PENDING'; counterparty_user_id: string };
export type VerificationEvent = { status: 'APPROVED' | 'REJECTED'; reason?: string };

interface ChatContextType {
  totalUnread: number;
  byConversation: Record<string, number>;
  refreshUnread: () => void;
  dispatchToast: (toast: ToastPayload) => void;
  latestToast: ToastPayload | null;
  clearToast: () => void;
  latestRelationEvent: RelationEvent | null;
  clearRelationEvent: () => void;
  latestVerificationEvent: VerificationEvent | null;
  clearVerificationEvent: () => void;
  latestAdminEvent: number | null;
  clearAdminEvent: () => void;
  latestKeyReissueEvent: number;
  isPdfUploading: boolean;
  setIsPdfUploading: (v: boolean) => void;
  isMLPredicting: boolean;
  setIsMLPredicting: (v: boolean) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [byConversation, setByConversation] = useState<Record<string, number>>({});
  const [latestToast, setLatestToast] = useState<ToastPayload | null>(null);
  const [latestRelationEvent, setLatestRelationEvent] = useState<RelationEvent | null>(null);
  const [latestVerificationEvent, setLatestVerificationEvent] = useState<VerificationEvent | null>(null);
  const [latestAdminEvent, setLatestAdminEvent] = useState<number | null>(null);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [isMLPredicting, setIsMLPredicting] = useState(false);
  const [latestKeyReissueEvent, setLatestKeyReissueEvent] = useState(0);
  const userSocketRef = useRef<UserSocket | null>(null);

  const fetchUnread = useCallback(() => {
    chatApi.getUnreadSummary().then((data) => {
      setTotalUnread(data.total);
      setByConversation(data.by_conversation);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnread();
    const id = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchUnread]);

  useEffect(() => {
    if (!isAuthenticated) {
      userSocketRef.current?.close();
      userSocketRef.current = null;
      return;
    }
    const token = tokenStorage.getToken();
    if (!token) return;

    userSocketRef.current = new UserSocket({
      token,
      onMessage: (data) => {
        const frame = data as Record<string, unknown>;
        if (frame.type === 'red_flag_toast') {
          const onMessagesPage = window.location.pathname.startsWith('/dashboard/messages');
          if (!onMessagesPage) {
            setLatestToast({
              variant: 'redFlag',
              conversationId: frame.conversation_id as string,
              patientUserId: frame.patient_user_id as string,
              conditions: frame.conditions as string[],
            });
          }
        } else if (frame.type === 'relation_status_changed') {
          const status = frame.status as RelationEvent['status'];
          setLatestRelationEvent({ status, counterparty_user_id: frame.counterparty_user_id as string });
          if (status !== 'PENDING') {
            const titleKey =
              status === 'ACTIVE' ? 'notifications.relationApproved' :
              status === 'REJECTED' ? 'notifications.relationRejected' :
              'notifications.relationRevoked';
            const toastVariant = status === 'ACTIVE' ? 'success' : status === 'REJECTED' ? 'error' : 'warning';
            setLatestToast({ variant: toastVariant, titleKey });
          }
          fetchUnread();
        } else if (frame.type === 'key_reissued') {
          setLatestKeyReissueEvent((n) => n + 1);
          setLatestToast({ variant: 'success', titleKey: 'chat.accessResponse.keyReissuedToast' });
        } else if (frame.type === 'new_specialist_registered') {
          setLatestAdminEvent(Date.now());
        } else if (frame.type === 'plan_received') {
          setLatestToast({
            variant: 'info',
            titleKey: 'chat.planReceived.toast',
            linkPath: `/dashboard/patient/my-plans?planId=${frame.message_id}`,
            linkLabelKey: 'chat.planReceived.cta',
          });
        } else if (frame.type === 'verification_status_changed') {
          const status = frame.status as VerificationEvent['status'];
          setLatestVerificationEvent({ status, reason: frame.reason as string | undefined });
          const titleKey = status === 'APPROVED' ? 'notifications.verificationApproved' : 'notifications.verificationRejected';
          const toastVariant = status === 'APPROVED' ? 'success' : 'error';
          setLatestToast({ variant: toastVariant, titleKey });
          fetchUnread();
        }
      },
    });

    return () => {
      userSocketRef.current?.close();
      userSocketRef.current = null;
    };
  }, [isAuthenticated, fetchUnread]);

  const refreshUnread = useCallback(() => fetchUnread(), [fetchUnread]);

  const dispatchToast = useCallback((toast: ToastPayload) => {
    setLatestToast(toast);
  }, []);

  const clearToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  const clearRelationEvent = useCallback(() => {
    setLatestRelationEvent(null);
  }, []);

  const clearVerificationEvent = useCallback(() => {
    setLatestVerificationEvent(null);
  }, []);

  const clearAdminEvent = useCallback(() => {
    setLatestAdminEvent(null);
  }, []);

  return (
    <ChatContext.Provider value={{ totalUnread, byConversation, refreshUnread, dispatchToast, latestToast, clearToast, latestRelationEvent, clearRelationEvent, latestVerificationEvent, clearVerificationEvent, latestAdminEvent, clearAdminEvent, latestKeyReissueEvent, isPdfUploading, setIsPdfUploading, isMLPredicting, setIsMLPredicting }}>
      {children}
    </ChatContext.Provider>
  );
}

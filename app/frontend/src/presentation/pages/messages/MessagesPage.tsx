import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { useChat } from '@/application/hooks/useChat';
import { ConversationList } from './components/ConversationList';
import { MessageThread } from './components/MessageThread';
import { MessageComposer } from './components/MessageComposer';

export function MessagesPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { messages, sendMessage, isConnected, error } = useChat(conversationId ?? null);

  return (
    <div className="flex h-full min-h-0 border border-brand-dark/10 rounded-2xl overflow-hidden bg-white">
      {/* Left column — conversation list */}
      <div className="w-80 shrink-0 border-r border-brand-dark/10 overflow-y-auto">
        <ConversationList />
      </div>

      {/* Right column — thread + composer */}
      <div className="flex-1 flex flex-col min-w-0">
        {conversationId ? (
          <>
            <MessageThread messages={messages} currentUserId={userId} />
            <MessageComposer onSend={sendMessage} isConnected={isConnected} error={error} conversationId={conversationId} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-brand-dark/30">
            <MessageSquare className="w-12 h-12" />
            <p className="text-sm">{t('chat.selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

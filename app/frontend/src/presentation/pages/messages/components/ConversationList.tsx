import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import type { Conversation } from '@/domain/models/Conversation';
import { chatApi } from '@/infrastructure/api/chatApi';
import { useAuth } from '@/application/hooks/useAuth';
import { useChatContext } from '@/application/hooks/useChatContext';
import { ConversationListItem } from './ConversationListItem';

export function ConversationList() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { byConversation } = useChatContext();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    chatApi
      .listConversations()
      .then((list) => {
        setConversations([...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
        setInitialLoaded(true);
      })
      .catch(() => setInitialLoaded(true));
  }, [byConversation]);

  if (!initialLoaded) {
    return (
      <div className="flex items-center justify-center h-full text-brand-dark/30 text-sm p-6">
        {t('chat.loading')}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full text-brand-dark/30 p-6">
        <MessageSquare className="w-8 h-8" />
        <p className="text-sm text-center">{t('chat.conversationList.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === conversationId}
          currentUserId={userId}
          onClick={() => navigate(`/dashboard/messages/${conv.id}`)}
        />
      ))}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/stores/chat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatWrapper } from '@/components/chat/ChatWrapper';

export default function ConversationPage() {
  const params = useParams();
  const { messages, currentConversationId, selectConversation } = useChatStore();

  useEffect(() => {
    const id = params.id;
    if (id && typeof id === 'string' && id !== currentConversationId) {
      selectConversation(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <ChatWrapper>
      {messages.length > 0 ? <MessageList /> : <EmptyState />}
      <ChatInput />
    </ChatWrapper>
  );
}

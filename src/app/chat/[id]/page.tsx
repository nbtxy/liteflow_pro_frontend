'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/stores/chat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';

export default function ConversationPage() {
  const params = useParams();
  const { messages, selectConversation } = useChatStore();

  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      selectConversation(params.id);
    }
  }, [params.id, selectConversation]);

  return (
    <>
      {messages.length > 0 ? <MessageList /> : <EmptyState />}
      <ChatInput />
    </>
  );
}

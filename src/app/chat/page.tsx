'use client';

import { useEffect } from 'react';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChatStore } from '@/stores/chat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatWrapper } from '@/components/chat/ChatWrapper';

export default function ChatPage() {
  const { messages, createConversation } = useChatStore();

  useEffect(() => {
    createConversation();
  }, [createConversation]);

  return (
    <ChatWrapper>
      {messages.length > 0 ? <MessageList /> : <EmptyState />}
      <ChatInput />
    </ChatWrapper>
  );
}

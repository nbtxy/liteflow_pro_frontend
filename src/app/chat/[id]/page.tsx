'use client';

import { useChatStore } from '@/stores/chat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';

export default function ConversationPage() {
  const { messages } = useChatStore();

  return (
    <>
      {messages.length > 0 ? <MessageList /> : <EmptyState />}
      <ChatInput />
    </>
  );
}

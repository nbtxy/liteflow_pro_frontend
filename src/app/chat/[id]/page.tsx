'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/stores/chat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';

export default function ConversationPage() {
  const params = useParams();
  const { messages, currentConversationId, selectConversation } = useChatStore();

  useEffect(() => {
    const id = params.id;
    if (id && typeof id === 'string' && id !== currentConversationId) {
      // 仅当 store 中的会话 ID 与路由不一致时才加载
      // 流式过程中路由从 /chat 同步到 /chat/[id]，此时 store 已经是对的，不需要重新加载
      selectConversation(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  return (
    <>
      {messages.length > 0 ? <MessageList /> : <EmptyState />}
      <ChatInput />
    </>
  );
}

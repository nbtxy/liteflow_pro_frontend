import { Conversation, Message } from '@/lib/types';

export let mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: '写一段 Python 快排代码',
    createdAt: new Date(Date.now() - 100000).toISOString(),
    updatedAt: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'conv-2',
    title: '解释一下 CAP 定理',
    createdAt: new Date(Date.now() - 200000).toISOString(),
    updatedAt: new Date(Date.now() - 20000).toISOString(),
  }
];

export const mockMessages: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: '帮我写个快排',
      createdAt: new Date(Date.now() - 100000).toISOString(),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: '好的，这是一个 Python 快排实现：\n\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n```\n\n这段代码使用了列表推导式，非常简洁。',
      createdAt: new Date(Date.now() - 90000).toISOString(),
    }
  ],
  'conv-2': [
    {
      id: 'msg-3',
      conversationId: 'conv-2',
      role: 'user',
      content: '解释一下 CAP 定理',
      createdAt: new Date(Date.now() - 200000).toISOString(),
    },
    {
      id: 'msg-4',
      conversationId: 'conv-2',
      role: 'assistant',
      content: 'CAP 定理指出，一个分布式系统最多只能同时满足以下三项中的两项：\n\n1. **一致性（Consistency）**：所有节点访问同一份最新的数据副本\n2. **可用性（Availability）**：每次请求都能获取到非错的响应，但不保证获取的数据为最新数据\n3. **分区容错性（Partition tolerance）**：系统如果不能在时限内达成数据一致性，就意味着发生了分区的情况，必须就当前操作在 C 和 A 之间做出选择。',
      createdAt: new Date(Date.now() - 190000).toISOString(),
    }
  ]
};

export function addConversation(conversation: Conversation) {
  mockConversations = [conversation, ...mockConversations];
  mockMessages[conversation.id] = [];
}

export function updateConversationTitle(id: string, title: string) {
  const conv = mockConversations.find(c => c.id === id);
  if (conv) {
    conv.title = title;
    conv.updatedAt = new Date().toISOString();
  }
}

export function deleteConversation(id: string) {
  mockConversations = mockConversations.filter(c => c.id !== id);
  delete mockMessages[id];
}

export function addMessage(conversationId: string, message: Message) {
  if (!mockMessages[conversationId]) {
    mockMessages[conversationId] = [];
  }
  mockMessages[conversationId].push(message);
  
  // Update conversation updatedAt
  const conv = mockConversations.find(c => c.id === conversationId);
  if (conv) {
    conv.updatedAt = new Date().toISOString();
  }
}

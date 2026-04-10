import { getAccessToken, refreshAccessToken } from './auth';
import type { ChatEvent } from './types';
import type { FileAttachment } from './types';
import type { QuotedMessage } from './types';
import { getApiUrl } from './config';

export async function* regenerateChat(
  conversationId: string,
  messageId: string,
  signal?: AbortSignal
): AsyncGenerator<ChatEvent> {
  let token = getAccessToken();
  const url = getApiUrl('/api/chat/regenerate');
  
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ conversationId, messageId }),
    signal,
  });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, messageId }),
      signal,
    });
  }

  if (!res.ok) {
    yield { type: 'error', message: `请求失败: ${res.status}` };
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // 最后一行可能不完整

      for (const line of lines) {
        const trimmedLine = line.trimEnd();           // 去除可能的 \r
        if (trimmedLine.startsWith('data:')) {
          const payload = trimmedLine.startsWith('data: ')
            ? trimmedLine.slice(6)
            : trimmedLine.slice(5);
          try {
            const data = JSON.parse(payload);
            yield data as ChatEvent;
          } catch {
            // 忽略解析错误的行
          }
        }
      }
    }
  } catch {
    if (signal?.aborted) return;
    yield { type: 'error', message: '连接中断' };
  }
}

export async function* streamChat(
  conversationId: string | null,
  message: string,
  attachments?: FileAttachment[],
  quotedMessage?: QuotedMessage,
  signal?: AbortSignal
): AsyncGenerator<ChatEvent> {
  let token = getAccessToken();
  const url = getApiUrl('/api/chat/stream');
  
  // Map attachments to backend expected format
  const mappedAttachments = attachments?.map(att => ({
    id: att.id,
    type: att.type || 'file',
    url: att.url,
    mimeType: att.mimeType,
    fileName: att.name,
    size: att.size,
  }));

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ conversationId, message, attachments: mappedAttachments, quotedMessage }),
    signal,
  });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, message, attachments: mappedAttachments, quotedMessage }),
      signal,
    });
  }

  if (!res.ok) {
    yield { type: 'error', message: `请求失败: ${res.status}` };
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // 最后一行可能不完整

      for (const line of lines) {
        const trimmedLine = line.trimEnd();           // 去除可能的 \r
        if (trimmedLine.startsWith('data:')) {
          const payload = trimmedLine.startsWith('data: ')
            ? trimmedLine.slice(6)
            : trimmedLine.slice(5);
          try {
            const data = JSON.parse(payload);
            yield data as ChatEvent;
          } catch {
            // 忽略解析错误的行
          }
        }
      }
    }
  } catch {
    if (signal?.aborted) return;
    yield { type: 'error', message: '连接中断' };
  }
}

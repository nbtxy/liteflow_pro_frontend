// 用户相关
export interface User {
  id: string;
  phone: string;
  nickname: string;
}

// 会话相关
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// 消息相关
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// SSE 事件类型
export type ChatEvent =
  | { type: 'stream_start'; conversationId: string; messageId: string }
  | { type: 'text_delta'; content: string }
  | { type: 'stream_end'; usage?: { promptTokens: number; completionTokens: number } }
  | { type: 'error'; message: string };

// 登录相关
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// API 响应
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

// 分页
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

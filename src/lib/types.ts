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
  channelType?: string;
}

// 消息相关
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  toolCalls?: ToolCall[];
  attachments?: FileAttachment[];
}

// 工具调用
export type ToolCallStatus = 'running' | 'success' | 'error';

export interface ToolCall {
  toolUseId: string;
  toolName: string;
  status: ToolCallStatus;
  input?: string;
  startedAt: number;
  duration?: number;
}

// Artifact
export type ArtifactType = 'CODE' | 'IMAGE' | 'HTML' | 'MARKDOWN' | 'SVG' | 'DATA' | 'FILE';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string;
  content?: string;
  url?: string;
  version: number;
  versions?: number[];
  conversationId: string;
  createdAt: string;
}

// 文件
export type FileSource = 'upload' | 'created' | 'generated';

export interface FileItem {
  path: string;
  name: string;
  size: number;
  type: ArtifactType;
  source: FileSource;
  artifactId?: string;
  version?: number;
  createdAt: string;
  url?: string;
}

// 文件上传附件
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'done' | 'error';
  progress: number;
}

// 工具配置
export const TOOL_CONFIG: Record<string, { icon: string; runningText: (input?: string) => string; doneText: string }> = {
  web_search: {
    icon: '🔍',
    runningText: (input) => `正在搜索: "${input || '...'}"`,
    doneText: '搜索完成',
  },
  web_fetch: {
    icon: '🌐',
    runningText: () => '正在读取网页...',
    doneText: '读取完成',
  },
  code_execution: {
    icon: '▶️',
    runningText: () => '正在执行代码...',
    doneText: '执行完成',
  },
  create_file: {
    icon: '📄',
    runningText: (input) => `正在创建: ${input || '...'}`,
    doneText: '文件已创建',
  },
  edit_file: {
    icon: '✏️',
    runningText: (input) => `正在修改: ${input || '...'}`,
    doneText: '修改完成',
  },
  use_skill: {
    icon: '📚',
    runningText: (input) => `正在加载技能: ${input || '...'}`,
    doneText: '技能已加载',
  },
  calculator: {
    icon: '🧮',
    runningText: () => '正在计算...',
    doneText: '计算完成',
  },
};

// SSE 事件类型
export type ChatEvent =
  | { type: 'stream_start'; conversationId: string; messageId: string }
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use_start'; toolUseId: string; toolName: string }
  | { type: 'tool_use_input'; toolUseId: string; input: string }
  | { type: 'tool_result'; toolUseId: string; status: 'success' | 'error' }
  | { type: 'artifact_created'; artifactId: string; artifactType: ArtifactType; title: string; language?: string; content?: string; url?: string; version: number }
  | { type: 'artifact_updated'; artifactId: string; version: number; content?: string; url?: string }
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

export function artifactToFileItem(a: Artifact): FileItem {
  return {
    path: a.title,
    name: a.title,
    size: (a.content || '').length,
    type: a.type,
    source: 'created',
    artifactId: a.id,
    version: a.version,
    createdAt: a.createdAt,
    url: a.url,
  };
}

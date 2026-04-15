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
export interface QuotedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// 内容片段：按实际发生顺序排列的文本和工具调用
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; toolCall: ToolCall }
  | { type: 'tool_result'; toolUseId: string; status: ToolCallStatus; content?: string };

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  contentParts?: ContentPart[];
  attachments?: FileAttachment[];
  quotedMessage?: QuotedMessage;
}

// 工具调用
export type ToolCallStatus = 'running' | 'success' | 'error';

export interface ToolCall {
  toolUseId: string;
  toolName: string;
  status: ToolCallStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: string | Record<string, any>;
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
export type FileSource = 'upload' | 'generated';

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
  url?: string;
  type?: 'image' | 'file';
  mimeType?: string;
}

// 工具配置
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_CONFIG: Record<string, { icon: string; runningText: (input?: any) => string; doneText: string }> = {
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
  search_skill: {
    icon: '📚',
    runningText: (input) => `正在加载技能: ${input || '...'}`,
    doneText: '技能已加载',
  },
  calculator: {
    icon: '🧮',
    runningText: () => '正在计算...',
    doneText: '计算完成',
  },
  manage_scheduled_task: {
    icon: '⏰',
    runningText: (input) => {
      const action = typeof input === 'object' ? input?.action : input;
      const labels: Record<string, string> = {
        create: '正在创建定时任务...',
        list: '正在查询定时任务...',
        update: '正在修改定时任务...',
        pause: '正在暂停定时任务...',
        resume: '正在恢复定时任务...',
        delete: '正在删除定时任务...',
        run_now: '正在执行定时任务...',
      };
      return labels[action] || '正在管理定时任务...';
    },
    doneText: '操作完成',
  },
};

// SSE 事件类型
export type ChatEvent =
  | { type: 'stream_start'; conversationId: string; messageId: string }
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use_start'; toolUseId: string; toolName: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: 'tool_use_input'; toolUseId: string; input: any }
  | { type: 'tool_result'; toolUseId: string; status: 'success' | 'error'; content?: string }
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

// 定时任务相关
export interface OutputTarget {
  type: 'conversation' | 'feishu';
  channelId?: string;
  chatId?: string;
}

export interface OutputConfig {
  targets: OutputTarget[];
}

export interface ScheduledTask {
  id: string;
  userId: string;
  conversationId?: string;
  name: string;
  prompt: string;
  cronExpression: string;
  timezone: string;
  outputConfig: OutputConfig;
  status: 'active' | 'paused' | 'stopped';
  maxTokens: number;
  enableTools: boolean;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
  totalRuns: number;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'success' | 'failed' | 'timeout' | 'token_limit';
  resultSummary?: string;
  outputTargets?: OutputConfig;
  inputTokens?: number;
  outputTokens?: number;
  toolsUsed?: string[];
  durationMs?: number;
  errorMessage?: string;
  createdAt: string;
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
    source: 'generated',
    artifactId: a.id,
    version: a.version,
    createdAt: a.createdAt,
    url: a.url,
  };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

// ─── 类型 ───

interface Connector {
  id: string;
  type: 'mcp';
  name: string;
  status: 'active' | 'error' | 'stopped' | 'pending';
  config?: { serverUrl?: string; token?: string };
  toolCount?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface McpTool {
  name: string;
  displayName?: string;
  description: string;
  category?: string;
}

interface McpPreset {
  id: string;
  icon: string;
  name: string;
  description: string;
  serverUrl: string;
  authLabel: string;
  authPlaceholder: string;
  authGuide: string[];
}

// ─── 预置服务 ───

const MCP_PRESETS: McpPreset[] = [
  {
    id: 'github',
    icon: '🐙',
    name: 'GitHub',
    description: '操作仓库、Issue、PR、CI/CD',
    serverUrl: 'https://api.githubcopilot.com/mcp/',
    authLabel: 'Personal Access Token',
    authPlaceholder: 'ghp_',
    authGuide: [
      '访问 github.com/settings/tokens',
      'Generate new token (classic)',
      '勾选 repo、issues、actions 权限',
      '复制 Token 填入上方',
    ],
  },
  {
    id: 'supabase',
    icon: '📊',
    name: 'Supabase',
    description: '操作数据库、Edge Function、存储',
    serverUrl: 'https://mcp.supabase.com/mcp',
    authLabel: 'Access Token',
    authPlaceholder: 'sbp_',
    authGuide: [
      '访问 supabase.com/dashboard/account/tokens',
      '创建新的 Access Token',
      '复制 Token 填入上方',
    ],
  },
  {
    id: 'notion',
    icon: '📝',
    name: 'Notion',
    description: '读写页面、数据库',
    serverUrl: 'https://mcp.notion.so/mcp',
    authLabel: 'API Key',
    authPlaceholder: 'ntn_',
    authGuide: [
      '访问 notion.so/my-integrations',
      '创建新的集成',
      '复制 Internal Integration Secret',
    ],
  },
  {
    id: 'feishu',
    icon: '💬',
    name: '飞书',
    description: '读写飞书文档、管理日程、发送消息',
    serverUrl: 'https://mcp.feishu.cn/mcp/',
    authLabel: 'App Token',
    authPlaceholder: 'a-',
    authGuide: [
      '访问 open.feishu.cn 创建应用',
      '在凭证与基础信息页面获取 App Token',
      '复制 Token 填入上方',
    ],
  },
];

const MCP_ICONS: Record<string, string> = {
  'GitHub': '🐙',
  'Supabase': '📊',
  'Notion': '📝',
  '飞书': '💬',
};

// ─── 状态徽标 ───

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; textColor: string }> = {
  active:  { label: '已连接',   dotColor: 'bg-green-500',  textColor: 'text-green-600' },
  pending: { label: '连接中',   dotColor: 'bg-yellow-500', textColor: 'text-yellow-600' },
  stopped: { label: '已停止',   dotColor: 'bg-gray-300',   textColor: 'text-gray-500' },
  error:   { label: '连接异常', dotColor: 'bg-red-500',    textColor: 'text-red-600' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.stopped;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.textColor}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── 关闭按钮图标 ───

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── 工具分组 ───

function groupTools(tools: McpTool[]) {
  const groups: Record<string, McpTool[]> = {};
  for (const tool of tools) {
    const parts = tool.name.split('_');
    const group = parts.length > 1 ? parts.slice(1).join('_') : 'other';
    const groupName = group.replace(/_/g, ' ');
    const capitalized = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    if (!groups[capitalized]) groups[capitalized] = [];
    groups[capitalized].push(tool);
  }
  return groups;
}

// ─── 工具列表弹窗 ───

function ToolListDialog({
  open,
  onClose,
  connectorId,
  connectorName,
}: {
  open: boolean;
  onClose: () => void;
  connectorId: string | null;
  connectorName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!connectorId) return;
    setLoading(true);
    try {
      const data = await apiFetch<McpTool[]>(`/api/user/channels/${connectorId}/tools`);
      setTools(Array.isArray(data) ? data : []);
    } catch {
      toast.error('加载工具失败');
    } finally {
      setLoading(false);
    }
  }, [connectorId]);

  useEffect(() => {
    if (open) {
      setSearch('');
      load();
    }
  }, [open, load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [tools, search]);

  const grouped = useMemo(() => groupTools(filtered), [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {connectorName} 可用工具 ({tools.length})
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 pt-4">
          <input
            type="text"
            placeholder="搜索工具..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Spinner className="w-5 h-5" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">暂无工具</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">没有匹配的工具</p>
          </div>
        ) : (
          <div className="p-6 max-h-96 overflow-y-auto space-y-6">
            {Object.entries(grouped).map(([group, groupTools]) => (
              <div key={group}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{group}</h3>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {groupTools.map(tool => (
                    <div key={tool.name} className="p-3">
                      <div className="font-mono text-sm text-gray-900">{tool.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{tool.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 更新凭证弹窗 ───

function UpdateCredentialDialog({
  open,
  onClose,
  onSuccess,
  connectorId,
  connectorName,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  connectorId: string | null;
  connectorName: string;
}) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setToken('');
      setShowToken(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!token.trim() || !connectorId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/user/channels/${connectorId}`, {
        method: 'PUT',
        body: JSON.stringify({ config: { token: token.trim() } }),
      });
      toast.success('凭证已更新，正在重连...');
      // 自动重连
      try {
        await apiFetch(`/api/user/channels/${connectorId}/restart`, { method: 'POST' });
        toast.success('重连成功');
      } catch {
        toast.error('重连失败，请检查新凭证');
      }
      onSuccess();
    } catch {
      toast.error('更新凭证失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            更新凭证 — {connectorName}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <CloseIcon />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">当前 Token 已失效，请输入新的 Token</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <EyeIcon open={showToken} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!token.trim() || submitting}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '更新中...' : '更新并重连'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 眼睛图标 ───

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

// ─── 添加 MCP 服务弹窗 ───

type AddStep = 'select' | 'preset' | 'custom';
type AddResult = 'success' | 'error' | null;

function AddMcpDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<AddStep>('select');
  const [selectedPreset, setSelectedPreset] = useState<McpPreset | null>(null);
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AddResult>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toolCount, setToolCount] = useState(0);

  function reset() {
    setStep('select');
    setSelectedPreset(null);
    setName('');
    setServerUrl('');
    setToken('');
    setShowToken(false);
    setSubmitting(false);
    setResult(null);
    setErrorMsg('');
    setToolCount(0);
  }

  useEffect(() => {
    if (open) reset();
  }, [open]);

  function handleSelectPreset(preset: McpPreset) {
    setSelectedPreset(preset);
    setName(preset.name);
    setServerUrl(preset.serverUrl);
    setStep('preset');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await apiFetch<{ toolCount?: number }>('/api/user/channels', {
        method: 'POST',
        body: JSON.stringify({
          type: 'mcp',
          name: name.trim(),
          config: {
            serverUrl: serverUrl.trim(),
            token: token.trim() || undefined,
          },
        }),
      });
      setToolCount((res as any)?.toolCount ?? 0);
      setResult('success');
    } catch (e: any) {
      setResult('error');
      setErrorMsg(e.message || '连接失败');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    reset();
    onSuccess();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 连接成功 */}
        {result === 'success' ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">连接成功！</h3>
            <p className="text-sm text-gray-500 mb-1">
              已加载 {toolCount} 个工具，AI 现在可以操作你的 {name} 了
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleDone}
                className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                完成
              </button>
            </div>
          </div>
        ) : result === 'error' ? (
          /* 连接失败 */
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">连接失败</h3>
            <p className="text-sm text-red-500 mb-6">{errorMsg}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                重试
              </button>
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                返回修改
              </button>
            </div>
          </div>
        ) : submitting ? (
          /* 连接中 */
          <div className="p-8 text-center">
            <Spinner className="w-8 h-8 mx-auto mb-4 text-teal-600" />
            <p className="text-gray-600 font-medium">正在连接...</p>
            <p className="text-sm text-gray-400 mt-2">验证凭证并拉取工具列表</p>
          </div>
        ) : step === 'select' ? (
          /* Step 1: 选择服务 */
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">添加 MCP 服务</h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">选择要连接的服务</p>

              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                推荐服务
              </div>
              <div className="space-y-2 mb-6">
                {MCP_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{preset.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{preset.name}</div>
                        <div className="text-sm text-gray-500">{preset.description}</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  自定义 MCP Server
                </div>
                <button
                  onClick={() => setStep('custom')}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="font-medium text-gray-900">自定义</div>
                      <div className="text-sm text-gray-500">填写任意 MCP Server 的 URL 和凭证</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : step === 'preset' && selectedPreset ? (
          /* Step 2a: 预置服务凭证 */
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                连接 {selectedPreset.name}
              </h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selectedPreset.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{selectedPreset.name}</div>
                  <div className="text-sm text-gray-500">
                    连接后 AI 可以{selectedPreset.description}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedPreset.authLabel}
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder={selectedPreset.authPlaceholder}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <EyeIcon open={showToken} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <div className="font-medium text-gray-700 mb-2">如何获取 Token:</div>
                <ol className="list-decimal list-inside space-y-1">
                  {selectedPreset.authGuide.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setToken('');
                    setShowToken(false);
                    setStep('select');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← 返回
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!token.trim()}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  连接
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Step 2b: 自定义 MCP Server */
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">连接自定义 MCP Server</h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="我的服务"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-gray-400 mt-1">给这个连接起个名字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
                <input
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-gray-400 mt-1">MCP Server 的地址</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token（可选）
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <EyeIcon open={showToken} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">如果 Server 需要认证，填入 Token</p>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => {
                    setName('');
                    setServerUrl('');
                    setToken('');
                    setShowToken(false);
                    setStep('select');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← 返回
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!serverUrl.trim() || !name.trim()}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  连接
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MCP Server 卡片 ───

function McpChannelCard({
  connector,
  onViewTools,
  onRefreshTools,
  onUpdateCredential,
  onRestart,
  onDelete,
}: {
  connector: Connector;
  onViewTools: () => void;
  onRefreshTools: () => Promise<void>;
  onUpdateCredential: () => void;
  onRestart: () => Promise<void>;
  onDelete: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const icon = MCP_ICONS[connector.name] ?? '🔗';
  const created = useMemo(
    () => new Date(connector.createdAt).toLocaleString('zh-CN'),
    [connector.createdAt]
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefreshTools();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRestart() {
    setRestarting(true);
    try {
      await onRestart();
    } finally {
      setRestarting(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-gray-900">{connector.name}</span>
        </div>
        <StatusBadge status={connector.status} />
      </div>

      {/* 自定义 MCP 显示 URL */}
      {connector.config?.serverUrl && !MCP_ICONS[connector.name] && (
        <div className="mt-1 text-xs text-gray-400 truncate">
          {connector.config.serverUrl}
        </div>
      )}

      <div className="mt-3 text-sm text-gray-500 space-y-1">
        <div>可用工具: {connector.toolCount != null ? `${connector.toolCount} 个` : '—'}</div>
        <div>创建时间: {created}</div>
        {connector.status === 'error' && connector.errorMessage && (
          <div className="text-red-500">错误信息: {connector.errorMessage}</div>
        )}
      </div>

      <div className="mt-4 flex justify-between">
        <div className="flex gap-2">
          {connector.status === 'active' && (
            <>
              <button
                onClick={onViewTools}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                查看工具
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {refreshing ? '刷新中...' : '刷新工具'}
              </button>
            </>
          )}
          {connector.status === 'error' && (
            <>
              <button
                onClick={onUpdateCredential}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                更新凭证
              </button>
              <button
                onClick={handleRestart}
                disabled={restarting}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {restarting ? '重连中...' : '重新连接'}
              </button>
            </>
          )}
        </div>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
}

// ─── 主页面 ───

export function ConnectorsView() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // 删除确认
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  // 工具列表
  const [toolsConnectorId, setToolsConnectorId] = useState<string | null>(null);
  const [toolsConnectorName, setToolsConnectorName] = useState('');

  // 更新凭证
  const [credentialConnectorId, setCredentialConnectorId] = useState<string | null>(null);
  const [credentialConnectorName, setCredentialConnectorName] = useState('');

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch<Connector[]>('/api/user/channels');
      const list = Array.isArray(data) ? data : [];
      setConnectors(list.filter((c: any) => c.type === 'mcp') as Connector[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
    const timer = setInterval(fetchConnectors, 30_000);
    return () => clearInterval(timer);
  }, [fetchConnectors]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchConnectors();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchConnectors]);

  async function handleRefreshTools(connectorId: string) {
    try {
      const res = await apiFetch<{ toolCount?: number }>(
        `/api/user/channels/${connectorId}/refresh`,
        { method: 'POST' }
      );
      const count = (res as any)?.toolCount;
      toast.success(count != null ? `已刷新，当前 ${count} 个工具` : '工具列表已刷新');
      fetchConnectors();
    } catch {
      toast.error('刷新失败');
    }
  }

  async function handleRestart(connectorId: string) {
    try {
      await apiFetch(`/api/user/channels/${connectorId}/restart`, { method: 'POST' });
      toast.success('重连成功');
      fetchConnectors();
    } catch {
      toast.error('重连失败');
      fetchConnectors();
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/user/channels/${deleteId}`, { method: 'DELETE' });
      toast.success('已删除');
      setDeleteId(null);
      fetchConnectors();
    } catch {
      toast.error('删除失败');
      setDeleteId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MCP 服务</h1>
            <p className="text-sm text-gray-500 mt-1">
              连接外部服务，让 AI 操作 GitHub、飞书、数据库等
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加 MCP 服务
          </button>
        </div>

        {/* 内容区 */}
        {loading && connectors.length === 0 ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Spinner className="w-5 h-5" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-3">加载失败</p>
            <button onClick={fetchConnectors} className="text-sm text-teal-600 hover:text-teal-700">
              点击重试
            </button>
          </div>
        ) : connectors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">还没有连接任何 MCP 服务</h3>
            <p className="text-sm text-gray-400 mb-6">连接后 AI 可以操作 GitHub、数据库等</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              + 添加 MCP 服务
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {connectors.map(conn => (
              <McpChannelCard
                key={conn.id}
                connector={conn}
                onViewTools={() => {
                  setToolsConnectorId(conn.id);
                  setToolsConnectorName(conn.name);
                }}
                onRefreshTools={() => handleRefreshTools(conn.id)}
                onUpdateCredential={() => {
                  setCredentialConnectorId(conn.id);
                  setCredentialConnectorName(conn.name);
                }}
                onRestart={() => handleRestart(conn.id)}
                onDelete={() => {
                  setDeleteId(conn.id);
                  setDeleteName(conn.name);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 添加弹窗 */}
      <AddMcpDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          setShowAdd(false);
          fetchConnectors();
        }}
      />

      {/* 工具列表弹窗 */}
      <ToolListDialog
        open={!!toolsConnectorId}
        onClose={() => setToolsConnectorId(null)}
        connectorId={toolsConnectorId}
        connectorName={toolsConnectorName}
      />

      {/* 更新凭证弹窗 */}
      <UpdateCredentialDialog
        open={!!credentialConnectorId}
        onClose={() => setCredentialConnectorId(null)}
        onSuccess={() => {
          setCredentialConnectorId(null);
          fetchConnectors();
        }}
        connectorId={credentialConnectorId}
        connectorName={credentialConnectorName}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteId}
        title="确认删除"
        description={`删除后 AI 将无法再操作你的 ${deleteName} 服务。`}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

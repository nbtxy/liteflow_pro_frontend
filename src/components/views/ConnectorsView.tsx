'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

// ─── 类型 ───

interface PermissionItem {
  scope: string;
  description: string;
  granted: boolean;
}

interface Connector {
  id: string;
  type: 'mcp' | 'im';
  name: string;
  displayName?: string;
  status: 'active' | 'error' | 'stopped' | 'pending';
  config?: { serverUrl?: string; token?: string };
  toolCount?: number;
  errorMessage?: string;
  provider?: string;
  username?: string;
  scopes?: string[];
  permissions?: PermissionItem[];
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
  supportsOAuth?: boolean;
  oauthLabel?: string;
  authType?: 'token' | 'appIdSecret';
  authLabel?: string;
  authPlaceholder?: string;
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
    supportsOAuth: true,
    oauthLabel: '使用 GitHub 账号授权',
    authType: 'token',
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
    supportsOAuth: true,
    oauthLabel: '使用 Supabase 账号授权',
    authType: 'token',
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
    serverUrl: 'https://mcp.notion.com/mcp',
    supportsOAuth: true,
    oauthLabel: '使用 Notion 账号授权',
    authType: 'token',
    authLabel: 'API Key',
    authPlaceholder: 'ntn_',
    authGuide: [
      '访问 notion.so/my-integrations',
      '创建新的集成',
      '复制 Internal Integration Secret',
    ],
  },
  {
    id: 'cloudflare',
    icon: '☁️',
    name: 'Cloudflare',
    description: '管理 Workers、KV、D1、R2',
    serverUrl: 'https://mcp.cloudflare.com/mcp',
    supportsOAuth: true,
    oauthLabel: '使用 Cloudflare 账号授权',
    authType: 'token',
    authLabel: 'API Token',
    authPlaceholder: '',
    authGuide: [
      '访问 dash.cloudflare.com/profile/api-tokens',
      '创建新的 API Token',
      '复制 Token 填入上方',
    ],
  },
  {
    id: 'feishu',
    icon: '💬',
    name: '飞书',
    description: '读写飞书文档、管理日程、发送消息',
    serverUrl: 'https://mcp.feishu.cn/mcp/',
    authType: 'appIdSecret',
    authGuide: [
      '访问 open.feishu.cn 创建应用',
      '在凭证与基础信息页面获取 App ID 和 App Secret',
      '将它们填入上方',
    ],
  },
];

const MCP_ICONS: Record<string, string> = {
  'github': '🐙',
  'supabase': '📊',
  'notion': '📝',
  'cloudflare': '☁️',
  'feishu': '💬',
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
    const name = tool.name || tool.displayName || '';
    const parts = name.split('_');
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
      const raw = await apiFetch<Array<Record<string, string>>>(`/api/user/channels/${connectorId}/tools`);
      const data: McpTool[] = (Array.isArray(raw) ? raw : []).map(t => ({
        name: t.displayName || t.toolName || '',
        displayName: t.displayName,
        description: t.description || '',
        category: t.category,
      }));
      setTools(data);
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
  providerName,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  connectorId: string | null;
  connectorName: string;
  providerName: string;
}) {
  const [token, setToken] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isFeishu = providerName === 'feishu';

  useEffect(() => {
    if (open) {
      setToken('');
      setAppId('');
      setAppSecret('');
      setShowToken(false);
    }
  }, [open]);

  async function handleSubmit() {
    const finalToken = isFeishu ? `${appId.trim()}:${appSecret.trim()}` : token.trim();
    if (!finalToken || !connectorId) return;
    
    setSubmitting(true);
    try {
      await apiFetch(`/api/user/channels/${connectorId}`, {
        method: 'PUT',
        body: JSON.stringify({ config: { token: finalToken } }),
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

        <p className="text-sm text-gray-500 mb-4">当前凭证已失效，请输入新的凭证</p>

        {isFeishu ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
              <input
                type="text"
                value={appId}
                onChange={e => setAppId(e.target.value)}
                placeholder="cli_"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={appSecret}
                  onChange={e => setAppSecret(e.target.value)}
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
          </div>
        ) : (
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
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={(isFeishu ? (!appId.trim() || !appSecret.trim()) : !token.trim()) || submitting}
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
type AuthMode = 'oauth' | 'token';

function AddMcpDialog({
  open,
  onClose,
  onSuccess,
  connectedNames,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  connectedNames: string[];
}) {
  const [step, setStep] = useState<AddStep>('select');
  const [selectedPreset, setSelectedPreset] = useState<McpPreset | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AddResult>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toolCount, setToolCount] = useState(0);
  const [oauthLoading, setOauthLoading] = useState(false);
  const oauthPopupRef = useRef<Window | null>(null);

  function reset() {
    setStep('select');
    setSelectedPreset(null);
    setAuthMode('oauth');
    setName('');
    setServerUrl('');
    setToken('');
    setAppId('');
    setAppSecret('');
    setShowToken(false);
    setSubmitting(false);
    setResult(null);
    setErrorMsg('');
    setToolCount(0);
    setOauthLoading(false);
    oauthPopupRef.current = null;
  }

  useEffect(() => {
    if (open) reset();
  }, [open]);

  function handleSelectPreset(preset: McpPreset) {
    setSelectedPreset(preset);
    setName(preset.name);
    setServerUrl(preset.serverUrl);
    setAuthMode(preset.supportsOAuth ? 'oauth' : 'token');
    setStep('preset');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      let finalToken = token.trim();
      if (selectedPreset?.authType === 'appIdSecret') {
        finalToken = `${appId.trim()}:${appSecret.trim()}`;
      }

      const res = await apiFetch<{ toolCount?: number }>('/api/user/channels', {
        method: 'POST',
        body: JSON.stringify({
          type: 'mcp',
          name: selectedPreset ? selectedPreset.id : name.trim(),
          displayName: name.trim(),
          config: {
            serverUrl: serverUrl.trim(),
            token: finalToken || undefined,
          },
        }),
      });
      setToolCount(res?.toolCount ?? 0);
      setResult('success');
    } catch (e: unknown) {
      setResult('error');
      setErrorMsg(e instanceof Error ? e.message : '连接失败');
    } finally {
      setSubmitting(false);
    }
  }

  // OAuth 授权流程
  async function handleOAuth() {
    if (!selectedPreset) return;
    setOauthLoading(true);
    try {
      // 1. 向后端请求 OAuth 授权 URL
          const data = await apiFetch<{ authUrl: string; state: string }>(
        '/api/user/channels/oauth/authorize',
        {
          method: 'POST',
          body: JSON.stringify({
            provider: selectedPreset.id,
                serverUrl: serverUrl.trim() || undefined,
          }),
        }
      );

      // 2. 弹窗打开授权页面
      const w = 600, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        data.authUrl,
        'mcp_oauth',
        `width=${w},height=${h},left=${left},top=${top},popup=yes`
      );
      oauthPopupRef.current = popup;

      // 3. 监听回调消息
      const handleMessage = async (event: MessageEvent) => {
        // 验证来源
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'mcp_oauth_callback') return;

        window.removeEventListener('message', handleMessage);
        oauthPopupRef.current?.close();
        oauthPopupRef.current = null;

        if (event.data.error) {
          setOauthLoading(false);
          setResult('error');
          setErrorMsg(event.data.error);
          return;
        }

        // 4. 用授权码完成连接
        setSubmitting(true);
        setOauthLoading(false);
        try {
          const res = await apiFetch<{ toolCount?: number }>(
            '/api/user/channels/oauth/callback',
            {
              method: 'POST',
              body: JSON.stringify({
                provider: selectedPreset!.id,
                code: event.data.code,
                state: event.data.state,
                name: selectedPreset!.id,
                displayName: name.trim() || selectedPreset!.name,
                serverUrl: serverUrl.trim() || undefined,
              }),
            }
          );
          setToolCount(res?.toolCount ?? 0);
          setResult('success');
        } catch (e: unknown) {
          setResult('error');
          setErrorMsg(e instanceof Error ? e.message : '授权连接失败');
        } finally {
          setSubmitting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // 5. 轮询检测弹窗关闭（用户手动关闭弹窗的情况）
      const pollTimer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          oauthPopupRef.current = null;
          setOauthLoading(false);
        }
      }, 500);
    } catch (e: unknown) {
      setOauthLoading(false);
      setResult('error');
      setErrorMsg(e instanceof Error ? e.message : '获取授权链接失败');
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
                onClick={() => {
                  setResult(null);
                  if (authMode === 'oauth') handleOAuth();
                  else handleSubmit();
                }}
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
        ) : oauthLoading ? (
          /* OAuth 等待授权中 */
          <div className="p-8 text-center">
            <Spinner className="w-8 h-8 mx-auto mb-4 text-teal-600" />
            <p className="text-gray-600 font-medium">等待授权...</p>
            <p className="text-sm text-gray-400 mt-2">请在弹出的窗口中完成授权</p>
            <button
              onClick={() => {
                oauthPopupRef.current?.close();
                oauthPopupRef.current = null;
                setOauthLoading(false);
              }}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
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
                {MCP_PRESETS.map(preset => {
                  const isConnected = connectedNames.includes(preset.name) || connectedNames.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => !isConnected && handleSelectPreset(preset)}
                      disabled={isConnected}
                      className={`w-full text-left p-4 border border-gray-200 rounded-lg flex items-center justify-between transition-colors ${
                        isConnected ? 'opacity-60 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{preset.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {preset.name}
                            {isConnected && <span className="ml-2 text-xs font-normal text-teal-600 bg-teal-50 px-2 py-0.5 rounded">已连接</span>}
                          </div>
                          <div className="text-sm text-gray-500">{preset.description}</div>
                        </div>
                      </div>
                      {!isConnected && (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
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
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">{selectedPreset.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{selectedPreset.name}</div>
                  <div className="text-sm text-gray-500">
                    连接后 AI 可以{selectedPreset.description}
                  </div>
                </div>
              </div>

              {/* 支持 OAuth 的服务：显示授权方式选择 */}
              {selectedPreset.supportsOAuth && (
                <div className="mb-5">
                  <div className="text-sm font-medium text-gray-700 mb-2">选择连接方式</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuthMode('oauth')}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        authMode === 'oauth'
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      授权登录
                    </button>
                    <button
                      onClick={() => setAuthMode('token')}
                      className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        authMode === 'token'
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      手动填写 Token
                    </button>
                  </div>
                </div>
              )}

              {/* OAuth 模式 */}
              {authMode === 'oauth' && selectedPreset.supportsOAuth ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 mb-5">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-700 mb-1">安全授权</div>
                        <p>点击下方按钮将打开 {selectedPreset.name} 授权页面，授权后自动完成连接。你的密码不会经过 LiteFlow。</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
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
                      onClick={handleOAuth}
                      className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {selectedPreset.oauthLabel || '授权登录'}
                    </button>
                  </div>
                </>
              ) : (
                /* Token 模式 */
                <>
                  {selectedPreset.authType === 'appIdSecret' ? (
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          App ID
                        </label>
                        <input
                          type="text"
                          value={appId}
                          onChange={e => setAppId(e.target.value)}
                          placeholder="cli_"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          App Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            value={appSecret}
                            onChange={e => setAppSecret(e.target.value)}
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
                    </div>
                  ) : (
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
                  )}

                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-700 mb-2">如何获取凭证:</div>
                    <ol className="list-decimal list-inside space-y-1">
                      {selectedPreset.authGuide.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => {
                        setToken('');
                        setAppId('');
                        setAppSecret('');
                        setShowToken(false);
                        setStep('select');
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ← 返回
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={selectedPreset.authType === 'appIdSecret' ? (!appId.trim() || !appSecret.trim()) : !token.trim()}
                      className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      连接
                    </button>
                  </div>
                </>
              )}
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

// ─── 权限列表 ───

function PermissionsList({ permissions }: { permissions: PermissionItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const granted = permissions.filter(p => p.granted);
  const denied = permissions.filter(p => !p.granted);

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        权限 ({granted.length}/{permissions.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 text-xs">
          {granted.map(p => (
            <div key={p.scope} className="flex items-center gap-1.5 text-green-700">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-mono text-gray-600">{p.scope}</span>
              <span className="text-gray-400">— {p.description}</span>
            </div>
          ))}
          {denied.map(p => (
            <div key={p.scope} className="flex items-center gap-1.5 text-gray-400">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="font-mono">{p.scope}</span>
              <span>— {p.description}</span>
            </div>
          ))}
        </div>
      )}
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
          <span className="font-medium text-gray-900">{connector.displayName || connector.name}</span>
        </div>
        <StatusBadge status={connector.status} />
      </div>

      {/* 自定义 MCP 显示 URL */}
      {connector.config?.serverUrl && !MCP_ICONS[connector.name] && (
        <div className="mt-1 text-xs text-gray-400 truncate">
          {connector.config.serverUrl}
        </div>
      )}

      {/* 账户信息 */}
      {connector.username && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="text-gray-400">账户:</span> {connector.username}
        </div>
      )}

      <div className="mt-2 text-sm text-gray-500 space-y-1">
        <div>可用工具: {connector.toolCount != null ? `${connector.toolCount} 个` : '—'}</div>
        <div>创建时间: {created}</div>
        {connector.status === 'error' && connector.errorMessage && (
          <div className="text-red-500">错误信息: {connector.errorMessage}</div>
        )}
      </div>

      {/* 权限信息 */}
      {connector.permissions && connector.permissions.length > 0 && (
        <PermissionsList permissions={connector.permissions} />
      )}

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
  const [credentialProviderName, setCredentialProviderName] = useState('');

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch<Connector[]>('/api/user/channels?type=mcp');
      const list = Array.isArray(data) ? data : [];
      setConnectors(list);
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
      const count = res?.toolCount;
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
                  setToolsConnectorName(conn.displayName || conn.name);
                }}
                onRefreshTools={() => handleRefreshTools(conn.id)}
                onUpdateCredential={() => {
                  setCredentialConnectorId(conn.id);
                  setCredentialConnectorName(conn.displayName || conn.name);
                  setCredentialProviderName(conn.name);
                }}
                onRestart={() => handleRestart(conn.id)}
                onDelete={() => {
                  setDeleteId(conn.id);
                  setDeleteName(conn.displayName || conn.name);
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
        connectedNames={connectors.map(c => c.name)}
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
        providerName={credentialProviderName}
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

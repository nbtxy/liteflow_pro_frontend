'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

// ─── 类型 ───
interface Channel {
  id: string;
  type: string;
  name: string;
  status: 'active' | 'error' | 'stopped' | 'pending';
  appId?: string;
  errorMessage?: string;
  createdAt: string;
}

// ─── 状态徽标 ───
const STATUS_CONFIG: Record<string, { label: string; dotColor: string; textColor: string }> = {
  active:  { label: '已连接',   dotColor: 'bg-green-500',  textColor: 'text-green-700' },
  error:   { label: '连接异常', dotColor: 'bg-red-500',    textColor: 'text-red-700' },
  stopped: { label: '已停止',   dotColor: 'bg-gray-400',   textColor: 'text-gray-600' },
  pending: { label: '连接中',   dotColor: 'bg-yellow-500', textColor: 'text-yellow-700' },
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

// ─── 渠道类型选择面板 ───
const CHANNEL_TYPES = [
  { type: 'feishu', icon: '🤖', name: '飞书机器人', desc: '在飞书中通过 @机器人 使用 LiteFlow', available: true },
  { type: 'wecom',  icon: '💬', name: '企业微信',   desc: '在企业微信中使用 LiteFlow',         available: false },
  { type: 'dingtalk', icon: '📌', name: '钉钉',     desc: '在钉钉中使用 LiteFlow',             available: false },
];

function ChannelTypeSelector({ onSelect, onClose }: { onSelect: (type: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900">添加消息渠道</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">选择要添加的渠道类型</p>

        <div className="space-y-3">
          {CHANNEL_TYPES.map(ct => (
            <button
              key={ct.type}
              onClick={() => ct.available && onSelect(ct.type)}
              disabled={!ct.available}
              className={`w-full text-left p-4 border rounded-lg flex items-center justify-between transition-colors ${
                ct.available ? 'hover:bg-gray-50 cursor-pointer border-gray-200' : 'opacity-50 cursor-not-allowed border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ct.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{ct.name}</div>
                  <div className="text-sm text-gray-500">{ct.desc}</div>
                </div>
              </div>
              {ct.available ? (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">即将支持</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 飞书添加弹窗（左右分栏：左边指引，右边配置） ───
function AddFeishuDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = useCallback(() => {
    setName('');
    setAppId('');
    setAppSecret('');
    setShowSecret(false);
    setSubmitting(false);
    setResult(null);
    setErrorMsg('');
  }, []);

  async function handleSubmit() {
    if (!name.trim() || !appId.trim() || !appSecret.trim()) {
      toast.error('请填写所有字段');
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      await apiFetch('/api/user/channels', {
        method: 'POST',
        body: JSON.stringify({
          type: 'feishu',
          name: name.trim(),
          config: { appId: appId.trim(), appSecret: appSecret.trim() },
        }),
      });
      setResult('success');
    } catch (e) {
      setResult('error');
      setErrorMsg(e instanceof Error ? e.message : '连接失败');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    reset();
    onSuccess();
  }

  if (!open) return null;

  // 成功/失败/连接中 状态用居中全宽展示
  if (result === 'success') {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">连接成功！</h3>
          <p className="text-sm text-gray-500 mb-6">
            你的飞书团队成员现在可以通过<br />@{name} 来使用 LiteFlow 了
          </p>
          <button onClick={handleDone} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            完成
          </button>
        </div>
      </div>
    );
  }

  if (result === 'error') {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">连接失败</h3>
          <p className="text-sm text-red-500 mb-6">{errorMsg}</p>
          <div className="flex justify-center gap-3">
            <button onClick={handleSubmit} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              重试
            </button>
            <button onClick={() => setResult(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              返回修改
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-8 text-center">
          <Spinner className="w-8 h-8 mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600 font-medium">正在连接...</p>
          <p className="text-sm text-gray-400 mt-2">验证凭证并建立连接</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">添加飞书机器人</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 左右分栏 */}
        <div className="flex flex-col md:flex-row">
          {/* 左侧：配置指引 */}
          <div className="md:w-1/2 p-6 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto max-h-[70vh]">
            <h3 className="font-medium text-gray-900 mb-3">配置指引</h3>
            <div className="text-sm text-gray-600 space-y-3">
              <p className="text-gray-500">请先在飞书开放平台完成以下配置：</p>
              <ol className="list-decimal list-inside space-y-2.5">
                <li>
                  访问 <span className="text-teal-600 font-medium">open.feishu.cn</span>，创建企业自建应用
                </li>
                <li>
                  在「权限管理」页面开通权限：
                  <ul className="mt-1.5 ml-5 space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                      <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">im:message</code>
                      <span className="text-gray-400">读取消息</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                      <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">im:message:send_as_bot</code>
                      <span className="text-gray-400">发送消息</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                      <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">im:resource</code>
                      <span className="text-gray-400">读取文件资源</span>
                    </li>
                  </ul>
                </li>
                <li>
                  在「事件与回调」页面添加事件：
                  <ul className="mt-1.5 ml-5">
                    <li className="flex items-start gap-1.5">
                      <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                      <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">im.message.receive_v1</code>
                      <span className="text-gray-400">接收消息</span>
                    </li>
                  </ul>
                </li>
                <li>在「应用能力」中开启「机器人」能力</li>
                <li>创建版本并发布应用</li>
              </ol>
            </div>
          </div>

          {/* 右侧：填写凭证 */}
          <div className="md:w-1/2 p-6 overflow-y-auto max-h-[70vh]">
            <h3 className="font-medium text-gray-900 mb-4">填写应用凭证</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">机器人名称</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="工作机器人"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-gray-400 mt-1">给机器人起个名字，方便你区分</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                <input
                  value={appId}
                  onChange={e => setAppId(e.target.value)}
                  placeholder="cli_"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-gray-400 mt-1">在飞书开放平台「凭证与基础信息」页面获取</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={appSecret}
                    onChange={e => setAppSecret(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">在飞书开放平台「凭证与基础信息」页面获取</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || !appId.trim() || !appSecret.trim()}
                className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加机器人
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 机器人卡片 ───
function FeishuChannelCard({ channel, onRestart, onDelete }: {
  channel: Channel;
  onRestart: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [restarting, setRestarting] = useState(false);

  async function handleRestart() {
    setRestarting(true);
    try {
      await onRestart(channel.id);
    } finally {
      setRestarting(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-medium text-gray-900">{channel.name}</span>
        </div>
        <StatusBadge status={channel.status} />
      </div>

      <div className="mt-3 text-sm text-gray-500 space-y-1">
        <div>App ID: {channel.appId ? `${channel.appId.slice(0, 8)}****` : '-'}</div>
        <div>创建时间: {new Date(channel.createdAt).toLocaleString('zh-CN')}</div>
        {channel.status === 'error' && channel.errorMessage && (
          <div className="text-red-500">错误信息: {channel.errorMessage}</div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={handleRestart}
          disabled={restarting}
          className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {restarting ? '重连中...' : '重新连接'}
        </button>
        <button
          onClick={() => onDelete(channel.id)}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
}

// ─── 主页面 ───
export function ChannelsView() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [showAddFeishu, setShowAddFeishu] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch<Channel[]>('/api/user/channels');
      setChannels(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    // 每 30 秒刷新状态
    const timer = setInterval(fetchChannels, 30_000);
    return () => clearInterval(timer);
  }, [fetchChannels]);

  // 页面不可见时暂停轮询
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchChannels();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchChannels]);

  const feishuChannels = channels.filter(c => c.type === 'feishu');

  function handleChannelTypeSelect(type: string) {
    setShowSelector(false);
    if (type === 'feishu') {
      setShowAddFeishu(true);
    }
  }

  async function handleRestart(channelId: string) {
    try {
      await apiFetch(`/api/user/channels/${channelId}/restart`, { method: 'POST' });
      toast.success('重连成功');
      fetchChannels();
    } catch {
      toast.error('重连失败');
      fetchChannels();
    }
  }

  function handleDeleteRequest(channel: Channel) {
    setDeleteId(channel.id);
    setDeleteName(channel.name);
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/user/channels/${deleteId}`, { method: 'DELETE' });
      toast.success('已删除');
      setDeleteId(null);
      fetchChannels();
    } catch {
      toast.error('删除失败');
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">渠道管理</h1>
            <p className="text-sm text-gray-500 mt-1">连接外部平台，在飞书、企业微信等中使用 LiteFlow</p>
          </div>
          <button
            onClick={() => setShowSelector(true)}
            className="shrink-0 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加消息渠道
          </button>
        </div>

        {/* 加载中 */}
        {loading && channels.length === 0 ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Spinner className="w-5 h-5" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : loadError ? (
          /* 加载失败 */
          <div className="text-center py-20">
            <p className="text-gray-500 mb-3">加载失败</p>
            <button onClick={fetchChannels} className="text-sm text-teal-600 hover:text-teal-700">
              点击重试
            </button>
          </div>
        ) : channels.length === 0 ? (
          /* 空状态 */
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📡</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">还没有添加消息渠道</h3>
            <p className="text-sm text-gray-400 mb-6">添加后可在飞书等平台中使用 LiteFlow</p>
            <button
              onClick={() => setShowSelector(true)}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              + 添加消息渠道
            </button>
          </div>
        ) : (
          /* 飞书机器人列表 */
          <>
            {feishuChannels.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-800 mb-4">飞书机器人</h2>
                <div className="space-y-4">
                  {feishuChannels.map(ch => (
                    <FeishuChannelCard
                      key={ch.id}
                      channel={ch}
                      onRestart={handleRestart}
                      onDelete={() => handleDeleteRequest(ch)}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  已添加 {feishuChannels.length}/3 个（每个用户最多 3 个）
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {/* 渠道类型选择面板 */}
      {showSelector && (
        <ChannelTypeSelector
          onSelect={handleChannelTypeSelect}
          onClose={() => setShowSelector(false)}
        />
      )}

      {/* 飞书添加弹窗 */}
      <AddFeishuDialog
        open={showAddFeishu}
        onClose={() => setShowAddFeishu(false)}
        onSuccess={() => {
          setShowAddFeishu(false);
          fetchChannels();
        }}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteId}
        title="确认删除"
        description={`删除后飞书团队成员将无法继续通过 @${deleteName} 使用 LiteFlow。通过该机器人产生的对话记录会保留。`}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

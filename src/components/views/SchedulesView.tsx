'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import cronstrue from 'cronstrue/i18n';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import type { ScheduledTask, TaskExecution } from '@/lib/types';

// ─── 状态徽标 ───
const STATUS_CONFIG: Record<string, { label: string; dotColor: string; textColor: string }> = {
  active:  { label: '运行中', dotColor: 'bg-green-500',  textColor: 'text-green-700' },
  paused:  { label: '已暂停', dotColor: 'bg-yellow-500', textColor: 'text-yellow-700' },
  stopped: { label: '已停止', dotColor: 'bg-gray-400',   textColor: 'text-gray-600' },
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

// ─── 执行记录弹窗 ───
function ExecutionsModal({
  task,
  open,
  onClose,
}: {
  task: ScheduledTask | null;
  open: boolean;
  onClose: () => void;
}) {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExecutions = useCallback(async (p: number) => {
    if (!task) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ content: TaskExecution[]; totalPages: number }>(`/api/tasks/${task.id}/executions?page=${p}&size=5`);
      setExecutions(data.content || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      toast.error('获取执行记录失败');
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (open && task) {
      fetchExecutions(0);
    } else {
      setExecutions([]);
      setPage(0);
      setTotalPages(1);
    }
  }, [open, task, fetchExecutions]);

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">{task.name} — 执行记录</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner className="w-8 h-8 text-teal-600" />
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="text-4xl mb-2">📋</span>
              <p>暂无执行记录</p>
            </div>
          ) : (
            <div className="space-y-4 pr-2">
              {executions.map(exec => (
                <div key={exec.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(exec.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <div className="flex items-center gap-3 text-sm">
                      {exec.status === 'success' ? (
                        <span className="text-green-600 flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> 成功</span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg> 失败</span>
                      )}
                      {exec.durationMs && <span className="text-gray-500">{(exec.durationMs / 1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-3 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Tokens: {(exec.inputTokens || 0) + (exec.outputTokens || 0)}</span>
                    {exec.toolsUsed && exec.toolsUsed.length > 0 && (
                      <span>工具: {exec.toolsUsed.join(', ')}</span>
                    )}
                  </div>
                  
                  {exec.errorMessage ? (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded whitespace-pre-wrap break-words">
                      错误: {exec.errorMessage}
                    </div>
                  ) : exec.resultSummary ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words border-t border-gray-200/60 pt-3 mt-1">
                      {exec.resultSummary}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => fetchExecutions(page - 1)}
              disabled={page === 0 || loading}
              className="px-3 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← 上一页
            </button>
            <span className="text-sm text-gray-500">第 {page + 1} / {totalPages} 页</span>
            <button
              onClick={() => fetchExecutions(page + 1)}
              disabled={page >= totalPages - 1 || loading}
              className="px-3 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 任务行 ───
function TaskRow({
  task,
  onRefresh,
  onViewExecutions,
}: {
  task: ScheduledTask;
  onRefresh: () => void;
  onViewExecutions: (task: ScheduledTask) => void;
}) {
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatOutputTargets = useMemo(() => {
    const targets = task.outputConfig?.targets || [];
    return targets.map(t => t.type === 'conversation' ? '对话' : t.type === 'feishu' ? '飞书' : t.type).join(' + ');
  }, [task.outputConfig]);

  const humanReadableCron = useMemo(() => {
    try {
      return cronstrue.toString(task.cronExpression, { locale: 'zh_CN', use24HourTimeFormat: true });
    } catch {
      return task.cronExpression;
    }
  }, [task.cronExpression]);

  const displayTimezone = task.timezone === 'Asia/Shanghai' || !task.timezone ? '北京时间' : task.timezone;

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await apiFetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
      toast.success('已触发执行，结果将推送到指定渠道');
      onRefresh();
    } catch {
      // handled by apiFetch
    } finally {
      setRunning(false);
    }
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      const action = task.status === 'active' ? 'pause' : 'resume';
      await apiFetch(`/api/tasks/${task.id}/${action}`, { method: 'POST' });
      toast.success(action === 'pause' ? '任务已暂停' : '任务已恢复');
      onRefresh();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      toast.success('任务已删除');
      onRefresh();
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-medium text-gray-900">{task.name}</span>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="mt-3 text-sm text-gray-500 space-y-1">
          <div>{humanReadableCron}（{displayTimezone}）</div>
          <div>输出: {formatOutputTargets || '-'} · 已执行 {task.totalRuns} 次 · {(task.totalTokens / 1000).toFixed(1)}K tokens</div>
          {task.lastRunAt && (
            <div className="text-gray-400">
              上次执行: {new Date(task.lastRunAt).toLocaleString('zh-CN')}
              {task.lastRunStatus === 'success' ? ' ✅' : ' ❌'}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => onViewExecutions(task)}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            执行记录
          </button>
          <button
            onClick={handleRunNow}
            disabled={running}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {running ? '执行中...' : '立即执行'}
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {toggling ? '请稍候...' : task.status === 'active' ? '暂停' : '恢复'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            删除
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="删除定时任务"
        description={`确定要删除任务"${task.name}"吗？此操作不可恢复。`}
        confirmText={deleting ? '删除中...' : '删除'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

// ─── 主页面 ───
export function SchedulesView() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // 执行记录弹窗状态
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch<ScheduledTask[]>('/api/tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // 轮询刷新状态
    const timer = setInterval(fetchTasks, 30_000);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-teal-600" />
      </div>
    );
  }

  if (loadError && tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <p className="mb-4">加载失败</p>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">定时任务</h1>
            <p className="text-sm text-gray-500 mt-1">AI 按计划自动执行任务并推送结果</p>
          </div>
          <button
            onClick={fetchTasks}
            className="shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新列表"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* 列表内容 */}
        {tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⏰</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">还没有定时任务</h3>
            <p className="text-sm text-gray-400 mb-6">
              在对话中告诉 AI 你想定期做什么。例如：<br/>
              &quot;每天早上 9 点帮我搜 AI 新闻&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onRefresh={fetchTasks}
                onViewExecutions={setSelectedTask}
              />
            ))}
            <p className="text-xs text-gray-400 mt-4">
              共 {tasks.length} 个任务
            </p>
          </div>
        )}
      </div>

      <ExecutionsModal
        task={selectedTask}
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}

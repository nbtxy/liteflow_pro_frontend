'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import type { AgentProfile } from '@/lib/types';

export function AgentsView() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    [agents]
  );

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch<AgentProfile[]>('/api/agents');
      setAgents(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAgentType = (agent: AgentProfile) => agent.agentType || agent.type || '-';
  const getProvider = (agent: AgentProfile) => agent.llmProvider || agent.llm?.provider || '-';
  const getModel = (agent: AgentProfile) => agent.llmModel || agent.llm?.model || '-';
  const getUpdatedAt = (agent: AgentProfile) => {
    const value = agent.updatedAt || agent.createdAt;
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
  };

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent 管理</h1>
            <p className="text-sm text-gray-500 mt-1">查看主 Agent / 子 Agent 的配置概览</p>
          </div>
          <button
            onClick={fetchAgents}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading && agents.length === 0 ? (
          <div className="flex justify-center py-14">
            <Spinner className="w-8 h-8 text-teal-600" />
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
            加载 Agent 列表失败，请重试
          </div>
        ) : sortedAgents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1-1-2 1 .75-3M3 13V5a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-6 6v-8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无 Agent</h3>
            <p className="text-sm text-gray-500">当前环境还没有可展示的 Agent</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedAgents.map((agent) => (
              <div key={agent.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{agent.name}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${getAgentType(agent) === 'main' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {getAgentType(agent)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.description || '暂无描述'}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">P{agent.priority ?? 0}</span>
                </div>

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>Provider: {getProvider(agent)}</div>
                  <div>Model: {getModel(agent)}</div>
                  <div>Skill: {(agent.enabledSkillNames || []).join(', ') || '-'}</div>
                  <div>更新于: {getUpdatedAt(agent)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

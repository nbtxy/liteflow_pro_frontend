'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { SkillItem } from './skills/types';
import { InstalledSkills } from './skills/InstalledSkills';
import { SkillDetailDialog } from './skills/SkillDetailDialog';

export function SkillsView() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<SkillItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await apiFetch<SkillItem[]>('/api/skills');
      const list = (result || []).map((item) => ({
        ...item,
        description: (item.description || '').trim() || '暂无描述',
      }));
      setSkills(list);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && skills.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-teal-600" />
      </div>
    );
  }

  if (loadError && skills.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <p className="mb-4">加载失败</p>
        <button
          onClick={fetchData}
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
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">技能</h1>
            <p className="text-sm text-gray-500 mt-1">AI 可以加载专业技能来完成特定任务</p>
          </div>
          <button
            onClick={fetchData}
            className="shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新列表"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🧩</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">还没有可用技能</h3>
            <p className="text-sm text-gray-400">
              当前环境暂无内置技能，后续可通过系统配置加载更多技能能力
            </p>
          </div>
        ) : (
          <InstalledSkills
            skills={skills}
            onView={setViewingSkill}
          />
        )}
      </div>

      {viewingSkill && (
        <SkillDetailDialog
          skill={viewingSkill}
          onClose={() => setViewingSkill(null)}
        />
      )}
    </div>
  );
}

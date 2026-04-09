'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { SkillItem, SkillsData } from './skills/types';
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
      const result = await apiFetch<SkillsData>('/api/skills');
      setSkills(result.skills || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden relative">
      {/* 头部 */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">技能</h1>
            <p className="text-sm text-gray-500 mt-1">
              AI 可以加载专业技能来完成特定任务
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="h-1" />
      </header>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner className="w-8 h-8 text-teal-600" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="mb-4">加载失败</p>
              <button onClick={fetchData} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                重试
              </button>
            </div>
          ) : (
            skills.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 flex flex-col items-center justify-center text-center mt-8">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4 text-3xl">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无内置技能</h3>
              </div>
            ) : (
              <InstalledSkills
                skills={skills}
                onView={setViewingSkill}
              />
            )
          )}
        </div>
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

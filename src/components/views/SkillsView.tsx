'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

// ─── 类型 ───
interface SkillItem {
  name: string;
  description: string;
}

interface SkillsData {
  skills: SkillItem[];
}

// ─── 技能图标映射 ───
const SKILL_META: Record<string, { icon: string; label: string; color: string }> = {
  pptx: { icon: '📊', label: 'PPT 演示文稿', color: 'bg-orange-50 text-orange-700' },
  docx: { icon: '📝', label: 'Word 文档',    color: 'bg-blue-50 text-blue-700' },
  xlsx: { icon: '📈', label: 'Excel 表格',   color: 'bg-green-50 text-green-700' },
  pdf:  { icon: '📕', label: 'PDF 文件',     color: 'bg-red-50 text-red-700' },
};

// ─── 技能卡片 ───
function SkillCard({ skill }: { skill: SkillItem }) {
  const meta = SKILL_META[skill.name] || { icon: '📦', label: skill.name, color: 'bg-gray-50 text-gray-700' };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${meta.color.split(' ')[0]} flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{meta.label}</h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">{skill.name}</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{skill.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───
export function SkillsView() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-teal-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <p className="mb-4">加载失败</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* 头部 */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">技能中心</h1>
          <p className="text-sm text-gray-500 mt-1">
            在对话中提到相关关键词时，AI 会自动加载对应技能
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
      </header>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {skills.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 flex flex-col items-center justify-center text-center mt-8">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4 text-3xl">
                📚
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可用技能</h3>
              <p className="text-gray-500 max-w-sm">技能会由管理员在后端配置，配置后将自动显示在此处</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map(skill => (
                <SkillCard key={skill.name} skill={skill} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

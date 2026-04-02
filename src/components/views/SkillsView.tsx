'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { SkillItem, SkillsData } from './skills/types';
import { InstalledSkills } from './skills/InstalledSkills';
import { DiscoverSkills } from './skills/DiscoverSkills';
import { SkillDetailDialog } from './skills/SkillDetailDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function SkillsView() {
  const [tab, setTab] = useState<'installed' | 'discover'>('installed');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewingSkill, setViewingSkill] = useState<SkillItem | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<SkillItem | null>(null);

  // Mock admin status for now
  const isAdmin = true;

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

  const handleInstall = async (skill: SkillItem) => {
    try {
      await apiFetch('/api/skills/install', { 
        method: 'POST', 
        body: JSON.stringify({ slug: skill.slug || skill.name }) 
      });
      toast.success(`技能 ${skill.name} 已安装，在对话中即可使用`);
      fetchData();
      setViewingSkill(null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : '';
      toast.error(errorMessage || '安装失败，请稍后重试');
    }
  };

  // Show confirmation dialog before uninstall
  const handleUninstall = (skill: SkillItem) => {
    setUninstallTarget(skill);
  };

  const doUninstall = async () => {
    if (!uninstallTarget) return;
    const skill = uninstallTarget;
    setUninstallTarget(null);
    try {
      const slug = skill.slug || skill.name;
      if (skill.scope === 'global') {
        if (!isAdmin) {
          toast.error('暂不支持卸载全局技能');
          return;
        }
        await apiFetch(`/api/admin/skills/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/skills/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      }
      toast.success(`已卸载 ${skill.name}`);
      fetchData();
      setViewingSkill(null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : '';
      toast.error(errorMessage || '卸载失败');
    }
  };

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

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 -mb-4">
          <button
            onClick={() => setTab('installed')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              tab === 'installed' ? 'text-teal-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            已安装
            {tab === 'installed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setTab('discover')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              tab === 'discover' ? 'text-teal-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            发现更多
            {tab === 'discover' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
            )}
          </button>
        </div>
      </header>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto h-full">
          {loading && tab === 'installed' ? (
            <div className="flex items-center justify-center h-full">
              <Spinner className="w-8 h-8 text-teal-600" />
            </div>
          ) : loadError && tab === 'installed' ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="mb-4">加载失败</p>
              <button onClick={fetchData} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                重试
              </button>
            </div>
          ) : tab === 'installed' ? (
            skills.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed p-12 flex flex-col items-center justify-center text-center mt-8">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4 text-3xl">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无已安装技能</h3>
                <p className="text-gray-500 max-w-sm">去「发现更多」寻找有用的技能吧</p>
              </div>
            ) : (
              <InstalledSkills
                skills={skills}
                onView={setViewingSkill}
                onUninstall={handleUninstall}
                isAdmin={isAdmin}
              />
            )
          ) : (
            <DiscoverSkills
              installedSlugs={skills.map(s => s.slug || s.name)}
              onInstall={handleInstall}
              onView={setViewingSkill}
            />
          )}
        </div>
      </div>

      {viewingSkill && (
        <SkillDetailDialog
          skill={viewingSkill}
          onClose={() => setViewingSkill(null)}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          isAdmin={isAdmin}
        />
      )}

      <ConfirmDialog
        open={!!uninstallTarget}
        title="确认卸载"
        description="卸载后 AI 将无法使用此技能，不会影响已有的对话和文件。"
        confirmText="确认卸载"
        cancelText="取消"
        variant="danger"
        onConfirm={doUninstall}
        onCancel={() => setUninstallTarget(null)}
      />
    </div>
  );
}

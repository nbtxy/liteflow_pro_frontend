'use client';

import React, { useState, useEffect } from 'react';
import { SkillItem } from './types';
import { CompatBadge } from './CompatBadge';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { useDebounce } from '@/hooks/useDebounce';

const SKILL_META: Record<string, { icon: string }> = {
  pptx:        { icon: '📊' },
  docx:        { icon: '📄' },
  xlsx:        { icon: '📈' },
  pdf:         { icon: '📑' },
  frontend:    { icon: '🎨' },
  obsidian:    { icon: '📝' },
  github:      { icon: '🐙' },
  slack:       { icon: '💬' },
  gog:         { icon: '📧' },
  'apple-notes': { icon: '🍎' },
};

interface Props {
  installedSlugs: string[];
  onInstall: (skill: SkillItem) => void;
  onView: (skill: SkillItem) => void;
}

export function DiscoverSkills({ installedSlugs, onInstall, onView }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SkillItem[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let active = true;
    const fetchSearch = async () => {
      setLoading(true);
      try {
        let data: { content: SkillItem[] } = { content: [] };
        try {
          data = await apiFetch(`/api/skills/search?q=${encodeURIComponent(debouncedQuery)}&size=20`);
        } catch {
          // Mock data based on guide
          data = {
            content: [
              {
                slug: 'steipete/obsidian',
                name: 'obsidian',
                description: 'Manage your Obsidian vault with AI',
                author: 'steipete',
                stars: 1200,
                version: '1.2.0',
                installed: installedSlugs.includes('steipete/obsidian'),
                compat: { level: 'PARTIAL' as const, score: 45, issues: ['需要本地应用: obsidian'] }
              },
              {
                slug: 'steipete/github',
                name: 'github',
                description: 'GitHub workflow automation',
                author: 'steipete',
                stars: 2300,
                version: '2.1.0',
                installed: installedSlugs.includes('steipete/github'),
                compat: { level: 'FULL' as const, score: 100, issues: [] }
              },
              {
                slug: 'nichochar/gog',
                name: 'gog',
                description: 'Google Workspace integration',
                author: 'nichochar',
                stars: 980,
                installed: installedSlugs.includes('nichochar/gog'),
                compat: { level: 'FULL' as const, score: 100, issues: [] }
              },
              {
                slug: 'steipete/slack',
                name: 'slack',
                description: 'Slack messaging and channel management',
                author: 'steipete',
                stars: 1500,
                installed: installedSlugs.includes('steipete/slack'),
                compat: { level: 'FULL' as const, score: 100, issues: [] }
              },
              {
                slug: 'steipete/apple-notes',
                name: 'apple-notes',
                description: 'Apple Notes integration (macOS only)',
                author: 'steipete',
                stars: 890,
                installed: false,
                compat: { level: 'INCOMPATIBLE' as const, score: 15, issues: ['需要 computer 能力'] }
              }
            ].filter(item =>
              !debouncedQuery ||
              item.name.includes(debouncedQuery.toLowerCase()) ||
              item.description.toLowerCase().includes(debouncedQuery.toLowerCase())
            )
          };
        }
        if (active) {
          setResults(data.content || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSearch();
    return () => { active = false; };
  }, [debouncedQuery, installedSlugs]);

  return (
    <div className="flex flex-col space-y-6">
      {/* 搜索框 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm text-gray-900"
          placeholder="搜索 ClawHub 社区技能..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* 列表区域 */}
      <div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 text-teal-600" />
          </div>
        ) : (
          <>
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              {query ? `搜索结果 (${results.length})` : '热门推荐'}
            </h3>
            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-500">未找到相关技能</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {results.map(skill => {
                  const meta = SKILL_META[skill.name] || { icon: '📦' };
                  return (
                    <div
                      key={skill.slug || skill.name}
                      onClick={() => onView(skill)}
                      className="flex items-center px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">
                        {meta.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-gray-900">{skill.name}</span>
                          {skill.compat && (
                            <CompatBadge level={skill.compat.level} score={skill.compat.score} />
                          )}
                        </div>
                        {skill.slug && (
                          <div className="text-xs text-gray-400 mb-0.5">{skill.slug}</div>
                        )}
                        <p className="text-sm text-gray-500 truncate">{skill.description}</p>
                      </div>

                      {/* Stars + action */}
                      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                        {skill.stars !== undefined && (
                          <span className="text-sm text-gray-500 hidden sm:block">
                            ⭐ {skill.stars.toLocaleString()}
                          </span>
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                          {skill.installed ? (
                            <span className="text-xs text-gray-400 px-3 py-1.5 bg-gray-100 rounded-lg">
                              已安装
                            </span>
                          ) : skill.compat?.level === 'INCOMPATIBLE' ? (
                            <span className="text-gray-300 text-sm px-3">——</span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); onInstall(skill); }}
                              className="text-sm text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                            >
                              安装
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

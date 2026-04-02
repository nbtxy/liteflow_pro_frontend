import React, { useEffect, useState } from 'react';
import { SkillItem } from './types';
import { apiFetch } from '@/lib/api';
import { md } from '@/lib/markdown';
import { Spinner } from '@/components/ui/Spinner';
import { CompatBadge } from './CompatBadge';

interface Props {
  skill: SkillItem;
  onClose: () => void;
  onInstall: (skill: SkillItem) => void;
  onUninstall: (skill: SkillItem) => void;
  isAdmin?: boolean;
}

export function SkillDetailDialog({ skill, onClose, onInstall, onUninstall, isAdmin }: Props) {
  const [loading, setLoading] = useState(false);
  const [contentHtml, setContentHtml] = useState<string>('');
  
  // Installed if: has scope (from installed list), has installed=true flag, or is legacy global skill with no scope/slug
  const isInstalled = skill.scope !== undefined || skill.installed === true || (!skill.scope && !skill.slug);
  // Global if: scope explicitly 'global', or legacy skill with no scope and no slug (old backend)
  const isGlobal = skill.scope === 'global' || (!skill.scope && !skill.slug);

  useEffect(() => {
    // Fetch skill detail
    const fetchDetail = async () => {
      setLoading(true);
      try {
        let detail: { skillContent?: string } | null = null;
        // GET /api/skills/{name} per API spec
        detail = await apiFetch<{ skillContent?: string }>(`/api/skills/${encodeURIComponent(skill.name)}`).catch(() => null);

        if (detail?.skillContent) {
          setContentHtml(md.render(detail.skillContent));
        } else if (skill.skillContent) {
          setContentHtml(md.render(skill.skillContent));
        } else {
          // mock some content
          setContentHtml(md.render(`# ${skill.name}\n\n${skill.description}\n\n> 提示：这是模拟的技能详情内容。`));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [skill]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {skill.name}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="text-gray-700 text-lg mb-4">
             {skill.description}
          </div>

          <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
            {skill.author && (
              <>
                <div className="text-gray-400">作者</div>
                <div className="font-medium text-gray-900">{skill.author}</div>
              </>
            )}
            <div className="text-gray-400">来源</div>
            <div className="font-medium text-gray-900 truncate" title={skill.sourceUrl || `clawhub.ai/${skill.slug || skill.name}`}>
              {skill.sourceUrl || `clawhub.ai/${skill.slug || skill.name}`}
            </div>
            <div className="text-gray-400">类型</div>
            <div className="font-medium text-gray-900">
              {isGlobal ? '全局技能（管理员安装）' : '个人技能'}
            </div>
            {skill.stars !== undefined && (
              <>
                <div className="text-gray-400">星标</div>
                <div className="font-medium text-gray-900">⭐ {skill.stars.toLocaleString()}</div>
              </>
            )}
            {skill.version && (
              <>
                <div className="text-gray-400">版本</div>
                <div className="font-medium text-gray-900">{skill.version}</div>
              </>
            )}
            {skill.installedAt && (
              <>
                <div className="text-gray-400">安装时间</div>
                <div className="font-medium text-gray-900">{new Date(skill.installedAt).toLocaleString()}</div>
              </>
            )}
            {skill.compat && (
              <>
                <div className="text-gray-400 mt-1">兼容性</div>
                <div><CompatBadge level={skill.compat.level} score={skill.compat.score} /></div>
              </>
            )}
          </div>

          {/* 兼容性警告区 */}
          {skill.compat && skill.compat.level !== 'FULL' && (
            <div className={`p-4 rounded-xl ${skill.compat.level === 'INCOMPATIBLE' ? 'bg-red-50 border border-red-100' : 'bg-yellow-50 border border-yellow-100'}`}>
              <h4 className={`font-medium mb-2 ${skill.compat.level === 'INCOMPATIBLE' ? 'text-red-800' : 'text-yellow-800'}`}>
                {skill.compat.level === 'INCOMPATIBLE' ? '❌ 不兼容' : '⚠️ 部分兼容'}
              </h4>
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                {skill.compat.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
              {skill.compat.level === 'INCOMPATIBLE' && (
                <p className="mt-3 text-sm text-red-600">该技能无法在 LiteFlow 中运行。</p>
              )}
            </div>
          )}

          {/* 安全提示 */}
          {!isGlobal && !isInstalled && (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
              <h4 className="font-medium text-orange-800 mb-1 flex items-center gap-2">
                ⚠️ 安全提示
              </h4>
              <p className="text-sm text-orange-700">
                社区技能由第三方开发者提供，安装前请确认来源可信。LiteFlow 会进行基础安全扫描，但无法保证完全安全。
              </p>
            </div>
          )}

          {/* 使用方式 - only shown for installed skills */}
          {isInstalled && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h3 className="font-medium text-gray-900 text-sm">使用方式</h3>
              <p className="text-sm text-gray-600">
                在对话中告诉 AI 你想做什么，AI 会自动加载此技能。
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 border-b pb-2">技能内容</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-teal-600" />
              </div>
            ) : (
              <div className="message-content prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: contentHtml }} />
            )}
          </div>

        </div>

        {/* 底部操作区 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          {isInstalled ? (
             <>
               {/* 检查更新 - only for user (non-global) installed skills */}
               {!isGlobal && (
                 <button
                   onClick={() => {}}
                   className="px-4 py-2 text-sm font-medium text-teal-600 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                 >
                   检查更新
                 </button>
               )}
               {/* Uninstall: admin can uninstall global; user can uninstall their own */}
               {(!isGlobal || isAdmin) && (
                 <button
                   onClick={() => onUninstall(skill)}
                   className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                 >
                   卸载
                 </button>
               )}
               <button
                 onClick={onClose}
                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 关闭
               </button>
             </>
          ) : (
            <>
               <button
                 onClick={onClose}
                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 取消
               </button>
               {skill.compat?.level !== 'INCOMPATIBLE' && (
                 <button
                   onClick={() => onInstall(skill)}
                   className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                 >
                   安装
                 </button>
               )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

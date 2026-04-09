import { SkillItem } from './types';

const SKILL_META: Record<string, { icon: string; color: string }> = {
  pptx: { icon: '📊', color: 'bg-orange-50 text-orange-700' },
  docx: { icon: '📄', color: 'bg-blue-50 text-blue-700' },
  xlsx: { icon: '📈', color: 'bg-green-50 text-green-700' },
  pdf:  { icon: '📑', color: 'bg-red-50 text-red-700' },
  frontend: { icon: '🎨', color: 'bg-pink-50 text-pink-700' },
  obsidian: { icon: '📝', color: 'bg-purple-50 text-purple-700' },
  github: { icon: '🐙', color: 'bg-gray-50 text-gray-700' },
  slack: { icon: '💬', color: 'bg-indigo-50 text-indigo-700' },
  gog: { icon: '📧', color: 'bg-blue-50 text-blue-700' },
};

interface Props {
  skill: SkillItem;
  showUninstall?: boolean;
  onClick: () => void;
  onUninstall?: () => void;
  onInstall?: () => void;
  isDiscover?: boolean;
}

export function SkillCard({ skill, showUninstall, onClick, onUninstall, onInstall, isDiscover }: Props) {
  const meta = SKILL_META[skill.name] || { icon: '📦', color: 'bg-gray-50 text-gray-700' };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group cursor-pointer flex flex-col relative"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${meta.color.split(' ')[0]} flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h3 className="font-semibold text-gray-900 truncate" title={skill.name}>{skill.name}</h3>
          </div>
          
          {skill.slug && (
            <div className="text-xs text-gray-400 mb-1 truncate">{skill.slug}</div>
          )}

          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2" title={skill.description}>
            {skill.description}
          </p>
        </div>
      </div>

      {/* 底部信息区域 */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {skill.stars !== undefined && (
            <span className="flex items-center gap-1">⭐ {skill.stars.toLocaleString()}</span>
          )}
          {skill.scope && !isDiscover && (
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
              {skill.scope === 'global' ? '全局' : '个人'}
            </span>
          )}
          {!skill.scope && !isDiscover && (
            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
              全局
            </span>
          )}
        </div>

        {/* 按钮区域（仅在特定场景下显示） */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isDiscover && (
            skill.installed ? (
              <span className="text-gray-400 cursor-default px-3 py-1 bg-gray-50 rounded">已安装</span>
            ) : skill.compat?.level === 'INCOMPATIBLE' ? (
              <span className="text-gray-400 cursor-default">——</span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onInstall?.(); }}
                className="text-teal-600 hover:text-teal-700 font-medium px-3 py-1 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
              >
                安装
              </button>
            )
          )}
          {!isDiscover && showUninstall && (
            <button
              onClick={(e) => { e.stopPropagation(); onUninstall?.(); }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              卸载
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

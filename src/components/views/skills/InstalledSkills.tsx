import React from 'react';
import { SkillItem } from './types';
import { SkillCard } from './SkillCard';

interface Props {
  skills: SkillItem[];
  onView: (skill: SkillItem) => void;
  onUninstall: (skill: SkillItem) => void;
  isAdmin?: boolean;
}

export function InstalledSkills({ skills, onView, onUninstall, isAdmin }: Props) {
  // If backend doesn't provide scope, default to 'global'
  const globalSkills = skills.filter(s => !s.scope || s.scope === 'global');
  const userSkills = skills.filter(s => s.scope === 'user');

  return (
    <div className="space-y-8">
      {globalSkills.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">全局技能（管理员安装）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {globalSkills.map(skill => (
              <SkillCard
                key={skill.slug || skill.name}
                skill={skill}
                showUninstall={isAdmin}
                onClick={() => onView(skill)}
                onUninstall={() => onUninstall(skill)}
              />
            ))}
          </div>
        </div>
      )}

      {userSkills.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">我安装的技能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userSkills.map(skill => (
              <SkillCard
                key={skill.slug || skill.name}
                skill={skill}
                showUninstall={true}
                onClick={() => onView(skill)}
                onUninstall={() => onUninstall(skill)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

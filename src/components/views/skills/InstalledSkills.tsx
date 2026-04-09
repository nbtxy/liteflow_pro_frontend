import React from 'react';
import { SkillItem } from './types';
import { SkillCard } from './SkillCard';

interface Props {
  skills: SkillItem[];
  onView: (skill: SkillItem) => void;
}

export function InstalledSkills({ skills, onView }: Props) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-4">内置技能</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {skills.map(skill => (
          <SkillCard
            key={skill.slug || skill.name}
            skill={skill}
            onClick={() => onView(skill)}
          />
        ))}
      </div>
    </div>
  );
}

export interface CompatInfo {
  level: 'FULL' | 'PARTIAL' | 'INCOMPATIBLE';
  score: number;
  issues: string[];
}

export interface SkillItem {
  slug?: string;        // "steipete/obsidian"
  name: string;         // "obsidian"
  description: string;
  scope?: 'global' | 'user'; // missing means global in old backend
  author?: string;
  stars?: number;
  version?: string;
  installedAt?: string;
  compat?: CompatInfo;
  installed?: boolean;
  skillContent?: string;
}

export interface SkillsData {
  skills: SkillItem[];
}

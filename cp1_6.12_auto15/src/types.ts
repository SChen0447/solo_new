export type Priority = '高' | '中' | '低';

export type RequirementType = '功能' | '非功能';

export interface Requirement {
  id: string;
  number: number;
  title: string;
  description: string;
  priority: Priority;
  type: RequirementType;
  dependencies: string[];
}

export interface ParseResult {
  requirements: Requirement[];
  sourceText: string;
  timestamp: number;
  id: string;
}

export type CameraNodeType = 'fixed' | 'rotating' | 'military';

export type CameraNodeStatus = 'unencrypted' | 'encrypted' | 'alert-linked';

export type DifficultyLevel = 'low' | 'medium' | 'high' | 'extreme';

export type ToolId = 'cracker' | 'signal-jammer' | 'virus-inject' | 'fake-id';

export interface Vulnerability {
  id: string;
  name: string;
  exploitDifficulty: number;
  description: string;
}

export interface CameraNode {
  id: string;
  name: string;
  type: CameraNodeType;
  status: CameraNodeStatus;
  encryptionLevel: number;
  coverageRadius: number;
  defenseRating: number;
  posX: number;
  posY: number;
  vulnerabilities: Vulnerability[];
}

export interface IntrusionTool {
  id: ToolId;
  name: string;
  description: string;
  effect: string;
  cooldown: number;
  efficiencyBonus: number;
}

export interface IntrusionResult {
  id: string;
  nodeId: string;
  nodeName: string;
  success: boolean;
  duration: number;
  alertCount: number;
  toolsUsed: ToolId[];
  timestamp: string;
}

export interface IntrusionLogEntry {
  id: string;
  nodeId: string;
  nodeName: string;
  result: boolean;
  duration: number;
  alertCount: number;
  toolsUsed: ToolId[];
  timestamp: string;
}

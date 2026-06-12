import { Request, Response, Router } from 'express';
import {
  UNIT_CONFIGS,
  INITIAL_BLUE_POSITIONS,
  INITIAL_RED_POSITIONS,
  BLUE_UNIT_ORDER,
  RED_UNIT_ORDER,
  UnitType,
  UnitConfig,
  Position,
} from '../game/types';

export const apiRouter = Router();

interface UnitPlacement {
  type: UnitType;
  side: 'blue' | 'red';
  position: Position;
}

interface UnitsResponse {
  configs: Record<UnitType, UnitConfig>;
  initialLayout: UnitPlacement[];
}

interface ConfigResponse {
  aiDifficulty: 'easy' | 'normal' | 'hard';
  aiMoveDelayMs: number;
  aiAttackDelayMs: number;
  aiThinkTimeMs: number;
}

const IN_MEMORY_CONFIG: ConfigResponse = {
  aiDifficulty: 'normal',
  aiMoveDelayMs: 400,
  aiAttackDelayMs: 300,
  aiThinkTimeMs: 2000,
};

function buildInitialLayout(): UnitPlacement[] {
  const layout: UnitPlacement[] = [];

  BLUE_UNIT_ORDER.forEach((type, i) => {
    layout.push({
      type,
      side: 'blue',
      position: INITIAL_BLUE_POSITIONS[i],
    });
  });

  RED_UNIT_ORDER.forEach((type, i) => {
    layout.push({
      type,
      side: 'red',
      position: INITIAL_RED_POSITIONS[i],
    });
  });

  return layout;
}

apiRouter.get('/units', (_req: Request, res: Response<UnitsResponse>) => {
  const response: UnitsResponse = {
    configs: UNIT_CONFIGS,
    initialLayout: buildInitialLayout(),
  };
  res.json(response);
});

apiRouter.get('/config', (_req: Request, res: Response<ConfigResponse>) => {
  res.json(IN_MEMORY_CONFIG);
});

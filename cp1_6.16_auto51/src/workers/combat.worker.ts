import type { Weapon, Enemy, CombatResult, SimulationConfig } from '../data/definitions';
import { simulateCombatPair, aggregateCombatResults, type CombatSimulationResult } from '../engine/combatSimulator';

export type WorkerMessageType = 
  | 'start'
  | 'progress'
  | 'complete'
  | 'error'
  | 'cancel';

export interface WorkerStartMessage {
  type: 'start';
  config: SimulationConfig;
}

export interface WorkerProgressMessage {
  type: 'progress';
  progress: number;
  currentPair: number;
  totalPairs: number;
  currentWeapon: string;
  currentEnemy: string;
}

export interface WorkerCompleteMessage {
  type: 'complete';
  config: SimulationConfig;
  results: CombatResult[];
}

export interface WorkerErrorMessage {
  type: 'error';
  error: string;
}

export interface WorkerCancelMessage {
  type: 'cancel';
}

export type WorkerMessage = 
  | WorkerStartMessage
  | WorkerCancelMessage;

export type WorkerResponse = 
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage;

let isCancelled = false;

const processSimulation = async (config: SimulationConfig): Promise<CombatResult[]> => {
  const { weapons, enemies, simulationsPerPair } = config;
  const totalPairs = weapons.length * enemies.length;
  const rawResults: CombatSimulationResult[] = [];
  let pairIndex = 0;

  for (let w = 0; w < weapons.length; w++) {
    const weapon = weapons[w];
    
    for (let e = 0; e < enemies.length; e++) {
      if (isCancelled) {
        throw new Error('Simulation cancelled');
      }

      const enemy = enemies[e];
      pairIndex++;

      const result = simulateCombatPair(weapon, enemy, simulationsPerPair, (current, total) => {
        if (isCancelled) return;
        
        const pairProgress = (pairIndex - 1) / totalPairs;
        const currentPairProgress = (current / total) / totalPairs;
        const overallProgress = pairProgress + currentPairProgress;

        const message: WorkerProgressMessage = {
          type: 'progress',
          progress: Math.min(0.99, overallProgress),
          currentPair: pairIndex,
          totalPairs,
          currentWeapon: weapon.name,
          currentEnemy: enemy.name
        };
        
        self.postMessage(message);
      });

      rawResults.push(result);

      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return aggregateCombatResults(rawResults);
};

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'start':
      isCancelled = false;
      try {
        const results = await processSimulation(message.config);
        
        const completeMessage: WorkerCompleteMessage = {
          type: 'complete',
          config: message.config,
          results
        };
        
        self.postMessage(completeMessage);
      } catch (error) {
        const errorMessage: WorkerErrorMessage = {
          type: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
        self.postMessage(errorMessage);
      }
      break;

    case 'cancel':
      isCancelled = true;
      break;
  }
};

export {};

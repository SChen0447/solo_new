import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { CardDef, OpponentConfig, BattleResult, Statistics } from './types';
import { runBattle, generateOpponentDeck, CARD_LIBRARY } from './engine';

interface AppState {
  playerDeck: CardDef[];
  opponentConfigs: OpponentConfig[];
  battleResults: BattleResult[];
  selectedBattleIndex: number | null;
  statistics: Statistics | null;
  isBattling: boolean;
  currentReplayTurn: number;

  setPlayerDeck: (deck: CardDef[]) => void;
  setOpponentConfigs: (configs: OpponentConfig[]) => void;
  runBattle: () => void;
  resetBattle: () => void;
  selectBattle: (index: number) => void;
  setCurrentReplayTurn: (turn: number) => void;
}

function computeStatistics(results: BattleResult[]): Statistics {
  const wins = results.filter((r) => r.winner === 'player').length;
  const losses = results.filter((r) => r.winner === 'opponent').length;
  const draws = results.filter((r) => r.winner === 'draw').length;
  const totalBattles = results.length;
  const winRate = totalBattles > 0 ? wins / totalBattles : 0;

  const cardUsage: Record<string, number> = {};
  for (const r of results) {
    for (const s of r.snapshots) {
      if (s.playerCard) {
        const name = s.playerCard.def.name;
        cardUsage[name] = (cardUsage[name] || 0) + 1;
      }
    }
  }

  const allDamages: number[] = [];
  for (const r of results) {
    let totalDmg = 0;
    for (const e of r.events) {
      if (e.type === 'attack' && e.side === 'player') {
        totalDmg += e.value || 0;
      }
    }
    allDamages.push(totalDmg);
  }

  const damageDistribution = [
    { range: '0-10', count: allDamages.filter((d) => d >= 0 && d <= 10).length },
    { range: '11-20', count: allDamages.filter((d) => d > 10 && d <= 20).length },
    { range: '21-30', count: allDamages.filter((d) => d > 20 && d <= 30).length },
    { range: '31-40', count: allDamages.filter((d) => d > 30 && d <= 40).length },
    { range: '41+', count: allDamages.filter((d) => d > 40).length },
  ];

  return { totalBattles, wins, losses, draws, winRate, cardUsage, damageDistribution };
}

export const useStore = create<AppState>((set, get) => ({
  playerDeck: [],
  opponentConfigs: [{ id: uuidv4(), strategy: 'random' }],
  battleResults: [],
  selectedBattleIndex: null,
  statistics: null,
  isBattling: false,
  currentReplayTurn: 0,

  setPlayerDeck: (deck) => set({ playerDeck: deck }),

  setOpponentConfigs: (configs) => set({ opponentConfigs: configs }),

  runBattle: () => {
    const { playerDeck, opponentConfigs } = get();
    if (playerDeck.length !== 6) return;

    set({ isBattling: true });

    const results: BattleResult[] = [];
    for (let i = 0; i < opponentConfigs.length; i++) {
      const cfg = opponentConfigs[i];
      const oppDeck = generateOpponentDeck(cfg.strategy);
      const result = runBattle(playerDeck, oppDeck, i, cfg.strategy);
      results.push(result);
    }

    const statistics = computeStatistics(results);
    set({
      battleResults: results,
      statistics,
      isBattling: false,
      selectedBattleIndex: results.length > 0 ? 0 : null,
      currentReplayTurn: 0,
    });
  },

  resetBattle: () =>
    set({
      battleResults: [],
      statistics: null,
      selectedBattleIndex: null,
      currentReplayTurn: 0,
      isBattling: false,
    }),

  selectBattle: (index) => set({ selectedBattleIndex: index, currentReplayTurn: 0 }),

  setCurrentReplayTurn: (turn) => set({ currentReplayTurn: turn }),
}));

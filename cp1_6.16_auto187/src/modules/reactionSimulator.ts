import * as THREE from 'three';

export interface ReactionDefinition {
  reagents: string[];
  products: string[];
  colorTo: string;
  colorTransitionDuration: number;
  temperatureDelta: number;
  phDelta: number;
  bubbles: boolean;
  precipitateColor: string | null;
}

export interface ReactionResult {
  beakerId: string;
  reagents: string[];
  products: string[];
  colorChange: { from: string; to: string; duration: number };
  temperatureChange: number;
  phChange: number;
  bubbleEffect: boolean;
  precipitate: { color: string; amount: number } | null;
  equation: string;
}

export interface BeakerReagentState {
  reagents: string[];
  temperature: number;
  ph: number;
  color: string;
  volume: number;
}

type ReactionCallback = (result: ReactionResult) => void;

const REACTIONS: ReactionDefinition[] = [
  {
    reagents: ['HCl', 'NaOH'],
    products: ['NaCl', 'H₂O'],
    colorTo: '#e0e0e0',
    colorTransitionDuration: 0.3,
    temperatureDelta: 15,
    phDelta: 7,
    bubbles: true,
    precipitateColor: null,
  },
  {
    reagents: ['FeCl₃', 'KSCN'],
    products: ['[Fe(SCN)]²⁺'],
    colorTo: '#8B0000',
    colorTransitionDuration: 0.5,
    temperatureDelta: 0,
    phDelta: -1,
    bubbles: false,
    precipitateColor: null,
  },
  {
    reagents: ['CuSO₄', 'NaOH'],
    products: ['Cu(OH)₂'],
    colorTo: '#1E90FF',
    colorTransitionDuration: 0.3,
    temperatureDelta: 5,
    phDelta: 3,
    bubbles: false,
    precipitateColor: '#4169E1',
  },
  {
    reagents: ['Na₂CO₃', 'HCl'],
    products: ['NaCl', 'H₂O', 'CO₂'],
    colorTo: '#f0f0f0',
    colorTransitionDuration: 0.3,
    temperatureDelta: 5,
    phDelta: -4,
    bubbles: true,
    precipitateColor: null,
  },
  {
    reagents: ['AgNO₃', 'NaCl'],
    products: ['AgCl'],
    colorTo: '#f5f5f5',
    colorTransitionDuration: 0.3,
    temperatureDelta: 2,
    phDelta: 0,
    bubbles: false,
    precipitateColor: '#FFFFFF',
  },
];

export const REAGENT_COLORS: Record<string, string> = {
  'HCl': '#b8d4e3',
  'NaOH': '#e8e8d0',
  'FeCl₃': '#c8a040',
  'KSCN': '#d0d0e0',
  'CuSO₄': '#1E90FF',
  'Na₂CO₃': '#f0f0f0',
  'AgNO₃': '#e0e0e0',
  'NaCl': '#f5f5f5',
};

export class ReactionSimulator {
  private beakerStates: Map<string, BeakerReagentState> = new Map();
  private reactionCallbacks: ReactionCallback[] = [];
  private heatLevels: Map<string, number> = new Map();
  private reactionSpeedMultiplier: number = 1.0;

  addReagent(beakerId: string, reagent: string, amount: number): ReactionResult | null {
    let state = this.beakerStates.get(beakerId);
    if (!state) {
      state = {
        reagents: [],
        temperature: 25,
        ph: 7,
        color: '#aaddff',
        volume: 0,
      };
      this.beakerStates.set(beakerId, state);
    }

    const prevColor = state.color;
    state.reagents.push(reagent);
    state.volume += amount;

    if (!REAGENT_COLORS[reagent]) {
      REAGENT_COLORS[reagent] = '#c0c0c0';
    }

    if (state.reagents.length === 1) {
      state.color = REAGENT_COLORS[reagent] || '#c0c0c0';
      return null;
    }

    const reaction = this.findReaction(state.reagents);
    if (!reaction) {
      state.color = this.blendColors(state.reagents);
      return null;
    }

    const heatMultiplier = 1 + (this.heatLevels.get(beakerId) || 0) * 0.2 * this.reactionSpeedMultiplier;
    const adjustedTempDelta = reaction.temperatureDelta * heatMultiplier;
    const adjustedDuration = reaction.colorTransitionDuration / heatMultiplier;

    state.temperature += adjustedTempDelta;
    state.ph = Math.max(0, Math.min(14, state.ph + reaction.phDelta));
    state.color = reaction.colorTo;

    const reagentSet = [...new Set(state.reagents)];
    const equation = this.formatEquation(reaction);

    const result: ReactionResult = {
      beakerId,
      reagents: reagentSet,
      products: reaction.products,
      colorChange: {
        from: prevColor,
        to: reaction.colorTo,
        duration: adjustedDuration,
      },
      temperatureChange: adjustedTempDelta,
      phChange: reaction.phDelta,
      bubbleEffect: reaction.bubbles,
      precipitate: reaction.precipitateColor
        ? { color: reaction.precipitateColor, amount: amount * 0.5 }
        : null,
      equation,
    };

    this.reactionCallbacks.forEach(cb => cb(result));
    return result;
  }

  setHeatLevel(beakerId: string, level: number): void {
    this.heatLevels.set(beakerId, Math.max(0, Math.min(5, level)));
  }

  setReactionSpeed(multiplier: number): void {
    this.reactionSpeedMultiplier = Math.max(0.1, Math.min(5, multiplier));
  }

  getReactionSpeed(): number {
    return this.reactionSpeedMultiplier;
  }

  onReaction(callback: ReactionCallback): void {
    this.reactionCallbacks.push(callback);
  }

  getBeakerState(beakerId: string): BeakerReagentState | undefined {
    return this.beakerStates.get(beakerId);
  }

  resetBeaker(beakerId: string): void {
    this.beakerStates.delete(beakerId);
    this.heatLevels.delete(beakerId);
  }

  private findReaction(reagents: string[]): ReactionDefinition | null {
    const reagentSet = new Set(reagents);

    for (const reaction of REACTIONS) {
      const reactionSet = new Set(reaction.reagents);
      if (reactionSet.size === reagentSet.size) {
        let match = true;
        for (const r of reactionSet) {
          if (!reagentSet.has(r)) {
            match = false;
            break;
          }
        }
        if (match) return reaction;
      }
    }

    for (const reaction of REACTIONS) {
      const hasAll = reaction.reagents.every(r => reagentSet.has(r));
      if (hasAll && reagentSet.size >= reaction.reagents.length) {
        return reaction;
      }
    }

    return null;
  }

  private blendColors(reagents: string[]): string {
    const colors = reagents.map(r => {
      const hex = REAGENT_COLORS[r] || '#c0c0c0';
      return new THREE.Color(hex);
    });

    const blended = new THREE.Color(0, 0, 0);
    colors.forEach(c => blended.add(c));
    blended.multiplyScalar(1 / colors.length);

    return '#' + blended.getHexString();
  }

  private formatEquation(reaction: ReactionDefinition): string {
    return `${reaction.reagents.join(' + ')} → ${reaction.products.join(' + ')}`;
  }
}

export const ALL_REAGENTS = ['HCl', 'NaOH', 'FeCl₃', 'KSCN', 'CuSO₄', 'Na₂CO₃', 'AgNO₃', 'NaCl'];

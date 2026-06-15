import type { EnergyData, EnergyType } from '../types';

export class MaterialMixer {
  private static determineEnergyType(fireRatio: number, waterRatio: number, total: number): EnergyType {
    if (total < 30) {
      return 'shockwave';
    }
    
    if (fireRatio > 70) {
      return 'explosion';
    }
    
    if (waterRatio > 70) {
      return 'jet';
    }
    
    return 'pillar';
  }

  private static calculateIntensity(fireRatio: number, waterRatio: number, total: number): number {
    const balanceFactor = 1 - Math.abs(fireRatio - waterRatio) / 100;
    const totalFactor = Math.pow(total / 100, 1.5);
    const baseIntensity = (balanceFactor * 0.6 + 0.4) * totalFactor;
    return Math.min(1, Math.max(0, baseIntensity));
  }

  private static calculateRadius(energyType: EnergyType, intensity: number): number {
    const baseRadius: Record<EnergyType, number> = {
      explosion: 0.9,
      jet: 0.5,
      pillar: 0.3,
      shockwave: 0.7
    };
    return Math.min(1, baseRadius[energyType] * Math.pow(intensity, 0.8));
  }

  private static calculateDuration(energyType: EnergyType, intensity: number): number {
    const baseDuration: Record<EnergyType, number> = {
      explosion: 0.6,
      jet: 0.9,
      pillar: 1.0,
      shockwave: 0.5
    };
    return Math.min(1, baseDuration[energyType] * (0.5 + intensity * 0.5));
  }

  private static calculateParticleCount(intensity: number): number {
    return Math.floor(150 + intensity * 350);
  }

  public static calculateEnergy(fireAmount: number, waterAmount: number): EnergyData {
    const total = fireAmount + waterAmount;
    const fireRatio = total > 0 ? (fireAmount / total) * 100 : 50;
    const waterRatio = total > 0 ? (waterAmount / total) * 100 : 50;

    const type = this.determineEnergyType(fireRatio, waterRatio, total);
    const intensity = this.calculateIntensity(fireRatio, waterRatio, total);
    const radius = this.calculateRadius(type, intensity);
    const duration = this.calculateDuration(type, intensity);
    const particleCount = this.calculateParticleCount(intensity);

    return {
      type,
      intensity,
      radius,
      duration,
      particleCount,
      fireRatio,
      waterRatio
    };
  }

  public static calculateTotalScore(energyData: EnergyData): number {
    const { intensity, radius, duration } = energyData;
    const weightedScore = intensity * 0.4 + radius * 0.3 + duration * 0.3;
    return Math.round(weightedScore * 100);
  }

  public static getChartValueAtFrame(
    energyData: EnergyData,
    frame: number,
    maxFrames: number = 200
  ): { intensity: number; radius: number; duration: number } {
    const progress = frame / maxFrames;
    const peakPosition = 0.3 + (energyData.intensity * 0.2);
    const width = 0.2 + (energyData.duration * 0.3);

    const gaussian = (x: number, peak: number, w: number): number => {
      return Math.exp(-Math.pow((x - peak) / w, 2) * 2);
    };

    const intensityValue = gaussian(progress, peakPosition, width) * energyData.intensity;
    const radiusValue = gaussian(progress, peakPosition + 0.05, width * 1.2) * energyData.radius;
    const durationValue = gaussian(progress, peakPosition - 0.05, width * 0.9) * energyData.duration;

    return {
      intensity: Math.min(1, Math.max(0, intensityValue)),
      radius: Math.min(1, Math.max(0, radiusValue)),
      duration: Math.min(1, Math.max(0, durationValue))
    };
  }
}

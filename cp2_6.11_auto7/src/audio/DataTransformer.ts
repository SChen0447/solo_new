export type VisualizerMode = 'bars' | 'particles';

export interface BarData {
  index: number;
  value: number;
  normalized: number;
  freqBand: 'low' | 'mid' | 'high';
}

export interface ParticleData {
  id: number;
  angle: number;
  radius: number;
  baseRadius: number;
  speed: number;
  size: number;
  color: string;
  energy: number;
}

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

const LOW_FREQ_RATIO = 0.15;
const MID_FREQ_RATIO = 0.5;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function logScale(value: number, max: number): number {
  if (value <= 0) return 0;
  const minLog = Math.log(1);
  const maxLog = Math.log(max + 1);
  return (Math.log(value + 1) - minLog) / (maxLog - minLog);
}

function applySmoothing(current: number[], previous: number[], smoothing: number): number[] {
  if (previous.length === 0) return [...current];
  const len = Math.min(current.length, previous.length);
  const result = new Array(current.length);
  for (let i = 0; i < current.length; i++) {
    result[i] = i < len ? lerp(previous[i], current[i], 1 - smoothing) : current[i];
  }
  return result;
}

export class DataTransformer {
  private previousBars: number[] = [];
  private previousParticles: number[] = [];
  private barSmoothing: number = 0.65;
  private particleSmoothing: number = 0.3;
  private currentMode: VisualizerMode = 'bars';

  setMode(mode: VisualizerMode): void {
    this.currentMode = mode;
  }

  getMode(): VisualizerMode {
    return this.currentMode;
  }

  toggleMode(): VisualizerMode {
    this.currentMode = this.currentMode === 'bars' ? 'particles' : 'bars';
    return this.currentMode;
  }

  transformToBars(rawData: Uint8Array, barCount: number = 64): BarData[] {
    const barData: number[] = new Array(barCount);
    const usableLen = Math.floor(rawData.length * 0.75);
    const samplesPerBar = usableLen / barCount;

    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * samplesPerBar);
      const end = Math.floor((i + 1) * samplesPerBar);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end && j < rawData.length; j++) {
        sum += rawData[j];
        count++;
      }
      const avg = count > 0 ? sum / count : 0;
      const scaled = clamp(logScale(avg, 255) * 1.3, 0, 1);
      barData[i] = scaled;
    }

    const smoothed = applySmoothing(barData, this.previousBars, this.barSmoothing);
    this.previousBars = smoothed;

    const result: BarData[] = new Array(barCount);
    for (let i = 0; i < barCount; i++) {
      const ratio = i / barCount;
      let freqBand: 'low' | 'mid' | 'high';
      if (ratio < LOW_FREQ_RATIO) freqBand = 'low';
      else if (ratio < MID_FREQ_RATIO) freqBand = 'mid';
      else freqBand = 'high';

      result[i] = {
        index: i,
        value: smoothed[i] * 255,
        normalized: smoothed[i],
        freqBand
      };
    }
    return result;
  }

  transformToParticles(rawData: Uint8Array, particleCount: number = 500): { particles: ParticleData[]; energy: ColorRGB } {
    const usableLen = rawData.length;
    const lowEnd = Math.floor(usableLen * LOW_FREQ_RATIO);
    const midEnd = Math.floor(usableLen * MID_FREQ_RATIO);

    let lowSum = 0, lowCount = 0;
    let midSum = 0, midCount = 0;
    let highSum = 0, highCount = 0;

    for (let i = 0; i < lowEnd; i++) {
      lowSum += rawData[i]; lowCount++;
    }
    for (let i = lowEnd; i < midEnd; i++) {
      midSum += rawData[i]; midCount++;
    }
    for (let i = midEnd; i < usableLen; i++) {
      highSum += rawData[i]; highCount++;
    }

    const lowEnergy = clamp(logScale(lowCount > 0 ? lowSum / lowCount : 0, 255), 0, 1);
    const midEnergy = clamp(logScale(midCount > 0 ? midSum / midCount : 0, 255), 0, 1);
    const highEnergy = clamp(logScale(highCount > 0 ? highSum / highCount : 0, 255), 0, 1);

    const energy: ColorRGB = {
      r: Math.round(lowEnergy * 255),
      g: Math.round(midEnergy * 255),
      b: Math.round(highEnergy * 255)
    };

    const sampleArray: number[] = new Array(particleCount);
    const samplesPerParticle = (usableLen * 0.6) / particleCount;
    for (let i = 0; i < particleCount; i++) {
      const idx = Math.floor((i / particleCount) * usableLen * 0.6);
      const start = idx;
      const end = Math.floor(idx + samplesPerParticle);
      let s = 0, c = 0;
      for (let j = start; j < end && j < usableLen; j++) {
        s += rawData[j]; c++;
      }
      const avg = c > 0 ? s / c : 0;
      sampleArray[i] = clamp(logScale(avg, 255), 0, 1);
    }

    const smoothedSamples = applySmoothing(sampleArray, this.previousParticles, this.particleSmoothing);
    this.previousParticles = smoothedSamples;

    const particles: ParticleData[] = new Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const band = Math.floor(i / (particleCount / 3));
      let col: ColorRGB;
      if (band === 0) col = { r: 255, g: 60, b: 60 };
      else if (band === 1) col = { r: 60, g: 255, b: 120 };
      else col = { r: 60, g: 150, b: 255 };

      const mixed = this.mixEnergy(col, energy, smoothedSamples[i]);

      particles[i] = {
        id: i,
        angle: (i / particleCount) * Math.PI * 2 + (i % 17) * 0.01,
        radius: 0,
        baseRadius: 50 + (i % 80) + (i / particleCount) * 100,
        speed: 0.0008 + (i % 11) * 0.0003,
        size: 1.2 + (i % 5) * 0.6 + smoothedSamples[i] * 3.5,
        color: `rgba(${mixed.r},${mixed.g},${mixed.b},${0.6 + smoothedSamples[i] * 0.4})`,
        energy: smoothedSamples[i]
      };
    }

    return { particles, energy };
  }

  private mixEnergy(base: ColorRGB, energy: ColorRGB, amount: number): ColorRGB {
    const eRatio = 0.5 + amount * 0.5;
    const bRatio = 1 - eRatio;
    return {
      r: clamp(Math.round(base.r * bRatio + energy.r * eRatio), 0, 255),
      g: clamp(Math.round(base.g * bRatio + energy.g * eRatio), 0, 255),
      b: clamp(Math.round(base.b * bRatio + energy.b * eRatio), 0, 255)
    };
  }

  getBarGradientColors(normalized: number): string {
    const hue1 = 280;
    const hue2 = 180;
    const h = lerp(hue1, hue2, normalized);
    const s = 95;
    const l = lerp(45, 65, normalized);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  getBarBackgroundColor(normalized: number): string {
    const hue1 = 280;
    const hue2 = 180;
    const h = lerp(hue1, hue2, normalized);
    return `hsla(${h}, 95%, 45%, 0.12)`;
  }
}

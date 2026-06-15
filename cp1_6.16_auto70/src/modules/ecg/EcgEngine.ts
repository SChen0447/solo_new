import { EventBus, RhythmType, EcgDataEvent } from '../core/EventBus';

const LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

const LEAD_ANGLES = [
  0, Math.PI / 6, Math.PI / 3, -Math.PI / 2, -Math.PI / 3, Math.PI / 2,
  -Math.PI / 6, 0, Math.PI / 12, Math.PI / 6, Math.PI / 4, Math.PI / 3,
];

const SAMPLE_RATE = 60;
const SAMPLE_INTERVAL = 1000 / SAMPLE_RATE;

interface PqrstWave {
  pAmp: number;
  pDur: number;
  qAmp: number;
  qDur: number;
  rAmp: number;
  rDur: number;
  sAmp: number;
  sDur: number;
  stElev: number;
  tAmp: number;
  tDur: number;
  prInterval: number;
}

function normalWave(): PqrstWave {
  return {
    pAmp: 0.15, pDur: 0.08,
    qAmp: -0.05, qDur: 0.03,
    rAmp: 1.0, rDur: 0.06,
    sAmp: -0.15, sDur: 0.04,
    stElev: 0, tAmp: 0.25, tDur: 0.12,
    prInterval: 0.16,
  };
}

function gaussian(x: number, amp: number, center: number, sigma: number): number {
  return amp * Math.exp(-((x - center) ** 2) / (2 * sigma ** 2));
}

function generateBeat(phase: number, wave: PqrstWave, leadAngle: number): number {
  const cosA = Math.cos(leadAngle);
  const sinA = Math.sin(leadAngle);

  const pVal = gaussian(phase, wave.pAmp * cosA, wave.prInterval - wave.pDur / 2, wave.pDur / 2.5);
  const qCenter = wave.prInterval + 0.01;
  const qVal = gaussian(phase, wave.qAmp * cosA, qCenter, wave.qDur / 2.5);
  const rCenter = qCenter + wave.qDur / 2 + wave.rDur / 2;
  const rVal = gaussian(phase, wave.rAmp * cosA, rCenter, wave.rDur / 2.5);
  const sCenter = rCenter + wave.rDur / 2 + wave.sDur / 2;
  const sVal = gaussian(phase, wave.sAmp * cosA, sCenter, wave.sDur / 2.5);
  const tCenter = sCenter + 0.08 + wave.tDur / 2;
  const tVal = gaussian(phase, wave.tAmp * cosA, tCenter, wave.tDur / 2.5);

  const stVal = wave.stElev * cosA *
    (phase > sCenter && phase < sCenter + 0.08 ? Math.exp(-((phase - sCenter - 0.02) ** 2) / 0.002) : 0);

  return pVal + qVal + rVal + sVal + tVal + stVal + sinA * 0.02 * Math.sin(phase * 8);
}

export class EcgEngine {
  private eventBus: EventBus;
  private rhythmType: RhythmType = 'normal';
  private sampleTimer: number | null = null;
  private beatPhase = 0;
  private beatCount = 0;
  private rrInterval = 1.0;
  private irregularRr: number[] = [];
  private pvcPending = false;
  private pvcCounter = 0;
  private fadeInProgress = 0;
  private fadeInTarget = 1;
  private previousRhythm: RhythmType = 'normal';

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.eventBus.on('ecg:rhythm-change', (data) => {
      this.switchRhythm(data.rhythmType);
    });
  }

  start(): void {
    this.sampleTimer = window.setInterval(() => this.tick(), SAMPLE_INTERVAL);
  }

  stop(): void {
    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
  }

  private switchRhythm(type: RhythmType): void {
    this.previousRhythm = this.rhythmType;
    this.rhythmType = type;
    this.fadeInProgress = 0;
    this.fadeInTarget = 1;
    this.beatCount = 0;
    this.pvcCounter = 0;
    this.pvcPending = false;

    switch (type) {
      case 'normal':
        this.rrInterval = 1.0;
        break;
      case 'afib':
        this.irregularRr = [];
        this.rrInterval = 0.75;
        break;
      case 'pvc':
        this.rrInterval = 1.0;
        break;
      case 'tachycardia':
        this.rrInterval = 0.5;
        break;
      case 'bradycardia':
        this.rrInterval = 1.5;
        break;
      case 'av_block':
        this.rrInterval = 1.0;
        break;
    }
  }

  private tick(): void {
    const dt = SAMPLE_INTERVAL / 1000;
    this.beatPhase += dt;

    if (this.fadeInProgress < this.fadeInTarget) {
      this.fadeInProgress = Math.min(this.fadeInTarget, this.fadeInProgress + dt / 0.5);
    }

    let currentRr = this.rrInterval;

    if (this.rhythmType === 'afib') {
      currentRr = 0.5 + Math.random() * 0.8;
    }

    if (this.rhythmType === 'pvc') {
      this.pvcCounter++;
      if (this.pvcCounter >= 5 && !this.pvcPending) {
        this.pvcPending = true;
        this.pvcCounter = 0;
      }
    }

    if (this.beatPhase >= currentRr) {
      this.beatPhase -= currentRr;
      this.beatCount++;
      if (this.rhythmType === 'afib') {
        this.rrInterval = 0.5 + Math.random() * 0.8;
      }
    }

    const leads: number[][] = [];
    for (let i = 0; i < 12; i++) {
      const val = this.generateLeadValue(i, this.beatPhase / currentRr);
      leads.push([val * this.fadeInProgress]);
    }

    const event: EcgDataEvent = {
      leads,
      timestamp: performance.now(),
    };
    this.eventBus.emit('ecg:data', event);
  }

  private generateLeadValue(leadIndex: number, normalizedPhase: number): number {
    const angle = LEAD_ANGLES[leadIndex];
    let wave: PqrstWave;

    const isPvcBeat = this.rhythmType === 'pvc' && this.pvcPending;

    switch (this.rhythmType) {
      case 'afib':
        wave = {
          ...normalWave(),
          pAmp: 0,
          pDur: 0,
          prInterval: 0.06 + Math.random() * 0.04,
        };
        wave.pAmp = (Math.random() - 0.5) * 0.03;
        break;

      case 'pvc':
        if (isPvcBeat) {
          wave = {
            pAmp: 0, pDur: 0,
            qAmp: -0.1, qDur: 0.04,
            rAmp: 1.6, rDur: 0.12,
            sAmp: -0.5, sDur: 0.08,
            stElev: -0.1, tAmp: -0.3, tDur: 0.2,
            prInterval: 0.08,
          };
        } else {
          wave = normalWave();
        }
        break;

      case 'tachycardia':
        wave = normalWave();
        wave.rAmp = 0.9;
        wave.tAmp = 0.2;
        break;

      case 'bradycardia':
        wave = normalWave();
        wave.rAmp = 1.05;
        wave.tAmp = 0.3;
        wave.prInterval = 0.18;
        break;

      case 'av_block': {
        wave = { ...normalWave() };
        wave.prInterval = 0.28 + (this.beatCount % 3) * 0.06;
        if (this.beatCount % 4 === 3) {
          wave.rAmp = 0;
          wave.qAmp = 0;
          wave.sAmp = 0;
          wave.tAmp = 0;
        }
        break;
      }

      default:
        wave = normalWave();
    }

    const phaseTime = normalizedPhase * this.rrInterval;
    return generateBeat(phaseTime, wave, angle);
  }

  getLeadNames(): string[] {
    return LEAD_NAMES;
  }
}

import type { TrafficPacket, Protocol } from '@store/useTrafficStore';

const COMMON_PORTS = [80, 443, 22, 53, 3306, 6379, 8080, 8443, 21, 25, 110, 143];
const PROTOCOLS: Protocol[] = ['TCP', 'TCP', 'TCP', 'TCP', 'UDP', 'UDP', 'ICMP'];

const IP_SEGMENTS = [
  '192.168.1',
  '192.168.2',
  '10.0.0',
  '10.0.1',
  '172.16.0',
  '172.16.1',
  '192.168.10',
  '192.168.20',
  '10.10.0',
  '10.10.1',
  '172.20.0',
  '172.20.1',
  '192.168.100',
  '192.168.200',
  '10.100.0',
  '10.100.1',
];

const HIGH_TRAFFIC_SEGMENTS = [0, 2, 6, 10];

type Callback = (packets: TrafficPacket[]) => void;

export class TrafficSimulator {
  private timer: number | null = null;
  private callback: Callback;
  private burstActive = false;
  private burstSegment = -1;
  private burstEndTime = 0;

  constructor(callback: Callback) {
    this.callback = callback;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private generateIP(biasIndex?: number): string {
    let segmentIdx: number;
    if (biasIndex !== undefined && Math.random() < 0.7) {
      segmentIdx = biasIndex % IP_SEGMENTS.length;
    } else if (Math.random() < 0.6) {
      segmentIdx = this.randomChoice(HIGH_TRAFFIC_SEGMENTS);
    } else {
      segmentIdx = this.randomInt(0, IP_SEGMENTS.length - 1);
    }
    const segment = IP_SEGMENTS[segmentIdx];
    const lastOctet = this.randomInt(1, 254);
    return `${segment}.${lastOctet}`;
  }

  private generatePacket(timestamp: number): TrafficPacket {
    const protocol = this.randomChoice(PROTOCOLS);
    const port = protocol === 'ICMP' ? 0 : this.randomChoice(COMMON_PORTS);
    const srcSegment = this.burstActive && Math.random() < 0.4 ? this.burstSegment : undefined;
    const srcIP = this.generateIP(srcSegment);
    const dstIP = this.generateIP();
    let packetSize: number;
    if (protocol === 'TCP') {
      packetSize = this.randomInt(500, 1500);
    } else if (protocol === 'UDP') {
      packetSize = this.randomInt(64, 512);
    } else {
      packetSize = this.randomInt(32, 128);
    }

    return {
      id: Math.random().toString(36).substr(2, 12) + timestamp.toString(36),
      srcIP,
      dstIP,
      port,
      protocol,
      packetSize,
      timestamp,
    };
  }

  private checkBurst() {
    const now = Date.now();
    if (!this.burstActive && Math.random() < 0.008) {
      this.burstActive = true;
      this.burstSegment = this.randomInt(0, IP_SEGMENTS.length - 1);
      this.burstEndTime = now + this.randomInt(3000, 8000);
    }
    if (this.burstActive && now > this.burstEndTime) {
      this.burstActive = false;
      this.burstSegment = -1;
    }
  }

  public start(intervalMs: number = 100) {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      this.checkBurst();
      let count = this.randomInt(3, 8);
      if (this.burstActive) {
        count = this.randomInt(12, 25);
      }
      const now = Date.now();
      const packets: TrafficPacket[] = [];
      for (let i = 0; i < count; i++) {
        packets.push(this.generatePacket(now - this.randomInt(0, intervalMs)));
      }
      this.callback(packets);
    }, intervalMs);
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isRunning(): boolean {
    return this.timer !== null;
  }

  public static getSegmentIndex(ip: string): number {
    const parts = ip.split('.');
    if (parts.length < 4) return 0;
    const segment = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const idx = IP_SEGMENTS.indexOf(segment);
    return idx >= 0 ? idx : parseInt(parts[2], 10) % IP_SEGMENTS.length;
  }

  public static get IPSegments(): string[] {
    return IP_SEGMENTS.map((s) => `${s}.0/24`);
  }

  public static getSegmentByIndex(idx: number): string {
    const clamped = Math.max(0, Math.min(idx, IP_SEGMENTS.length - 1));
    return `${IP_SEGMENTS[clamped]}.0/24`;
  }
}

export { IP_SEGMENTS };

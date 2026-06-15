export interface HourlyData {
  hour: number;
  flow: number;
  avgSpeed: number;
  carRatio: number;
  truckRatio: number;
  busRatio: number;
}

export interface IntersectionData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  hourlyData: HourlyData[];
}

export interface ConnectionData {
  from: string;
  to: string;
  hourlyFlow: number[];
}

export interface TrafficData {
  intersections: IntersectionData[];
  connections: ConnectionData[];
}

export interface ParsedTrafficData {
  intersections: Map<string, IntersectionData>;
  connections: ConnectionData[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  maxFlow: number;
}

export class DataParser {
  parse(data: TrafficData): ParsedTrafficData {
    const intersections = new Map<string, IntersectionData>();
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    let maxFlow = 0;

    for (const intersection of data.intersections) {
      intersections.set(intersection.id, intersection);
      minLat = Math.min(minLat, intersection.latitude);
      maxLat = Math.max(maxLat, intersection.latitude);
      minLng = Math.min(minLng, intersection.longitude);
      maxLng = Math.max(maxLng, intersection.longitude);

      for (const hourData of intersection.hourlyData) {
        maxFlow = Math.max(maxFlow, hourData.flow);
      }
    }

    for (const conn of data.connections) {
      for (const flow of conn.hourlyFlow) {
        maxFlow = Math.max(maxFlow, flow);
      }
    }

    return {
      intersections,
      connections: data.connections,
      bounds: { minLat, maxLat, minLng, maxLng },
      maxFlow
    };
  }

  async loadWithProgress(
    data: TrafficData,
    onProgress: (percent: number) => void
  ): Promise<ParsedTrafficData> {
    const totalSteps = 5;

    await this.delay(100);
    onProgress(10);

    await this.delay(100);
    onProgress(30);

    const result = this.parse(data);

    await this.delay(100);
    onProgress(60);

    await this.delay(100);
    onProgress(85);

    await this.delay(150);
    onProgress(100);

    void totalSteps;
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getIntersectionAtHour(
    data: IntersectionData,
    hour: number
  ): HourlyData | undefined {
    return data.hourlyData.find(h => h.hour === hour);
  }

  getConnectionFlow(
    connection: ConnectionData,
    hour: number
  ): number {
    if (hour >= 0 && hour < connection.hourlyFlow.length) {
      return connection.hourlyFlow[hour];
    }
    return 0;
  }

  getSpeedColor(speed: number): string {
    if (speed > 40) return '#00e676';
    if (speed > 20) return '#ffeb3b';
    return '#ff1744';
  }

  getCylinderHeight(flow: number, maxFlow: number): number {
    const ratio = Math.min(flow / maxFlow, 1);
    const height = Math.round(ratio * 20) * 0.5;
    return Math.max(0.5, Math.min(height, 10));
  }
}

import { eventBus } from './utils/eventBus';

export interface GridSize {
  x: number;
  y: number;
  z: number;
}

export interface Bounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface FieldDataSet {
  name: string;
  frequency: number;
  scalarData: Float32Array;
  vectorData: Float32Array;
}

export interface ElectromagneticData {
  scalarData: Float32Array;
  vectorData: Float32Array;
  gridSize: GridSize;
  bounds: Bounds;
  dataSetName: string;
  frequency: number;
}

class DataLoader {
  private gridSize: GridSize = { x: 10, y: 10, z: 10 };
  private bounds: Bounds = {
    min: { x: -5, y: -5, z: -5 },
    max: { x: 5, y: 5, z: 5 }
  };
  private dataSets: FieldDataSet[] = [];
  private currentDataSetIndex: number = 0;

  constructor() {
    this.generateDataSets();
    eventBus.on('DataSetChanged', (data) => this.handleDataSetChange(data.dataSetIndex));
  }

  private generateDataSets(): void {
    const frequencies = [1.0, 2.5, 4.0];
    const names = ['低频电场 (1.0 Hz)', '中频电场 (2.5 Hz)', '高频电场 (4.0 Hz)'];

    frequencies.forEach((freq, index) => {
      const dataSet = this.generateElectricFieldData(freq, names[index]!);
      this.dataSets.push(dataSet);
    });
  }

  private generateElectricFieldData(frequency: number, name: string): FieldDataSet {
    const { x: nx, y: ny, z: nz } = this.gridSize;
    const totalPoints = nx * ny * nz;
    const scalarData = new Float32Array(totalPoints);
    const vectorData = new Float32Array(totalPoints * 3);

    const { min, max } = this.bounds;
    const dx = (max.x - min.x) / (nx - 1);
    const dy = (max.y - min.y) / (ny - 1);
    const dz = (max.z - min.z) / (nz - 1);

    let maxScalar = -Infinity;
    let minScalar = Infinity;

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const idx = (i * ny + j) * nz + k;
          
          const x = min.x + i * dx;
          const y = min.y + j * dy;
          const z = min.z + k * dz;

          const r = Math.sqrt(x * x + y * y + z * z);
          const theta = Math.atan2(Math.sqrt(x * x + y * y), z);
          const phi = Math.atan2(y, x);

          const dipoleStrength = 1.0;
          const k = frequency * 0.5;
          
          const factor = dipoleStrength / (4 * Math.PI);
          const phase = k * r;
          
          const e_r = 2 * factor * Math.cos(theta) / (r * r) * Math.cos(phase);
          const e_theta = factor * Math.sin(theta) / (r * r) * Math.cos(phase);
          const e_phi = 0;

          const e_x = e_r * Math.sin(theta) * Math.cos(phi) + e_theta * Math.cos(theta) * Math.cos(phi) - e_phi * Math.sin(phi);
          const e_y = e_r * Math.sin(theta) * Math.sin(phi) + e_theta * Math.cos(theta) * Math.sin(phi) + e_phi * Math.cos(phi);
          const e_z = e_r * Math.cos(theta) - e_theta * Math.sin(theta);

          const magnitude = Math.sqrt(e_x * e_x + e_y * e_y + e_z * e_z);
          
          scalarData[idx] = magnitude;
          vectorData[idx * 3] = e_x;
          vectorData[idx * 3 + 1] = e_y;
          vectorData[idx * 3 + 2] = e_z;

          if (magnitude > maxScalar) maxScalar = magnitude;
          if (magnitude < minScalar) minScalar = magnitude;
        }
      }
    }

    for (let i = 0; i < totalPoints; i++) {
      scalarData[i] = (scalarData[i] - minScalar) / (maxScalar - minScalar || 1);
      const vx = vectorData[i * 3];
      const vy = vectorData[i * 3 + 1];
      const vz = vectorData[i * 3 + 2];
      const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (mag > 0) {
        vectorData[i * 3] = vx / mag * scalarData[i];
        vectorData[i * 3 + 1] = vy / mag * scalarData[i];
        vectorData[i * 3 + 2] = vz / mag * scalarData[i];
      }
    }

    return {
      name,
      frequency,
      scalarData,
      vectorData
    };
  }

  public loadDataSet(index: number = 0): void {
    if (index < 0 || index >= this.dataSets.length) {
      console.error(`[DataLoader] Invalid data set index: ${index}`);
      return;
    }

    this.currentDataSetIndex = index;
    const dataSet = this.dataSets[index]!;
    
    console.debug(`[DataLoader] Loading data set: ${dataSet.name}`);
    
    const data: ElectromagneticData = {
      scalarData: new Float32Array(dataSet.scalarData),
      vectorData: new Float32Array(dataSet.vectorData),
      gridSize: { ...this.gridSize },
      bounds: {
        min: { ...this.bounds.min },
        max: { ...this.bounds.max }
      },
      dataSetName: dataSet.name,
      frequency: dataSet.frequency
    };

    eventBus.emit('DataLoaded', data);
  }

  private handleDataSetChange(index: number): void {
    this.loadDataSet(index);
  }

  public getAvailableDataSets(): string[] {
    return this.dataSets.map(ds => ds.name);
  }

  public getCurrentDataSetIndex(): number {
    return this.currentDataSetIndex;
  }

  public getGridSize(): GridSize {
    return { ...this.gridSize };
  }

  public getBounds(): Bounds {
    return {
      min: { ...this.bounds.min },
      max: { ...this.bounds.max }
    };
  }

  public loadFromJSON(jsonData: any): void {
    try {
      const { scalarData, vectorData, gridSize, bounds, dataSetName, frequency } = jsonData;
      
      const data: ElectromagneticData = {
        scalarData: new Float32Array(scalarData),
        vectorData: new Float32Array(vectorData),
        gridSize,
        bounds,
        dataSetName,
        frequency
      };

      this.gridSize = gridSize;
      this.bounds = bounds;
      
      eventBus.emit('DataLoaded', data);
      console.debug(`[DataLoader] Loaded external data: ${dataSetName}`);
    } catch (error) {
      console.error('[DataLoader] Failed to load JSON data:', error);
    }
  }
}

export const dataLoader = new DataLoader();
export default dataLoader;

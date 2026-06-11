import { generateWeatherData, getCities, getMonthCount, WeatherDataPoint } from './dataGenerator';

export type DataMode = 'temperature' | 'humidity' | 'precipitation';

export interface DataRange {
  min: number;
  max: number;
}

export interface BubbleData {
  city: string;
  month: number;
  temperature: number;
  humidity: number;
  precipitation: number;
  x: number;
  y: number;
  z: number;
  size: number;
  colorValue: number;
}

class DataManager {
  private rawData: WeatherDataPoint[] = [];
  private cities: string[] = [];
  private monthCount: number = 0;
  private selectedCity: string = 'all';
  private dataMode: DataMode = 'temperature';
  private ranges: Record<DataMode, DataRange> = {
    temperature: { min: -10, max: 40 },
    humidity: { min: 20, max: 100 },
    precipitation: { min: 0, max: 300 }
  };

  private spaceRanges = {
    x: { min: -5, max: 5 },
    y: { min: -4, max: 4 },
    z: { min: -5, max: 5 }
  };

  init(): void {
    this.rawData = generateWeatherData();
    this.cities = getCities();
    this.monthCount = getMonthCount();
    this.calculateRanges();
  }

  private calculateRanges(): void {
    const temps = this.rawData.map(d => d.temperature);
    const hums = this.rawData.map(d => d.humidity);
    const precs = this.rawData.map(d => d.precipitation);

    this.ranges.temperature = { min: Math.min(...temps), max: Math.max(...temps) };
    this.ranges.humidity = { min: Math.min(...hums), max: Math.max(...hums) };
    this.ranges.precipitation = { min: Math.min(...precs), max: Math.max(...precs) };
  }

  getRawData(): WeatherDataPoint[] {
    return this.rawData;
  }

  getCities(): string[] {
    return this.cities;
  }

  getMonthCount(): number {
    return this.monthCount;
  }

  setSelectedCity(city: string): void {
    this.selectedCity = city;
  }

  getSelectedCity(): string {
    return this.selectedCity;
  }

  setDataMode(mode: DataMode): void {
    this.dataMode = mode;
  }

  getDataMode(): DataMode {
    return this.dataMode;
  }

  getRange(mode: DataMode): DataRange {
    return { ...this.ranges[mode] };
  }

  getSpaceRange(): { x: DataRange; y: DataRange; z: DataRange } {
    return JSON.parse(JSON.stringify(this.spaceRanges));
  }

  getDataByMonth(monthIndex: number): WeatherDataPoint[] {
    return this.rawData.filter(d => d.month === monthIndex + 1);
  }

  getDataByCity(city: string): WeatherDataPoint[] {
    return this.rawData.filter(d => d.city === city);
  }

  getBubbleData(monthIndex: number): BubbleData[] {
    const monthData = this.getDataByMonth(monthIndex);
    const zNorm = monthIndex / (this.monthCount - 1);
    const z = this.spaceRanges.z.min + zNorm * (this.spaceRanges.z.max - this.spaceRanges.z.min);

    return monthData.map(point => {
      const humidityNorm = (point.humidity - this.ranges.humidity.min) / (this.ranges.humidity.max - this.ranges.humidity.min);
      const temperatureNorm = (point.temperature - this.ranges.temperature.min) / (this.ranges.temperature.max - this.ranges.temperature.min);
      const precipitationNorm = (point.precipitation - this.ranges.precipitation.min) / (this.ranges.precipitation.max - this.ranges.precipitation.min);

      const x = this.spaceRanges.x.min + humidityNorm * (this.spaceRanges.x.max - this.spaceRanges.x.min);
      const y = this.spaceRanges.y.min + temperatureNorm * (this.spaceRanges.y.max - this.spaceRanges.y.min);

      let size: number;
      let colorValue: number;

      switch (this.dataMode) {
        case 'temperature':
          size = 0.3 + temperatureNorm * 0.7;
          colorValue = temperatureNorm;
          break;
        case 'humidity':
          size = 0.3 + humidityNorm * 0.7;
          colorValue = humidityNorm;
          break;
        case 'precipitation':
          size = 0.3 + precipitationNorm * 0.7;
          colorValue = precipitationNorm;
          break;
        default:
          size = 0.3 + precipitationNorm * 0.7;
          colorValue = temperatureNorm;
      }

      return {
        city: point.city,
        month: point.month,
        temperature: point.temperature,
        humidity: point.humidity,
        precipitation: point.precipitation,
        x,
        y,
        z,
        size,
        colorValue
      };
    });
  }

  isCityVisible(city: string): boolean {
    return this.selectedCity === 'all' || this.selectedCity === city;
  }

  getCityOpacity(city: string): number {
    if (this.selectedCity === 'all') return 1;
    return this.selectedCity === city ? 1 : 0.2;
  }

  getDataPoint(city: string, month: number): WeatherDataPoint | undefined {
    return this.rawData.find(d => d.city === city && d.month === month);
  }
}

export const dataManager = new DataManager();

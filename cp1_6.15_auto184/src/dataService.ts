import EventEmitter from 'eventemitter3';
import type { Station, WindParams, PollutantData, Events } from './types';

const STATION_COUNT = 50;
const HISTORY_MINUTES = 1440;

const CITY_CENTER = { lat: 39.9042, lon: 116.4074 };

const STATION_NAMES = [
  '奥体中心', '万寿西宫', '定陵', '八达岭', '密云水库', '怀柔', '昌平', '门头沟',
  '平谷', '顺义', '大兴', '房山', '延庆', '怀柔镇', '昌平镇', '大兴新城',
  '房山良乡', '平谷镇', '密云镇', '延庆镇', '前门', '永定门内', '西直门北',
  '东四环北路', '南三环西路', '东四环南路', '北四环西路', '官园', '万寿公园',
  '农展馆', '劲松中街', '奥体中心', '古城', '密云果园', '怀柔水库', '十三陵',
  '南口镇', '良乡', '榆垡', '永乐店', '马坡', '空港工业区', '亦庄',
  '通州', '大兴黄村', '房山城关', '延庆石河营', '平谷兴谷', '怀柔怀北', '密云西田各庄',
];

function generateRandomPollutants(baseConcentration = 0.5): PollutantData {
  return {
    pm25: Math.random() * 120 * baseConcentration + 10,
    pm10: Math.random() * 200 * baseConcentration + 20,
    o3: Math.random() * 180 * baseConcentration + 5,
    no2: Math.random() * 80 * baseConcentration + 5,
    so2: Math.random() * 50 * baseConcentration + 2,
    co: Math.random() * 8 * baseConcentration + 0.5,
  };
}

function calculateAQI(data: PollutantData): number {
  const iaqi = (c: number, bpHi: number, bpLo: number, iaqiHi: number, iaqiLo: number) =>
    Math.round(((iaqiHi - iaqiLo) / (bpHi - bpLo)) * (c - bpLo) + iaqiLo);

  const pm25AQI = data.pm25 <= 35 ? iaqi(data.pm25, 35, 0, 50, 0) :
    data.pm25 <= 75 ? iaqi(data.pm25, 75, 35, 100, 50) :
    data.pm25 <= 115 ? iaqi(data.pm25, 115, 75, 150, 100) :
    data.pm25 <= 150 ? iaqi(data.pm25, 150, 115, 200, 150) :
    data.pm25 <= 250 ? iaqi(data.pm25, 250, 150, 300, 200) :
    iaqi(data.pm25, 350, 250, 400, 300);

  return pm25AQI;
}

function generateStation(index: number): Station {
  const angle = (index / STATION_COUNT) * Math.PI * 2;
  const distance = Math.random() * 2 + 0.5;
  const lat = CITY_CENTER.lat + Math.sin(angle) * distance;
  const lon = CITY_CENTER.lon + Math.cos(angle) * distance * 1.2;

  const baseConcentration = 0.3 + Math.random() * 0.7;
  const history: PollutantData[] = [];
  for (let i = 0; i < HISTORY_MINUTES; i++) {
    const variation = Math.sin(i / 60) * 0.3 + 0.7;
    history.push(generateRandomPollutants(baseConcentration * variation));
  }

  const current = history[history.length - 1];

  return {
    id: `station-${index}`,
    name: STATION_NAMES[index % STATION_NAMES.length],
    lat,
    lon,
    current,
    aqi: calculateAQI(current),
    history,
  };
}

export class DataService {
  private emitter: EventEmitter<Events>;
  private stations: Station[] = [];
  private wind: WindParams = { direction: 90, speed: 5 };
  private updateInterval: number | null = null;
  private timeIndex: number = HISTORY_MINUTES - 1;

  constructor(emitter: EventEmitter<Events>) {
    this.emitter = emitter;
    this.initializeStations();
  }

  private initializeStations(): void {
    for (let i = 0; i < STATION_COUNT; i++) {
      this.stations.push(generateStation(i));
    }
  }

  start(): void {
    this.emitter.on('TIME_SCRUB', this.handleTimeScrub.bind(this));
    this.sendAggregateData();
    this.sendDataUpdate();
    this.updateInterval = window.setInterval(() => {
      this.updateData();
    }, 1000);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.emitter.off('TIME_SCRUB', this.handleTimeScrub.bind(this));
  }

  private handleTimeScrub(data: { timeIndex: number; isPlaying: boolean }): void {
    this.timeIndex = data.timeIndex;
    this.stations.forEach((station) => {
      station.current = station.history[data.timeIndex];
      station.aqi = calculateAQI(station.current);
    });
    this.sendAggregateData();
  }

  private updateData(): void {
    this.wind = {
      direction: (this.wind.direction + (Math.random() - 0.5) * 10 + 360) % 360,
      speed: Math.max(0, Math.min(20, this.wind.speed + (Math.random() - 0.5) * 2)),
    };

    this.stations.forEach((station) => {
      const lastData = station.history[station.history.length - 1];
      const newData: PollutantData = {
        pm25: Math.max(0, lastData.pm25 + (Math.random() - 0.5) * 10),
        pm10: Math.max(0, lastData.pm10 + (Math.random() - 0.5) * 15),
        o3: Math.max(0, lastData.o3 + (Math.random() - 0.5) * 8),
        no2: Math.max(0, lastData.no2 + (Math.random() - 0.5) * 5),
        so2: Math.max(0, lastData.so2 + (Math.random() - 0.5) * 3),
        co: Math.max(0, lastData.co + (Math.random() - 0.5) * 0.5),
      };
      station.history.shift();
      station.history.push(newData);
      station.current = newData;
      station.aqi = calculateAQI(newData);
    });

    this.sendDataUpdate();
    this.sendAggregateData();
  }

  private sendDataUpdate(): void {
    this.emitter.emit('DATA_UPDATE', {
      stations: this.stations,
      wind: this.wind,
      timestamp: Date.now(),
    });
  }

  private sendAggregateData(): void {
    this.emitter.emit('AGGREGATE_DATA', {
      stations: this.stations,
      timestamp: Date.now(),
    });
  }

  getStations(): Station[] {
    return this.stations;
  }

  getWind(): WindParams {
    return this.wind;
  }

  getTimeIndex(): number {
    return this.timeIndex;
  }
}

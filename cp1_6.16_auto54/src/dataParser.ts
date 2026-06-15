import { eventBus } from './eventBus';
import type { BuildingData, RoadData, DataSnapshot, RawDataset, TimePeriod, PeriodTrafficData } from './types';

const FLOOR_HEIGHT = 3;
const GRID_SIZE = 200;
const LAT_RANGE = 0.01;
const LNG_RANGE = 0.01;
const CENTER_LAT = 39.9042;
const CENTER_LNG = 116.4074;

export function latLngToPosition(lat: number, lng: number): { x: number; z: number } {
  const x = ((lng - CENTER_LNG) / LNG_RANGE) * GRID_SIZE;
  const z = ((lat - CENTER_LAT) / LAT_RANGE) * GRID_SIZE;
  return { x, z };
}

function validateBuilding(b: { id: string; lat: number; lng: number; floors: number }): boolean {
  if (!b || typeof b.id !== 'string' || b.id.trim() === '') return false;
  if (typeof b.lat !== 'number' || isNaN(b.lat) || b.lat < -90 || b.lat > 90) return false;
  if (typeof b.lng !== 'number' || isNaN(b.lng) || b.lng < -180 || b.lng > 180) return false;
  if (typeof b.floors !== 'number' || isNaN(b.floors) || b.floors < 1 || b.floors > 100) return false;
  return true;
}

function validateRoad(r: RoadData): boolean {
  if (!r || typeof r.id !== 'string' || r.id.trim() === '') return false;
  if (typeof r.startLat !== 'number' || isNaN(r.startLat)) return false;
  if (typeof r.startLng !== 'number' || isNaN(r.startLng)) return false;
  if (typeof r.endLat !== 'number' || isNaN(r.endLat)) return false;
  if (typeof r.endLng !== 'number' || isNaN(r.endLng)) return false;
  if (typeof r.averageSpeed !== 'number' || isNaN(r.averageSpeed) || r.averageSpeed < 0) return false;
  if (typeof r.congestionLevel !== 'number' || isNaN(r.congestionLevel) || r.congestionLevel < 1 || r.congestionLevel > 5) return false;
  return true;
}

function calculateStats(roads: RoadData[]): {
  totalRoads: number;
  averageSpeed: number;
  maxCongestion: number;
  congestionDistribution: number[];
} {
  const totalRoads = roads.length;
  if (totalRoads === 0) {
    return {
      totalRoads: 0,
      averageSpeed: 0,
      maxCongestion: 0,
      congestionDistribution: [0, 0, 0, 0, 0]
    };
  }

  let totalSpeed = 0;
  let maxCongestion = 1;
  const distribution = [0, 0, 0, 0, 0];

  for (const road of roads) {
    totalSpeed += road.averageSpeed;
    maxCongestion = Math.max(maxCongestion, road.congestionLevel);
    const idx = Math.floor(road.congestionLevel) - 1;
    if (idx >= 0 && idx < 5) {
      distribution[idx]++;
    }
  }

  return {
    totalRoads,
    averageSpeed: Math.round((totalSpeed / totalRoads) * 10) / 10,
    maxCongestion,
    congestionDistribution: distribution.map(count => Math.round((count / totalRoads) * 1000) / 10)
  };
}

export function parseData(rawData: RawDataset, period: TimePeriod = 'morning'): DataSnapshot {
  const validBuildings = rawData.buildings.filter(validateBuilding).map(b => ({
    id: b.id,
    lat: b.lat,
    lng: b.lng,
    floors: b.floors,
    height: b.floors * FLOOR_HEIGHT
  } as BuildingData));

  const periodData: PeriodTrafficData = rawData.traffic[period] || { roads: [] };
  const validRoads = periodData.roads.filter(validateRoad);

  const stats = calculateStats(validRoads);

  const snapshot: DataSnapshot = {
    buildings: validBuildings,
    roads: validRoads,
    period,
    stats
  };

  return snapshot;
}

export async function loadAndParseData(dataUrl: string, initialPeriod: TimePeriod = 'morning'): Promise<DataSnapshot> {
  const loadingPercentEl = document.getElementById('loading-percent');
  
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }
    
    if (loadingPercentEl) {
      loadingPercentEl.textContent = '50';
    }
    
    const rawData: RawDataset = await response.json();
    
    if (loadingPercentEl) {
      loadingPercentEl.textContent = '80';
    }
    
    const snapshot = parseData(rawData, initialPeriod);
    
    if (loadingPercentEl) {
      loadingPercentEl.textContent = '100';
    }
    
    eventBus.emit('data-ready', snapshot);
    
    return snapshot;
  } catch (error) {
    console.error('Failed to load and parse data:', error);
    throw error;
  }
}

export function switchPeriod(rawData: RawDataset, period: TimePeriod): void {
  const snapshot = parseData(rawData, period);
  eventBus.emit('data-ready', snapshot);
}

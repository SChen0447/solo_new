import type { RawDataset, RoadData } from './types';

const BUILDING_COUNT = 60;
const ROAD_COUNT = 120;
const CENTER_LAT = 39.9042;
const CENTER_LNG = 116.4074;
const LAT_RANGE = 0.008;
const LNG_RANGE = 0.008;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

interface RoadPoint {
  lat: number;
  lng: number;
}

function generateRoadPoints(): { start: RoadPoint; end: RoadPoint } {
  const isHorizontal = Math.random() > 0.5;
  
  if (isHorizontal) {
    const lat = CENTER_LAT + randomRange(-LAT_RANGE * 0.9, LAT_RANGE * 0.9);
    const lngStart = CENTER_LNG + randomRange(-LNG_RANGE * 0.9, -LNG_RANGE * 0.2);
    const lngEnd = CENTER_LNG + randomRange(LNG_RANGE * 0.2, LNG_RANGE * 0.9);
    return {
      start: { lat, lng: lngStart },
      end: { lat, lng: lngEnd }
    };
  } else {
    const lng = CENTER_LNG + randomRange(-LNG_RANGE * 0.9, LNG_RANGE * 0.9);
    const latStart = CENTER_LAT + randomRange(-LAT_RANGE * 0.9, -LAT_RANGE * 0.2);
    const latEnd = CENTER_LAT + randomRange(LAT_RANGE * 0.2, LAT_RANGE * 0.9);
    return {
      start: { lat: latStart, lng },
      end: { lat: latEnd, lng }
    };
  }
}

function generateCongestionLevel(baseLevel: number, variance: number = 1.5): number {
  const level = baseLevel + randomRange(-variance, variance);
  return Math.max(1, Math.min(5, Math.round(level * 10) / 10));
}

function generateSpeed(congestionLevel: number): number {
  const baseSpeed = 80 - (congestionLevel - 1) * 15;
  return Math.max(10, baseSpeed + randomRange(-5, 5));
}

function generateRoadsForPeriod(baseCongestion: number): RoadData[] {
  const roads: RoadData[] = [];
  
  for (let i = 0; i < ROAD_COUNT; i++) {
    const { start, end } = generateRoadPoints();
    const congestion = generateCongestionLevel(baseCongestion);
    const speed = generateSpeed(congestion);
    
    roads.push({
      id: `road_${i.toString().padStart(3, '0')}`,
      startLat: start.lat,
      startLng: start.lng,
      endLat: end.lat,
      endLng: end.lng,
      averageSpeed: Math.round(speed * 10) / 10,
      congestionLevel: Math.round(congestion * 10) / 10
    });
  }
  
  return roads;
}

export function generateMockData(): RawDataset {
  const buildings: RawDataset['buildings'] = [];
  
  for (let i = 0; i < BUILDING_COUNT; i++) {
    const lat = CENTER_LAT + randomRange(-LAT_RANGE * 0.85, LAT_RANGE * 0.85);
    const lng = CENTER_LNG + randomRange(-LNG_RANGE * 0.85, LNG_RANGE * 0.85);
    const floors = randomInt(3, 30);
    
    buildings.push({
      id: `building_${i.toString().padStart(3, '0')}`,
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
      floors
    });
  }
  
  const morningRoads = generateRoadsForPeriod(3.5);
  const eveningRoads = generateRoadsForPeriod(4.0);
  const nightRoads = generateRoadsForPeriod(1.5);
  
  return {
    buildings,
    traffic: {
      morning: { roads: morningRoads },
      evening: { roads: eveningRoads },
      night: { roads: nightRoads }
    }
  };
}

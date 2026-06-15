import { v4 as uuidv4 } from 'uuid';
import {
  PackageInfo,
  TrackingPoint,
  StatusChangeEvent,
  PackageStatus,
  Coordinates,
} from './types';

const MOCK_PACKAGES: Map<string, { pkg: PackageInfo; points: TrackingPoint[] }> = new Map();

const AMBASSADOR_NAMES = [
  '张伟', '李娜', '王强', '刘芳', '陈明',
  '杨柳', '赵磊', '周静', '吴鹏', '郑雪',
];

const STATUS_SEQUENCE: PackageStatus[] = [
  '待揽收',
  '已揽收',
  '运输中',
  '派送中',
  '已签收',
];

const generateChineseCities = (count: number): { name: string; coords: Coordinates }[] => {
  const cities = [
    { name: '北京转运中心', coords: { lat: 39.9042, lng: 116.4074 } },
    { name: '上海虹桥分拣中心', coords: { lat: 31.2304, lng: 121.4737 } },
    { name: '广州白云集散点', coords: { lat: 23.1291, lng: 113.2644 } },
    { name: '深圳南山网点', coords: { lat: 22.5431, lng: 114.0579 } },
    { name: '杭州西湖配送站', coords: { lat: 30.2741, lng: 120.1551 } },
    { name: '成都武侯中转站', coords: { lat: 30.5728, lng: 104.0668 } },
    { name: '武汉江汉枢纽', coords: { lat: 30.5928, lng: 114.3055 } },
    { name: '西安雁塔营业部', coords: { lat: 34.3416, lng: 108.9398 } },
    { name: '南京鼓楼投递点', coords: { lat: 32.0603, lng: 118.7969 } },
    { name: '重庆渝中物流园', coords: { lat: 29.4316, lng: 106.9123 } },
    { name: '天津和平营业点', coords: { lat: 39.0842, lng: 117.2009 } },
    { name: '苏州姑苏揽收点', coords: { lat: 31.2989, lng: 120.5853 } },
  ];
  return cities.slice(0, count);
};

const addNoise = (coord: Coordinates, index: number): Coordinates => {
  const scale = index * 0.01;
  return {
    lat: coord.lat + (Math.random() - 0.5) * scale,
    lng: coord.lng + (Math.random() - 0.5) * scale,
  };
};

const now = Date.now();
const HOUR = 3600000;

const seedPackage = (trackingNumber: string): void => {
  const pointCount = 5 + Math.floor(Math.random() * 4);
  const cities = generateChineseCities(pointCount);

  const startOffset = pointCount * HOUR * 3;
  const baseTime = now - startOffset;

  const trackingPoints: TrackingPoint[] = cities.map((city, idx) => {
    const coords = addNoise(city.coords, idx);
    const statusIndex = Math.min(idx, STATUS_SEQUENCE.length - 1);
    return {
      id: uuidv4(),
      stationName: city.name,
      timestamp: baseTime + idx * HOUR * (2 + Math.random()),
      coordinates: coords,
      ambassadorSignature: AMBASSADOR_NAMES[Math.floor(Math.random() * AMBASSADOR_NAMES.length)],
      status: STATUS_SEQUENCE[statusIndex],
    };
  });

  trackingPoints.sort((a, b) => a.timestamp - b.timestamp);

  const lastPoint = trackingPoints[trackingPoints.length - 1];
  const firstPoint = trackingPoints[0];

  const pkg: PackageInfo = {
    trackingNumber,
    senderName: ['李建国', '王小美', '陈思远', '刘志强'][Math.floor(Math.random() * 4)],
    senderAddress: firstPoint.stationName + '附近发货区',
    receiverName: ['张明华', '赵晓红', '孙文博', '周晓彤'][Math.floor(Math.random() * 4)],
    receiverAddress: lastPoint.stationName + '住宅区',
    currentStatus: lastPoint.status,
    estimatedDelivery: now + HOUR * (4 + Math.random() * 20),
    weight: Number((0.5 + Math.random() * 10).toFixed(2)),
    dimensions: `${(10 + Math.random() * 40).toFixed(0)}x${(10 + Math.random() * 40).toFixed(0)}x${(5 + Math.random() * 30).toFixed(0)}cm`,
    items: ['电子产品', '服装鞋帽', '图书音像', '食品饮料', '家居用品'][Math.floor(Math.random() * 5)],
  };

  MOCK_PACKAGES.set(trackingNumber, { pkg, points: trackingPoints });
};

const INITIAL_TRACKING_NUMBERS = [
  '123456789012',
  '987654321098',
  '555566667777',
  '111122223333',
  '444455556666',
];

INITIAL_TRACKING_NUMBERS.forEach((num) => seedPackage(num));

export const searchPackage = (
  trackingNumber: string
): { pkg: PackageInfo; points: TrackingPoint[]; events: StatusChangeEvent[] } | null => {
  const trimmed = trackingNumber.trim();
  if (!/^\d{12}$/.test(trimmed)) {
    return null;
  }

  if (!MOCK_PACKAGES.has(trimmed)) {
    if (Math.random() > 0.3) {
      seedPackage(trimmed);
    } else {
      return null;
    }
  }

  const data = MOCK_PACKAGES.get(trimmed)!;
  const events: StatusChangeEvent[] = [];

  for (let i = 1; i < data.points.length; i++) {
    const prev = data.points[i - 1];
    const curr = data.points[i];
    if (prev.status !== curr.status) {
      events.push({
        id: uuidv4(),
        trackingNumber: trimmed,
        fromStatus: prev.status,
        toStatus: curr.status,
        timestamp: curr.timestamp,
        newTrackingPoint: curr,
      });
    }
  }

  return {
    pkg: data.pkg,
    points: data.points,
    events,
  };
};

export const getSortedTrackingPoints = (points: TrackingPoint[]): TrackingPoint[] => {
  return [...points].sort((a, b) => a.timestamp - b.timestamp);
};

export const getStatusChangeEvents = (points: TrackingPoint[]): StatusChangeEvent[] => {
  const events: StatusChangeEvent[] = [];
  const sorted = getSortedTrackingPoints(points);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.status !== curr.status) {
      events.push({
        id: uuidv4(),
        trackingNumber: sorted[0].id,
        fromStatus: prev.status,
        toStatus: curr.status,
        timestamp: curr.timestamp,
        newTrackingPoint: curr,
      });
    }
  }
  return events;
};

export const simulateNextStatusChange = (
  pkg: PackageInfo,
  existingPoints: TrackingPoint[]
): { event: StatusChangeEvent; updatedPkg: PackageInfo; newPoints: TrackingPoint[] } | null => {
  const currentIdx = STATUS_SEQUENCE.indexOf(pkg.currentStatus);
  if (currentIdx >= STATUS_SEQUENCE.length - 1) {
    return null;
  }

  const nextStatus = STATUS_SEQUENCE[currentIdx + 1];
  const lastPoint = existingPoints[existingPoints.length - 1];

  const newCoords: Coordinates = {
    lat: lastPoint.coordinates.lat + (Math.random() - 0.5) * 0.05,
    lng: lastPoint.coordinates.lng + (Math.random() - 0.5) * 0.05,
  };

  const stationNames = [
    '社区派送站',
    '快递员收件中',
    '小区自提点',
    '配送服务中心',
    '最终派送点',
  ];

  const newPoint: TrackingPoint = {
    id: uuidv4(),
    stationName: stationNames[Math.floor(Math.random() * stationNames.length)],
    timestamp: Date.now(),
    coordinates: newCoords,
    ambassadorSignature: AMBASSADOR_NAMES[Math.floor(Math.random() * AMBASSADOR_NAMES.length)],
    status: nextStatus,
  };

  const event: StatusChangeEvent = {
    id: uuidv4(),
    trackingNumber: pkg.trackingNumber,
    fromStatus: pkg.currentStatus,
    toStatus: nextStatus,
    timestamp: Date.now(),
    newTrackingPoint: newPoint,
  };

  const updatedPkg: PackageInfo = {
    ...pkg,
    currentStatus: nextStatus,
  };

  const newPoints = [...existingPoints, newPoint];

  return { event, updatedPkg, newPoints };
};

export const formatTimestamp = (ts: number): string => {
  const date = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getStatusColor = (status: PackageStatus): string => {
  const colors: Record<PackageStatus, string> = {
    '待揽收': '#9e9e9e',
    '已揽收': '#1976d2',
    '运输中': '#1976d2',
    '派送中': '#ff9800',
    '已签收': '#4caf50',
    '异常': '#f44336',
  };
  return colors[status];
};

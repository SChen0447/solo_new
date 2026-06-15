import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { TrackingPoint } from './types';
import { useAppContext } from './AppContext';
import { formatTimestamp } from './dataProcessor';

const interpolateColor = (progress: number): string => {
  const grayR = 158, grayG = 158, grayB = 158;
  const blueR = 25, blueG = 118, blueB = 210;
  const r = Math.round(grayR + (blueR - grayR) * progress);
  const g = Math.round(grayG + (blueG - grayG) * progress);
  const b = Math.round(grayB + (blueB - grayB) * progress);
  return `rgb(${r}, ${g}, ${b})`;
};

const createPulseIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'pulse-marker-wrapper',
    html: `
      <div class="pulse-marker">
        <div class="pulse-ring"></div>
        <div class="pulse-core"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

const createStandardIcon = (color: string): L.DivIcon => {
  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `
      <div style="
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

interface MapControllerProps {
  points: TrackingPoint[];
  onZoomChange: (zoom: number) => void;
}

const MapController: React.FC<MapControllerProps> = ({ points, onZoomChange }) => {
  const map = useMap();

  useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      map.setView([lastPoint.coordinates.lat, lastPoint.coordinates.lng], 14, {
        animate: true,
      });
      onZoomChange(map.getZoom());
    }
  }, [points, map, onZoomChange]);

  return null;
};

interface AnimatedPolylineProps {
  points: TrackingPoint[];
  animationProgress: number;
  lineWidth: number;
}

const AnimatedPolyline: React.FC<AnimatedPolylineProps> = ({
  points,
  animationProgress,
  lineWidth,
}) => {
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.timestamp - b.timestamp),
    [points]
  );

  if (sortedPoints.length < 2) return null;

  const totalSegments = sortedPoints.length - 1;
  const visibleSegmentsFloat = totalSegments * animationProgress;
  const visibleFullSegments = Math.floor(visibleSegmentsFloat);
  const partialProgress = visibleSegmentsFloat - visibleFullSegments;

  const segments: JSX.Element[] = [];

  for (let i = 0; i < visibleFullSegments && i < totalSegments; i++) {
    const segmentProgress = (i + 1) / totalSegments;
    const color = interpolateColor(segmentProgress);
    const coords = [
      [sortedPoints[i].coordinates.lat, sortedPoints[i].coordinates.lng],
      [sortedPoints[i + 1].coordinates.lat, sortedPoints[i + 1].coordinates.lng],
    ] as [number, number][];

    segments.push(
      <Polyline
        key={`seg-full-${i}`}
        positions={coords}
        pathOptions={{
          color,
          weight: lineWidth,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    );
  }

  if (visibleFullSegments < totalSegments && partialProgress > 0) {
    const fromIdx = visibleFullSegments;
    const toIdx = visibleFullSegments + 1;
    const from = sortedPoints[fromIdx].coordinates;
    const to = sortedPoints[toIdx].coordinates;

    const partialCoords: [number, number][] = [
      [from.lat, from.lng],
      [
        from.lat + (to.lat - from.lat) * partialProgress,
        from.lng + (to.lng - from.lng) * partialProgress,
      ],
    ];

    const segmentProgress = (visibleFullSegments + partialProgress) / totalSegments;
    const color = interpolateColor(segmentProgress);

    segments.push(
      <Polyline
        key="seg-partial"
        positions={partialCoords}
        pathOptions={{
          color,
          weight: lineWidth,
          opacity: 0.9,
          dashArray: '10, 10',
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    );
  }

  for (let i = visibleFullSegments; i < totalSegments; i++) {
    const coords = [
      [sortedPoints[i].coordinates.lat, sortedPoints[i].coordinates.lng],
      [sortedPoints[i + 1].coordinates.lat, sortedPoints[i + 1].coordinates.lng],
    ] as [number, number][];

    segments.push(
      <Polyline
        key={`seg-gray-${i}`}
        positions={coords}
        pathOptions={{
          color: '#e0e0e0',
          weight: lineWidth,
          opacity: 0.5,
          dashArray: '5, 10',
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    );
  }

  return <>{segments}</>;
};

export const MapView: React.FC = () => {
  const { state } = useAppContext();
  const { trackingPoints, animationProgress, isPulsing } = state;
  const [zoomLevel, setZoomLevel] = useState(14);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedPoints = useMemo(
    () => [...trackingPoints].sort((a, b) => a.timestamp - b.timestamp),
    [trackingPoints]
  );

  const lineWidth = useMemo(() => {
    if (zoomLevel < 12) return 3;
    if (zoomLevel <= 15) return 5;
    return 8;
  }, [zoomLevel]);

  const handleZoomChange = React.useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, []);

  const center: [number, number] = useMemo(() => {
    if (sortedPoints.length > 0) {
      const last = sortedPoints[sortedPoints.length - 1];
      return [last.coordinates.lat, last.coordinates.lng];
    }
    return [35.8617, 104.1954];
  }, [sortedPoints]);

  const visiblePointsCount = useMemo(() => {
    if (sortedPoints.length === 0) return 0;
    const total = sortedPoints.length;
    const count = Math.ceil(total * animationProgress);
    return Math.max(1, Math.min(count, total));
  }, [sortedPoints, animationProgress]);

  const visiblePoints = useMemo(
    () => sortedPoints.slice(0, visiblePointsCount),
    [sortedPoints, visiblePointsCount]
  );

  const lastPoint = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;

  return (
    <div ref={containerRef} className="map-container">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', borderRadius: 0 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController points={sortedPoints} onZoomChange={handleZoomChange} />

        {sortedPoints.length >= 2 && (
          <AnimatedPolyline
            points={sortedPoints}
            animationProgress={animationProgress}
            lineWidth={lineWidth}
          />
        )}

        {visiblePoints.map((point, index) => {
          const isCurrentLocation = lastPoint && point.id === lastPoint.id;

          let icon: L.DivIcon;
          if (isCurrentLocation && isPulsing) {
            icon = createPulseIcon();
          } else if (isCurrentLocation) {
            icon = createStandardIcon('#f44336');
          } else {
            const progress = sortedPoints.length > 1 ? index / (sortedPoints.length - 1) : 0;
            icon = createStandardIcon(interpolateColor(progress));
          }

          return (
            <Marker
              key={point.id}
              position={[point.coordinates.lat, point.coordinates.lng]}
              icon={icon}
            >
              <Popup>
                <div className="popup-content">
                  <h4 className="popup-title">{point.stationName}</h4>
                  <div className="popup-info">
                    <span className="popup-label">到达时间：</span>
                    <span className="popup-value">{formatTimestamp(point.timestamp)}</span>
                  </div>
                  <div className="popup-info">
                    <span className="popup-label">状态：</span>
                    <span
                      className="popup-value"
                      style={{
                        color:
                          point.status === '已签收'
                            ? '#4caf50'
                            : point.status === '派送中'
                            ? '#ff9800'
                            : point.status === '异常'
                            ? '#f44336'
                            : '#1976d2',
                        fontWeight: 600,
                      }}
                    >
                      {point.status}
                    </span>
                  </div>
                  <div className="popup-info">
                    <span className="popup-label">大使签名：</span>
                    <span className="popup-value popup-signature">
                      {point.ambassadorSignature}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

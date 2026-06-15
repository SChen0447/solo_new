import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Track, Annotation, PathMark, Viewport } from '../../../shared/types';
import { AnnotationManager } from '../utils/AnnotationManager';

interface MapViewProps {
  tracks: Track[];
  annotations: Annotation[];
  pathMarks: PathMark[];
  isLoading: boolean;
  annotationManager: AnnotationManager;
  onAnnotationClick: (annotation: Annotation) => void;
  onTrackClick?: (track: Track, coordinateIndex: number, screenX: number, screenY: number) => void;
  onPathMarkCreated?: (pathMark: PathMark) => void;
  drawingMode: 'none' | 'path';
  drawingColor: string;
  drawingArrow: boolean;
  selectedAnnotationId: string | null;
  onExportReady?: (canvas: HTMLCanvasElement) => void;
}

const COLORS = [
  '#00bcd4', '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3',
];

export const MapView: React.FC<MapViewProps> = ({
  tracks,
  annotations,
  pathMarks,
  isLoading,
  annotationManager,
  onAnnotationClick,
  onTrackClick,
  onPathMarkCreated,
  drawingMode,
  drawingColor,
  drawingArrow,
  selectedAnnotationId,
  onExportReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [viewport, setViewport] = useState<Viewport>({
    centerX: 0,
    centerY: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number; lat: number; lon: number }[]>([]);
  const [animatingTracks, setAnimatingTracks] = useState<Set<string>>(new Set());
  const [clickedAnnotationId, setClickedAnnotationId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const bounds = useMemo(() => {
    if (tracks.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    tracks.forEach((track) => {
      track.coordinates.forEach((coord) => {
        minLat = Math.min(minLat, coord.lat);
        maxLat = Math.max(maxLat, coord.lat);
        minLon = Math.min(minLon, coord.lon);
        maxLon = Math.max(maxLon, coord.lon);
      });
    });

    return { minLat, maxLat, minLon, maxLon };
  }, [tracks]);

  const latLonToScreen = useCallback(
    (lat: number, lon: number) => {
      if (!bounds) return { x: 0, y: 0 };

      const { minLat, maxLat, minLon, maxLon } = bounds;
      const padding = 60;

      const latRange = maxLat - minLat || 1;
      const lonRange = maxLon - minLon || 1;

      const scaleX = (canvasSize.width - padding * 2) / lonRange;
      const scaleY = (canvasSize.height - padding * 2) / latRange;
      const scale = Math.min(scaleX, scaleY) * viewport.scale;

      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;

      const x =
        canvasSize.width / 2 +
        (lon - centerLon) * scale + viewport.offsetX;
      const y =
        canvasSize.height / 2 -
        (lat - centerLat) * scale + viewport.offsetY;

      return { x, y, scale };
    },
    [bounds, canvasSize, viewport]
  );

  const screenToLatLon = useCallback(
    (x: number, y: number) => {
      if (!bounds) return { lat: 0, lon: 0 };

      const { minLat, maxLat, minLon, maxLon } = bounds;
      const padding = 60;

      const latRange = maxLat - minLat || 1;
      const lonRange = maxLon - minLon || 1;

      const scaleX = (canvasSize.width - padding * 2) / lonRange;
      const scaleY = (canvasSize.height - padding * 2) / latRange;
      const scale = Math.min(scaleX, scaleY) * viewport.scale;

      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;

      const lon =
        (x - canvasSize.width / 2 - viewport.offsetX) / scale + centerLon;
      const lat =
        -(y - canvasSize.height / 2 - viewport.offsetY) / scale + centerLat;

      return { lat, lon };
    },
    [bounds, canvasSize, viewport]
  );

  const getAnnotationScreenPos = useCallback(
    (annotation: Annotation) => {
      const track = tracks.find((t) => t.id === annotation.trackId);
      if (!track) return null;

      const coord = track.coordinates[annotation.coordinateIndex];
      if (!coord) return null;

      return latLonToScreen(coord.lat, coord.lon);
    },
    [tracks, latLonToScreen]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    drawGrid(ctx);

    tracks.forEach((track, index) => {
      drawTrack(ctx, track, COLORS[index % COLORS.length]);
    });

    pathMarks.forEach((pathMark) => {
      drawPathMark(ctx, pathMark);
    });

    if (drawingPoints.length > 0) {
      drawTempPath(ctx);
    }

    const allAnnotations = annotationManager.getAnnotations();
    allAnnotations.forEach((annotation) => {
      const pos = getAnnotationScreenPos(annotation);
      if (!pos) return;
      drawAnnotationBubble(ctx, pos.x, pos.y, annotation);
    });
  }, [
    tracks,
    pathMarks,
    drawingPoints,
    canvasSize,
    annotationManager,
    getAnnotationScreenPos,
    selectedAnnotationId,
    clickedAnnotationId,
  ]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(0, 188, 212, 0.1)';
    ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x < canvasSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvasSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  };

  const drawTrack = (ctx: CanvasRenderingContext2D, track: Track, color: string) => {
    if (track.coordinates.length < 2) return;

    const isAnimating = animatingTracks.has(track.id);
    const animationProgress = isAnimating
      ? Math.min(1, (Date.now() - lastTimeRef.current) / 1500)
      : 1;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    const pointsToDraw = isAnimating
      ? Math.ceil(track.coordinates.length * animationProgress)
      : track.coordinates.length;

    for (let i = 0; i < pointsToDraw; i++) {
      const coord = track.coordinates[i];
      const pos = latLonToScreen(coord.lat, coord.lon);
      if (i === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!isAnimating || animationProgress >= 1) {
      const startCoord = track.coordinates[0];
      const endCoord = track.coordinates[track.coordinates.length - 1];

      const startPos = latLonToScreen(startCoord.lat, startCoord.lon);
      const endPos = latLonToScreen(endCoord.lat, endCoord.lon);

      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.arc(startPos.x, startPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(endPos.x, endPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawPathMark = (ctx: CanvasRenderingContext2D, pathMark: PathMark) => {
    if (pathMark.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = pathMark.color;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    pathMark.points.forEach((point, i) => {
      const pos = latLonToScreen(point.lat, point.lon);
      if (i === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);

    if (pathMark.hasArrow && pathMark.points.length >= 2) {
      const lastPoint = pathMark.points[pathMark.points.length - 1];
      const prevPoint = pathMark.points[pathMark.points.length - 2];
      drawArrow(ctx, prevPoint, lastPoint, pathMark.color);
    }
  };

  const drawTempPath = (ctx: CanvasRenderingContext2D) => {
    if (drawingPoints.length < 1) return;

    ctx.beginPath();
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.lineCap = 'round';

    drawingPoints.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number; lat: number; lon: number },
    to: { x: number; y: number; lat: number; lon: number },
    color: string
  ) => {
    const fromPos = latLonToScreen(from.lat, from.lon);
    const toPos = latLonToScreen(to.lat, to.lon);

    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
    const arrowLength = 12;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(toPos.x, toPos.y);
    ctx.lineTo(
      toPos.x - arrowLength * Math.cos(angle - Math.PI / 6),
      toPos.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toPos.x - arrowLength * Math.cos(angle + Math.PI / 6),
      toPos.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  const drawAnnotationBubble = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    annotation: Annotation
  ) => {
    const isSelected = selectedAnnotationId === annotation.id;
    const isClicked = clickedAnnotationId === annotation.id;

    const baseRadius = 10;
    const scale = isClicked ? 1.15 : isSelected ? 1.1 : 1;
    const radius = baseRadius * scale;

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00bcd4';
    ctx.shadowBlur = isSelected ? 12 : 6;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00bcd4';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(annotation.type === 'voice' ? '🔊' : '📝', x, y);
  };

  useEffect(() => {
    annotationManager.onRedraw(() => {
      requestAnimationFrame(draw);
    });
  }, [annotationManager, draw]);

  useEffect(() => {
    if (tracks.length > 0) {
      tracks.forEach((track) => {
        if (!animatingTracks.has(track.id)) {
          setAnimatingTracks((prev) => {
            const next = new Set(prev);
            next.add(track.id);
            return next;
          });
          lastTimeRef.current = Date.now();
        }
      });
    }
  }, [tracks]);

  useEffect(() => {
    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (onExportReady && canvasRef.current) {
      onExportReady(canvasRef.current);
    }
  }, [onExportReady, tracks, annotations, pathMarks]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingMode === 'path') {
      setIsDrawing(true);
      const latLon = screenToLatLon(x, y);
      setDrawingPoints([{ x, y, ...latLon }]);
    } else {
      const annotation = annotationManager.findAnnotationNearPoint(
        x,
        y,
        15,
        getAnnotationScreenPos
      );

      if (annotation) {
        setClickedAnnotationId(annotation.id);
        setTimeout(() => setClickedAnnotationId(null), 300);
        onAnnotationClick(annotation);
      } else {
        setIsDragging(true);
        setDragStart({ x: x - viewport.offsetX, y: y - viewport.offsetY });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawing && drawingMode === 'path') {
      const latLon = screenToLatLon(x, y);
      setDrawingPoints((prev) => [...prev, { x, y, ...latLon }]);
    } else if (isDragging) {
      setViewport((prev) => ({
        ...prev,
        offsetX: x - dragStart.x,
        offsetY: y - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingPoints.length > 2) {
      const pathMark: PathMark = {
        id: '',
        memberName: '',
        color: drawingColor,
        points: drawingPoints,
        hasArrow: drawingArrow,
        createdAt: new Date().toISOString(),
      };
      onPathMarkCreated?.(pathMark);
    }
    setIsDragging(false);
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(5, prev.scale * delta)),
    }));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#1a1a2e] rounded-xl overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] bg-opacity-90 z-10">
          <div className="relative w-10 h-10">
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                background: 'conic-gradient(from 0deg, #00bcd4, #00838f, #00bcd4)',
                WebkitMask: 'radial-gradient(transparent 60%, black 60%)',
                mask: 'radial-gradient(transparent 60%, black 60%)',
              }}
            />
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
};

export default MapView;

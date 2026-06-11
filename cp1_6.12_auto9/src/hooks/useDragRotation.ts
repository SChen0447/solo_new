import { useCallback, useRef, useState, useEffect } from 'react';
import { normalizeAngle, snapToAngle } from '../utils/animationUtils';
import { ROTATION_SNAP } from '../utils/constants';

interface UseDragRotationOptions {
  initialRotation: number;
  blockWidth: number;
  blockHeight: number;
  blockX: number;
  blockY: number;
  onRotate: (rotation: number) => void;
  onRotateEnd?: (rotation: number) => void;
}

export function useDragRotation({
  initialRotation,
  blockWidth,
  blockHeight,
  blockX,
  blockY,
  onRotate,
  onRotateEnd,
}: UseDragRotationOptions) {
  const [isRotating, setIsRotating] = useState(false);
  const [displayAngle, setDisplayAngle] = useState<number | null>(null);
  const startAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const pendingRotationRef = useRef<number | null>(null);

  const centerX = blockX + blockWidth / 2;
  const centerY = blockY + blockHeight / 2;
  const handleX = blockX + blockWidth / 2;
  const handleY = blockY + blockHeight + 22;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const rect = (e.currentTarget as HTMLElement)
        .closest('.canvas-viewport')
        ?.getBoundingClientRect();
      if (!rect) return;

      const startMouseX = e.clientX - rect.left;
      const startMouseY = e.clientY - rect.top;
      startAngleRef.current = Math.atan2(startMouseY - centerY, startMouseX - centerX);
      startRotationRef.current = initialRotation;

      setIsRotating(true);
      setDisplayAngle(normalizeAngle(initialRotation));
    },
    [centerX, centerY, initialRotation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isRotating) return;
      e.preventDefault();

      const rect = (e.currentTarget as HTMLElement)
        .closest('.canvas-viewport')
        ?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
      const deltaDeg = ((angle - startAngleRef.current) * 180) / Math.PI;
      let newRotation = startRotationRef.current + deltaDeg;

      if (e.shiftKey) {
        newRotation = snapToAngle(newRotation, ROTATION_SNAP);
      }

      newRotation = normalizeAngle(newRotation);
      pendingRotationRef.current = newRotation;
      setDisplayAngle(newRotation);

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (pendingRotationRef.current !== null) {
            onRotate(pendingRotationRef.current);
            pendingRotationRef.current = null;
          }
          rafIdRef.current = null;
        });
      }
    },
    [isRotating, centerX, centerY, onRotate]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isRotating) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pendingRotationRef.current !== null) {
        onRotate(pendingRotationRef.current);
        onRotateEnd?.(pendingRotationRef.current);
        pendingRotationRef.current = null;
      }

      setIsRotating(false);
      setTimeout(() => setDisplayAngle(null), 500);
    },
    [isRotating, onRotate, onRotateEnd]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    isRotating,
    displayAngle,
    handleX,
    handleY,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

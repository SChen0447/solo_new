import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  useAtomsStore,
  ELEMENT_PROPERTIES,
  ELEMENTS,
  type Atom,
  type Bond,
  type ElementType,
  type BondType
} from './stores/atomsStore';

interface CanvasEditorProps {
  isPreview?: boolean;
}

interface DragState {
  isDragging: boolean;
  startAtomId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface LongPressState {
  timer: number | null;
  triggered: boolean;
  targetType: 'atom' | 'bond' | null;
  targetId: string | null;
}

const GRID_SIZE = 20;
const ATOM_RADIUS = 20;
const BOND_WIDTH = 4;
const HIT_TOLERANCE = 12;

const CanvasEditor: React.FC<CanvasEditorProps> = ({ isPreview = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startAtomId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [floatToolbar, setFloatToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetType: 'atom' | 'bond' | null;
    targetId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    targetType: null,
    targetId: null
  });
  const longPressRef = useRef<LongPressState>({
    timer: null,
    triggered: false,
    targetType: null,
    targetId: null
  });

  const {
    atoms,
    bonds,
    selectedAtomId,
    selectedBondId,
    addAtom,
    addBond,
    selectAtom,
    selectBond,
    switchBondType,
    deleteSelected,
    updateAtomPosition,
    changeAtomElement,
    changeBondType,
    atomAnimations,
    bondAnimations
  } = useAtomsStore();

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const hitTestAtom = useCallback((x: number, y: number): Atom | null => {
    for (let i = atoms.length - 1; i >= 0; i--) {
      const atom = atoms[i];
      const dx = x - atom.x;
      const dy = y - atom.y;
      if (dx * dx + dy * dy <= (ATOM_RADIUS + HIT_TOLERANCE) * (ATOM_RADIUS + HIT_TOLERANCE)) {
        return atom;
      }
    }
    return null;
  }, [atoms]);

  const hitTestBond = useCallback((x: number, y: number): Bond | null => {
    for (let i = bonds.length - 1; i >= 0; i--) {
      const bond = bonds[i];
      const fromAtom = atoms.find(a => a.id === bond.from);
      const toAtom = atoms.find(a => a.id === bond.to);
      if (!fromAtom || !toAtom) continue;

      const A = x - fromAtom.x;
      const B = y - fromAtom.y;
      const C = toAtom.x - fromAtom.x;
      const D = toAtom.y - fromAtom.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = lenSq !== 0 ? dot / lenSq : -1;

      let xx, yy;

      if (param < 0) {
        xx = fromAtom.x;
        yy = fromAtom.y;
      } else if (param > 1) {
        xx = toAtom.x;
        yy = toAtom.y;
      } else {
        xx = fromAtom.x + param * C;
        yy = fromAtom.y + param * D;
      }

      const dx = x - xx;
      const dy = y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= HIT_TOLERANCE) {
        return bond;
      }
    }
    return null;
  }, [atoms, bonds]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvasSize.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvasSize.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  }, [canvasSize]);

  const drawBond = useCallback((ctx: CanvasRenderingContext2D, bond: Bond, time: number) => {
    const fromAtom = atoms.find(a => a.id === bond.from);
    const toAtom = atoms.find(a => a.id === bond.to);
    if (!fromAtom || !toAtom) return;

    const isSelected = bond.id === selectedBondId;
    const anim = bondAnimations.get(bond.id);
    let alpha = 1;
    let flashAlpha = 0;

    if (anim) {
      const elapsed = time - anim.startTime;
      if (anim.type === 'connect') {
        if (elapsed < 300) {
          const phase = Math.floor(elapsed / 150);
          flashAlpha = phase % 2 === 0 ? 0.8 : 0;
        }
      } else if (anim.type === 'switch') {
        if (elapsed < 200) {
          alpha = 1 - (elapsed / 200) * 0.3;
        }
      }
    }

    const dx = toAtom.x - fromAtom.x;
    const dy = toAtom.y - fromAtom.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;

    const baseColor = isSelected ? '#00d4ff' : '#555555';

    const drawLine = (offset: number, lineWidth: number) => {
      const startX = fromAtom.x + nx * offset;
      const startY = fromAtom.y + ny * offset;
      const endX = toAtom.x + nx * offset;
      const endY = toAtom.y + ny * offset;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = alpha;
      ctx.stroke();

      if (flashAlpha > 0) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = lineWidth + 4;
        ctx.strokeStyle = `rgba(0, 212, 255, ${flashAlpha})`;
        ctx.globalAlpha = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const spacing = 6;
    if (bond.type === 1) {
      drawLine(0, BOND_WIDTH);
    } else if (bond.type === 2) {
      drawLine(-spacing / 2, BOND_WIDTH * 0.7);
      drawLine(spacing / 2, BOND_WIDTH * 0.7);
    } else if (bond.type === 3) {
      drawLine(-spacing, BOND_WIDTH * 0.5);
      drawLine(0, BOND_WIDTH * 0.5);
      drawLine(spacing, BOND_WIDTH * 0.5);
    }
  }, [atoms, selectedBondId, bondAnimations]);

  const drawAtom = useCallback((ctx: CanvasRenderingContext2D, atom: Atom, time: number) => {
    const anim = atomAnimations.get(atom.id);
    let bounceOffset = 0;
    let scale = 1;

    if (anim) {
      const elapsed = time - anim.startTime;
      if (anim.type === 'bounce' && elapsed < 400) {
        const t = elapsed / 400;
        bounceOffset = Math.sin(t * Math.PI) * 5 * (1 - t);
      }
    }

    const isSelected = atom.id === selectedAtomId;
    const drawY = atom.y - bounceOffset;

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(atom.x, drawY, ATOM_RADIUS + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time / 50;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(atom.x, drawY, ATOM_RADIUS + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.fill();
    }

    const gradient = ctx.createRadialGradient(
      atom.x - 5, drawY - 5, 0,
      atom.x, drawY, ATOM_RADIUS
    );
    gradient.addColorStop(0, lightenColor(atom.color, 30));
    gradient.addColorStop(0.7, atom.color);
    gradient.addColorStop(1, darkenColor(atom.color, 20));

    ctx.beginPath();
    ctx.arc(atom.x, drawY, ATOM_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(atom.x, drawY, ATOM_RADIUS * scale, 0, Math.PI * 2);
    ctx.strokeStyle = darkenColor(atom.color, 30);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `bold ${ATOM_RADIUS * 0.75}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isLightColor(atom.color) ? '#333333' : '#ffffff';
    ctx.fillText(atom.element, atom.x, drawY);

    ctx.font = `${ATOM_RADIUS * 0.4}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = isLightColor(atom.color) ? 'rgba(51, 51, 51, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(String(atom.atomicNumber), atom.x, drawY + ATOM_RADIUS * 0.55);
  }, [selectedAtomId, atomAnimations]);

  const drawDragLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!dragState.isDragging || !dragState.startAtomId) return;

    const startAtom = atoms.find(a => a.id === dragState.startAtomId);
    if (!startAtom) return;

    ctx.beginPath();
    ctx.moveTo(startAtom.x, startAtom.y);
    ctx.lineTo(dragState.currentX, dragState.currentY);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [dragState, atoms]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const time = performance.now();

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (!isPreview) {
      drawGrid(ctx);
    }

    bonds.forEach(bond => drawBond(ctx, bond, time));
    drawDragLine(ctx);
    atoms.forEach(atom => drawAtom(ctx, atom, time));

    animationFrameRef.current = requestAnimationFrame(render);
  }, [canvasSize, isPreview, drawGrid, drawBond, drawAtom, drawDragLine, atoms, bonds]);

  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      setCanvasSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [render]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = performance.now();
      useAtomsStore.setState(state => {
        const newAtomAnims = new Map(state.atomAnimations);
        const newBondAnims = new Map(state.bondAnimations);

        for (const [id, anim] of state.atomAnimations) {
          if (now - anim.startTime > 500) {
            newAtomAnims.delete(id);
          }
        }
        for (const [id, anim] of state.bondAnimations) {
          if (now - anim.startTime > 500) {
            newBondAnims.delete(id);
          }
        }

        if (newAtomAnims.size !== state.atomAnimations.size ||
            newBondAnims.size !== state.bondAnimations.size) {
          return {
            atomAnimations: newAtomAnims,
            bondAnimations: newBondAnims
          };
        }
        return {};
      });
    }, 100);

    return () => clearInterval(cleanupInterval);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPreview) return;

    const { x, y } = getMousePos(e);
    const hitAtom = hitTestAtom(x, y);
    const hitBond = hitTestBond(x, y);

    setFloatToolbar({ visible: false, x: 0, y: 0, targetType: null, targetId: null });

    longPressRef.current = {
      timer: window.setTimeout(() => {
        longPressRef.current.triggered = true;
        if (hitAtom) {
          setFloatToolbar({
            visible: true,
            x,
            y,
            targetType: 'atom',
            targetId: hitAtom.id
          });
          selectAtom(hitAtom.id);
        } else if (hitBond) {
          setFloatToolbar({
            visible: true,
            x,
            y,
            targetType: 'bond',
            targetId: hitBond.id
          });
          selectBond(hitBond.id);
        }
      }, 500),
      triggered: false,
      targetType: hitAtom ? 'atom' : hitBond ? 'bond' : null,
      targetId: hitAtom?.id || hitBond?.id || null
    };

    if (hitAtom) {
      selectAtom(hitAtom.id);
      setDragState({
        isDragging: true,
        startAtomId: hitAtom.id,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
    } else if (hitBond) {
      selectBond(hitBond.id);
    } else {
      selectAtom(null);
      selectBond(null);
      addAtom(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPreview) return;

    const { x, y } = getMousePos(e);

    if (dragState.isDragging) {
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5
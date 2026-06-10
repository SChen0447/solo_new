/**
 * Canvas 虚拟走廊组件
 *
 * 核心功能：
 * 1. Canvas 2D 渲染走廊场景（径向渐变背景、墙壁砖纹、木地板、裱框图像）
 * 2. 鼠标拖拽/滚轮移动视角 + 拖拽惯性（requestAnimationFrame实现，松开后0.5秒减速）
 * 3. 记忆气泡系统：
 *    - 双击创建气泡，可输入文字（最多50字）
 *    - 未保存气泡：向上漂浮-0.3px/帧 + 水平偏移±0.1px随机 + 20-30px正弦变化(2秒周期)
 *    - 已保存气泡：固定位置但有轻微漂浮动画
 * 4. 图像进入/离开视野：淡入+上移20px动画（0.6秒 ease-out）
 *
 * 数据流向（接收→回调）：
 * - 接收 props: exhibition(展览数据)、initialBubbles(已保存气泡)
 * - 回调 props: onBubbleSave(x,y,text) → 调用后端 saveBubble API → 刷新气泡列表
 * - 内部状态：canvasX(视角偏移)、bubbles(渲染中的气泡)、dragging状态
 *
 * 调用关系：
 * ViewExhibition 页面 → ExhibitionCanvas
 *   → 初始化加载气泡
 *   → 用户交互 → onBubbleSave 回调 → API POST /api/bubbles → 更新本地气泡
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Bubble, ImageItem, EmotionTheme } from '../types';
import { getThemeGradient } from '../utils/theme';
import { saveBubble } from '../api/client';

interface Props {
  exhibition: {
    id: string;
    name: string;
    theme: EmotionTheme;
    images: ImageItem[];
  };
  initialBubbles: Bubble[];
  onToast: (type: 'success' | 'error', msg: string) => void;
}

/**
 * 运行时气泡对象（比数据库结构多了动画属性）
 */
interface RuntimeBubble {
  id: string;
  baseX: number;       // 基础X坐标（已保存气泡固定）
  baseY: number;       // 基础Y坐标
  currentX: number;    // 当前渲染X（用于未保存气泡的漂浮）
  currentY: number;
  text: string;
  saved: boolean;      // 是否已保存
  size: number;        // 当前尺寸 (20~30px间正弦)
  bornAt: number;      // 创建时间戳 (ms)
  editMode: boolean;   // 是否处于编辑状态（输入文字）
}

const WALL_LEFT_MARGIN = 100;    // 左墙起始X（相对走廊）
const WALL_RIGHT_MARGIN = 100;   // 右墙
const IMAGE_SPACING = 600;       // 相邻图片间距
const IMAGE_WIDTH = 400;
const IMAGE_HEIGHT = 300;
const FRAME_WIDTH = 4;           // 画框边框
const INERTIA_DURATION = 500;    // 惯性滑动时长 ms (0.5秒)

const ExhibitionCanvas: React.FC<Props> = ({ exhibition, initialBubbles, onToast }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // =============== 渲染相关 ref（避免闭包问题） ===============
  const canvasXRef = useRef(0);                    // 当前视角偏移
  const velocityRef = useRef(0);                   // 当前拖拽速度（像素/秒，用于惯性）
  const lastMoveTimeRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartCanvasXRef = useRef(0);
  const lastClickTimeRef = useRef(0);              // 用于双击检测

  const rafIdRef = useRef<number | null>(null);    // 动画帧 id
  const sizeRef = useRef({ w: 1200, h: 700 });

  // 气泡数组用 ref 管理，动画循环直接读 ref 避免 React 状态更新开销
  const bubblesRef = useRef<RuntimeBubble[]>([]);
  // 用于强制刷新编辑输入框的 React state
  const [, setTick] = useState(0);
  const forceRefresh = () => setTick(t => t + 1);

  // 已加载图片缓存
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // =============== 初始化气泡 ===============
  useEffect(() => {
    bubblesRef.current = initialBubbles.map(b => ({
      id: b.id,
      baseX: b.x,
      baseY: b.y,
      currentX: b.x,
      currentY: b.y,
      text: b.text,
      saved: true,
      size: 25,
      bornAt: Date.now(),
      editMode: false,
    }));
    forceRefresh();
  }, [initialBubbles]);

  // =============== 预加载图片 ===============
  useEffect(() => {
    for (const img of exhibition.images) {
      if (loadedImagesRef.current.has(img.url)) continue;
      const el = new Image();
      el.src = img.url;
      el.onload = () => {
        loadedImagesRef.current.set(img.url, el);
      };
    }
  }, [exhibition.images]);

  // =============== 画布尺寸自适应 ===============
  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = Math.max(600, window.innerHeight - 120);
      sizeRef.current = { w, h };
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // =============== 惯性 + 气泡动画 渲染循环 ===============
  useEffect(() => {
    let last = performance.now();
    // 惯性动画
    let inertiaStart = 0;          // 惯性开始时间
    let inertiaStartVelocity = 0;  // 初始速度
    let isInertiaActive = false;

    const loop = (now: number) => {
      const dt = Math.min(64, now - last); // ms，限制最大步长
      last = now;

      // ---------- 惯性更新 ----------
      if (isInertiaActive) {
        const elapsed = now - inertiaStart;
        if (elapsed >= INERTIA_DURATION) {
          isInertiaActive = false;
          velocityRef.current = 0;
        } else {
          const t = elapsed / INERTIA_DURATION; // 0~1
          // ease-out：从 1 -> 0
          const ease = 1 - Math.pow(1 - t, 3);
          const currentVel = inertiaStartVelocity * (1 - ease);
          canvasXRef.current += (currentVel * dt) / 1000;
        }
      }

      // ---------- 气泡动画更新 ----------
      updateBubblesAnimation(now);

      // ---------- 渲染 ----------
      render();

      rafIdRef.current = requestAnimationFrame(loop);
    };

    // 监听拖拽结束以启动惯性
    const onPointerUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = 'default';
        // 速度够大才启动惯性
        if (Math.abs(velocityRef.current) > 50) {
          isInertiaActive = true;
          inertiaStart = performance.now();
          inertiaStartVelocity = velocityRef.current;
        }
      }
    };
    window.addEventListener('pointerup', onPointerUp);

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('pointerup', onPointerUp);
    };
    // eslint-disable-next-line
  }, []);

  // =============== 气泡动画更新函数 ===============
  // 未保存气泡：
  //   - 向上漂浮 -0.3px/帧
  //   - 水平随机偏移 ±0.1px
  //   - 大小在20~30px之间正弦变化，周期2秒
  // 已保存气泡：
  //   - 轻微上下漂浮动画（给固定位置一点呼吸感）
  //   - 大小正弦变化
  const updateBubblesAnimation = (now: number) => {
    const twoPi = Math.PI * 2;
    for (const b of bubblesRef.current) {
      if (b.editMode) continue; // 编辑中不漂

      const elapsedMs = now - b.bornAt;
      const t = elapsedMs / 1000; // 秒

      // 尺寸：正弦，20~30px，周期 2 秒
      b.size = 25 + 5 * Math.sin(t * (twoPi / 2));

      if (!b.saved) {
        // 未保存的气泡持续向上漂浮
        b.currentY -= 0.3;
        // 水平随机 ±0.1px （用确定性噪声，避免跳变）
        b.currentX += (Math.sin(t * 3.14159 + b.bornAt) * 0.1);
      } else {
        // 已保存的气泡轻微漂浮呼吸
        const floatY = Math.sin(t * (twoPi / 3)) * 4;
        const floatX = Math.cos(t * (twoPi / 4)) * 2;
        b.currentX = b.baseX + floatX;
        b.currentY = b.baseY + floatY;
      }
    }
  };

  // =============== 场景渲染函数 ===============
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const cx = canvasXRef.current;

    // ---------- 1. 背景径向渐变 ----------
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, '#1a1a33');
    bgGrad.addColorStop(1, '#0f0f23');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ---------- 2. 地板（深棕色+细光泽条纹） ----------
    const floorY = h * 0.75;
    const floorH = h - floorY;
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, floorY, w, floorH);
    // 木纹条纹
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const yy = floorY + (i / 30) * floorH;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    // 光泽条
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < 15; i++) {
      const yy = floorY + ((i * 2 + 1) / 30) * floorH;
      ctx.fillRect(0, yy, w, 2);
    }

    // ---------- 3. 墙壁区域（上半部分）+ 砖纹 ----------
    const wallTop = 0;
    const wallBottom = floorY;
    // 极细砖纹：垂直线条，透明度0.03，间距30px
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const brickSpacing = 30;
    const startXOffset = -((cx - WALL_LEFT_MARGIN) % brickSpacing);
    for (let sx = startXOffset; sx < w; sx += brickSpacing) {
      ctx.beginPath();
      ctx.moveTo(sx, wallTop);
      ctx.lineTo(sx, wallBottom);
      ctx.stroke();
    }
    // 水平线砖纹
    for (let y = wallTop; y < wallBottom; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // ---------- 4. 渲染图像（裱框画） ----------
    const themeGradient = getThemeGradient(exhibition.theme);
    // 每张图位置：交替左右墙？用户需求是"左右两侧墙上按顺序悬挂"
    // 这里按顺序交替：第0张左，第1张右，第2张左...
    // 走廊长度方向为 X 轴
    for (let i = 0; i < exhibition.images.length; i++) {
      const img = exhibition.images[i];
      // 走廊坐标下的X
      const corridorX = WALL_LEFT_MARGIN + 200 + i * IMAGE_SPACING;
      // 屏幕坐标下的 X
      const screenX = corridorX - cx;
      // 视口裁剪：太左或太右就不渲染
      if (screenX < -IMAGE_WIDTH - 200 || screenX > w + 200) continue;

      // 左右墙交替
      const isLeftWall = i % 2 === 0;
      const baseY = wallBottom * 0.2; // 墙壁中上部

      // 淡入动画：根据进入视野的程度计算 0~1
      // 进入阈值：screenX 在 [-IMAGE_WIDTH, w] 之间开始渐显
      const enterProgress = Math.max(0, Math.min(1, (screenX + IMAGE_WIDTH) / (w + IMAGE_WIDTH)));
      const leaveProgress = screenX > w * 0.85 ? Math.max(0, 1 - (screenX - w * 0.85) / (w * 0.15)) : 1;
      const visible = enterProgress * leaveProgress;
      const opacity = visible;
      // 向上移动20px动画
      const offsetY = (1 - visible) * 20;

      const imgEl = loadedImagesRef.current.get(img.url);

      // 裱框 + 图片
      const drawX = screenX;
      const drawY = baseY + offsetY;
      ctx.globalAlpha = opacity;

      // 画框阴影
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(
        drawX - FRAME_WIDTH,
        drawY - FRAME_WIDTH,
        IMAGE_WIDTH + FRAME_WIDTH * 2,
        IMAGE_HEIGHT + FRAME_WIDTH * 2,
      );
      ctx.restore();

      // 画框边框
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = FRAME_WIDTH;
      ctx.strokeRect(
        drawX,
        drawY,
        IMAGE_WIDTH,
        IMAGE_HEIGHT,
      );

      // 图像内容
      if (imgEl && imgEl.complete) {
        // 裁剪居中显示
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawX, drawY, IMAGE_WIDTH, IMAGE_HEIGHT);
        ctx.clip();
        const ratio = imgEl.width / imgEl.height;
        let dw = IMAGE_WIDTH, dh = IMAGE_WIDTH / ratio;
        if (dh < IMAGE_HEIGHT) { dh = IMAGE_HEIGHT; dw = IMAGE_HEIGHT * ratio; }
        const dx = drawX + (IMAGE_WIDTH - dw) / 2;
        const dy = drawY + (IMAGE_HEIGHT - dh) / 2;
        ctx.drawImage(imgEl, dx, dy, dw, dh);
        ctx.restore();
      } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(drawX, drawY, IMAGE_WIDTH, IMAGE_HEIGHT);
        ctx.fillStyle = '#667eea';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('加载中...', drawX + IMAGE_WIDTH / 2, drawY + IMAGE_HEIGHT / 2);
      }

      // 图像下描述文字：14px #d4d4d4
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#d4d4d4';
      ctx.font = '14px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        (img.description || '').slice(0, 40),
        drawX + IMAGE_WIDTH / 2,
        drawY + IMAGE_HEIGHT + 32,
      );

      ctx.globalAlpha = 1;
    }

    // ---------- 5. 渲染记忆气泡 ----------
    for (const b of bubblesRef.current) {
      const screenX = b.currentX - cx;
      // 视口裁剪
      if (screenX < -100 || screenX > w + 100) continue;
      if (b.editMode) continue; // 编辑模式用DOM input，Canvas不绘制

      const r = b.size;
      const alpha = b.saved ? 1 : 0.9;

      // 内发光 + 半透明白色背景
      ctx.save();
      ctx.globalAlpha = alpha;
      // 阴影（内发光模拟）
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 2;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(screenX, b.currentY, r, 0, Math.PI * 2);
      ctx.fill();
      // 边框
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 气泡内文字（简化：显示在气泡旁tooltip）
      if (b.text) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        const textY = b.currentY + r + 16;
        // 半透明背景给文字
        const tw = ctx.measureText(b.text).width + 16;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(screenX - tw / 2, textY - 12, tw, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(b.text, screenX, textY + 3);
        ctx.restore();
      }
    }

    // ---------- 6. 悬浮提示：拖动手势 ----------
    // （可选，略）
  }, [exhibition]);

  // =============== 鼠标事件：拖拽/滚轮/双击创建气泡 ===============

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const pointerScreenX = e.clientX - rect.left;
    const pointerScreenY = e.clientY - rect.top;

    // 双击检测（时间<400ms且坐标接近）
    const now = performance.now();
    if (now - lastClickTimeRef.current < 400) {
      // 双击：创建气泡
      createBubbleAt(pointerScreenX + canvasXRef.current, pointerScreenY);
      lastClickTimeRef.current = 0;
      return;
    }
    lastClickTimeRef.current = now;

    // 开始拖拽
    draggingRef.current = true;
    dragStartXRef.current = pointerScreenX;
    dragStartCanvasXRef.current = canvasXRef.current;
    velocityRef.current = 0;
    lastMoveXRef.current = pointerScreenX;
    lastMoveTimeRef.current = now;

    document.body.style.cursor = 'grabbing';
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;

    if (draggingRef.current) {
      const dx = sx - dragStartXRef.current;
      canvasXRef.current = dragStartCanvasXRef.current - dx;
      // 限制不能越界太左
      const maxLeft = -500;
      const totalLen = WALL_LEFT_MARGIN + 200 + (exhibition.images.length) * IMAGE_SPACING;
      const maxRight = Math.max(0, totalLen - 400);
      if (canvasXRef.current < maxLeft) canvasXRef.current = maxLeft;
      if (canvasXRef.current > maxRight) canvasXRef.current = maxRight;

      // 记录瞬时速度
      const now = performance.now();
      const dt = now - lastMoveTimeRef.current;
      if (dt > 0) {
        velocityRef.current = ((lastMoveXRef.current - sx) / dt) * 1000;
      }
      lastMoveXRef.current = sx;
      lastMoveTimeRef.current = now;
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // 滚轮控制视角
    canvasXRef.current += e.deltaY * 0.6 + e.deltaX * 0.6;
    const maxLeft = -500;
    const totalLen = WALL_LEFT_MARGIN + 200 + (exhibition.images.length) * IMAGE_SPACING;
    const maxRight = Math.max(0, totalLen - 400);
    if (canvasXRef.current < maxLeft) canvasXRef.current = maxLeft;
    if (canvasXRef.current > maxRight) canvasXRef.current = maxRight;
  };

  // =============== 气泡创建/编辑/保存 ===============

  const createBubbleAt = (x: number, y: number) => {
    const id = 'tmp_' + Date.now() + Math.random();
    const newBubble: RuntimeBubble = {
      id,
      baseX: x,
      baseY: y,
      currentX: x,
      currentY: y,
      text: '',
      saved: false,
      size: 25,
      bornAt: performance.now(),
      editMode: true,
    };
    bubblesRef.current.push(newBubble);
    forceRefresh();
  };

  /**
   * 保存气泡：调用API，成功后将气泡转为 saved 状态（固定位置轻微漂浮）
   * 失败则移除气泡 + 红色错误提示条
   */
  const onBubbleSubmit = async (bubbleId: string) => {
    const idx = bubblesRef.current.findIndex(b => b.id === bubbleId);
    if (idx === -1) return;
    const b = bubblesRef.current[idx];
    const trimmed = b.text.trim();
    if (!trimmed) {
      // 空的直接取消
      bubblesRef.current.splice(idx, 1);
      forceRefresh();
      return;
    }
    if (trimmed.length > 50) {
      onToast('error', '气泡文字最多50字');
      return;
    }
    try {
      const saved = await saveBubble({
        exhibitionId: exhibition.id,
        x: b.baseX,
        y: b.baseY,
        text: trimmed,
      });
      // 转为已保存气泡
      bubblesRef.current[idx] = {
        id: saved.id,
        baseX: saved.x,
        baseY: saved.y,
        currentX: saved.x,
        currentY: saved.y,
        text: saved.text,
        saved: true,
        size: 25,
        bornAt: performance.now(),
        editMode: false,
      };
      onToast('success', '记忆气泡已保存');
      forceRefresh();
    } catch (err: any) {
      bubblesRef.current.splice(idx, 1);
      onToast('error', err.message || '保存气泡失败');
      forceRefresh();
    }
  };

  const onBubbleCancel = (bubbleId: string) => {
    const idx = bubblesRef.current.findIndex(b => b.id === bubbleId);
    if (idx !== -1) {
      bubblesRef.current.splice(idx, 1);
      forceRefresh();
    }
  };

  const onBubbleTextChange = (bubbleId: string, text: string) => {
    const b = bubblesRef.current.find(x => x.id === bubbleId);
    if (b) { b.text = text; }
  };

  // =============== 渲染编辑中的气泡（DOM overlay） ===============
  const renderEditingBubbles = () => {
    const { w } = sizeRef.current;
    return bubblesRef.current
      .filter(b => b.editMode)
      .map(b => {
        const screenX = b.currentX - canvasXRef.current;
        // 限制不超出视口范围
        const clampedX = Math.max(100, Math.min(w - 100, screenX));
        return (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: clampedX - 140,
              top: b.currentY - 20,
              width: '280px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: 'inset 0 0 2px rgba(255,255,255,0.3), 0 0 2px rgba(255,255,255,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <input
                autoFocus
                type="text"
                maxLength={50}
                placeholder="写下你的记忆（最多50字）..."
                value={b.text}
                onChange={(e) => onBubbleTextChange(b.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onBubbleSubmit(b.id);
                  if (e.key === 'Escape') onBubbleCancel(b.id);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  marginBottom: '10px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onBubbleCancel(b.id)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ccc',
                    fontSize: '13px',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => onBubbleSubmit(b.id)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: getThemeGradient(exhibition.theme),
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  保存气泡
                </button>
              </div>
              <div style={{
                textAlign: 'right',
                marginTop: '8px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
              }}>
                {b.text.length}/50
              </div>
            </div>
          </div>
        );
      });
  };

  // =============== JSX ===============
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor: draggingRef.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onWheel={onWheel}
      />
      {/* 编辑中的气泡用 DOM 输入框覆盖在 Canvas 上 */}
      {renderEditingBubbles()}

      {/* 底部提示 */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '13px',
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.3)',
        padding: '6px 16px',
        borderRadius: '20px',
      }}>
        💡 拖动鼠标/滚轮浏览走廊 &nbsp; · &nbsp; 双击任意位置创建记忆气泡
      </div>
    </div>
  );
};

export default ExhibitionCanvas;

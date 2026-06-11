import { useMemo } from 'react';
import type { Block, Viewport } from '../utils/constants';

export function useVirtualization(
  blocks: Block[],
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
  padding: number = 200
): Block[] {
  return useMemo(() => {
    if (containerWidth === 0 || containerHeight === 0) return blocks;

    const scale = viewport.scale;
    const viewLeft = -viewport.offsetX / scale - padding / scale;
    const viewTop = -viewport.offsetY / scale - padding / scale;
    const viewRight = viewLeft + (containerWidth + padding * 2) / scale;
    const viewBottom = viewTop + (containerHeight + padding * 2) / scale;

    return blocks.filter((block) => {
      const rad = Math.abs((block.rotation * Math.PI) / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const halfW = block.width / 2;
      const halfH = block.height / 2;
      const rotatedHalfW = halfW * cos + halfH * sin;
      const rotatedHalfH = halfW * sin + halfH * cos;
      const cx = block.x + halfW;
      const cy = block.y + halfH;
      const blockLeft = cx - rotatedHalfW;
      const blockRight = cx + rotatedHalfW;
      const blockTop = cy - rotatedHalfH;
      const blockBottom = cy + rotatedHalfH;

      return (
        blockRight >= viewLeft &&
        blockLeft <= viewRight &&
        blockBottom >= viewTop &&
        blockTop <= viewBottom
      );
    });
  }, [blocks, viewport, containerWidth, containerHeight, padding]);
}

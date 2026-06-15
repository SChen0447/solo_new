import { useEffect, useMemo, useRef } from 'react';
import type { ColorData, VariantParams } from '../../types';
import PaletteRenderer from '../color-extraction/PaletteRenderer';
import { generateVariants } from './VariantGenerator';

interface VariantPanelProps {
  baseColor: ColorData | null;
  params: VariantParams;
  variants: ColorData[];
  onParamsChange: (params: Partial<VariantParams>) => void;
  onVariantsChange: (variants: ColorData[]) => void;
  onCopy?: (hex: string, key: string) => void;
  copiedKey?: string | null;
  selectedVariantIndex: number;
  onSelectVariant: (index: number) => void;
}

export default function VariantPanel({
  baseColor,
  params,
  variants,
  onParamsChange,
  onVariantsChange,
  onCopy,
  copiedKey,
  selectedVariantIndex,
  onSelectVariant,
}: VariantPanelProps) {
  const rafRef = useRef<number | null>(null);
  const pendingParamsRef = useRef<VariantParams>(params);

  useEffect(() => {
    pendingParamsRef.current = params;
    if (!baseColor) return;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const newVariants = generateVariants(baseColor, pendingParamsRef.current, 5);
      onVariantsChange(newVariants);
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [baseColor, params, onVariantsChange]);

  const sliders = useMemo(
    () => [
      {
        key: 'hueShift' as const,
        label: '色相偏移',
        unit: '°',
        min: -30,
        max: 30,
        step: 1,
        color: '#d0d0d0',
      },
      {
        key: 'saturationShift' as const,
        label: '饱和度变化',
        unit: '%',
        min: -20,
        max: 20,
        step: 1,
        color: '#d0d0d0',
      },
      {
        key: 'lightnessShift' as const,
        label: '明度变化',
        unit: '%',
        min: -20,
        max: 20,
        step: 1,
        color: '#d0d0d0',
      },
    ],
    []
  );

  if (!baseColor) {
    return (
      <div className="variant-panel empty">
        <h3 className="variant-title">色彩变体生成器</h3>
        <div className="variant-empty-hint">
          <p>请先在上方色卡中选择一个主色</p>
          <p className="variant-sub">调节滑块将实时生成渐变变体</p>
        </div>
      </div>
    );
  }

  return (
    <div className="variant-panel">
      <div className="variant-header">
        <h3 className="variant-title">色彩变体生成器</h3>
        <div className="variant-base">
          <div
          className="variant-base-swatch"
          style={{ background: baseColor.hex }}
        />
        <div>
          <div className="variant-base-name">{baseColor.name}</div>
          <div className="variant-base-hex">{baseColor.hex}</div>
        </div>
      </div>

      <div className="variant-sliders">
        {sliders.map((s) => (
          <div key={s.key} className="slider-row">
            <div className="slider-label">
              <span>{s.label}</span>
            </div>
            <div className="slider-control">
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key]}
                onChange={(e) =>
                  onParamsChange({
                    [s.key]: Number(e.target.value),
                  })
                }
                className="hue-slider"
              />
              <div className="slider-value">
                {params[s.key] > 0 ? '+' : ''}
                {params[s.key]}
                {s.unit}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="variant-output">
        <p className="variant-output-title">变体色板</p>
        <PaletteRenderer
          colors={variants}
          selectedIndex={selectedVariantIndex}
          onSelect={onSelectVariant}
          onCopy={onCopy}
          copiedKey={copiedKey}
          section="variant"
        />
      </div>
    </div>
  );
}

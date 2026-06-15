import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAnimationStore, AnimationParams, AnimationPreset } from '../store/animationStore';

const buildTransition = (params: AnimationParams) => {
  const easeMap: Record<string, string> = {
    linear: 'linear',
    ease: 'easeInOut',
    'ease-in': 'easeIn',
    'ease-out': 'easeOut',
    'ease-in-out': 'easeInOut',
  };

  let framerEase: string | number[] = easeMap[params.easing] || 'easeInOut';

  if (params.easing.startsWith('cubic-bezier')) {
    const match = params.easing.match(/cubic-bezier\(([^)]+)\)/);
    if (match) {
      framerEase = match[1].split(',').map(Number) as [number, number, number, number];
    }
  }

  const isAlternate = params.direction === 'alternate' || params.direction === 'alternate-reverse';
  const repeatCount = params.iterationCount === 0 ? Infinity : params.iterationCount - 1;

  return {
    duration: params.duration,
    delay: params.delay,
    ease: framerEase,
    repeat: repeatCount,
    repeatType: isAlternate ? ('reverse' as const) : ('loop' as const),
    repeatDelay: 0,
  };
};

const buildMotionProps = (preset: AnimationPreset, params: AnimationParams) => {
  const transition = buildTransition(params);
  return {
    initial: preset.framerMotion.initial as Record<string, unknown>,
    animate: preset.framerMotion.animate as Record<string, unknown>,
    transition,
  };
};

const PreviewBox: React.FC<{
  preset: AnimationPreset;
  params: AnimationParams;
  color: string;
  name: string;
  elementId: string;
  onClose: () => void;
  index: number;
  total: number;
}> = ({ preset, params, color, name, elementId, onClose, index, total }) => {
  const motionProps = useMemo(() => buildMotionProps(preset, params), [preset, params]);

  const isGradientScroll = preset.id === 'gradientScroll';

  const offset = (index - (total - 1) / 2) * 80;

  return (
    <div
      style={{
        position: 'absolute',
        left: `calc(50% + ${offset}px)`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-6px',
            border: `1.5px dashed ${color}`,
            borderRadius: '10px',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
        <motion.div
          key={`${elementId}-${preset.id}-${params.duration}-${params.delay}-${params.easing}-${params.iterationCount}-${params.direction}`}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            background: isGradientScroll
              ? 'linear-gradient(270deg, #667eea, #764ba2, #f093fb, #667eea)'
              : color,
            backgroundSize: isGradientScroll ? '300% 300%' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            willChange: 'transform, opacity',
            perspective: '600px',
          }}
          initial={motionProps.initial}
          animate={motionProps.animate}
          transition={motionProps.transition}
        />
        <div style={styles.label}>
          <span style={styles.labelText}>{name}</span>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviewArea: React.FC = () => {
  const { selectedPresetId, currentParams, previewElements, presets, addPreviewElement, removePreviewElement } =
    useAnimationStore();

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  const hasMainPreview = !!selectedPresetId;

  return (
    <div style={styles.container}>
      <div style={styles.previewBg}>
        {hasMainPreview && selectedPreset && (
          <PreviewBox
            preset={selectedPreset}
            params={currentParams}
            color={selectedPreset.color}
            name={selectedPreset.name}
            elementId="main"
            index={previewElements.length > 0 ? -1 : 0}
            total={previewElements.length > 0 ? previewElements.length + 1 : 1}
          />
        )}

        {previewElements.map((el, idx) => {
          const elPreset = presets.find((p) => p.id === el.presetId);
          if (!elPreset) return null;
          return (
            <PreviewBox
              key={el.id}
              preset={elPreset}
              params={el.params}
              color={el.color}
              name={el.name}
              elementId={el.id}
              onClose={() => removePreviewElement(el.id)}
              index={hasMainPreview ? idx + 1 : idx}
              total={hasMainPreview ? previewElements.length + 1 : previewElements.length}
            />
          );
        })}

        {!hasMainPreview && previewElements.length === 0 && (
          <div style={styles.placeholder}>
            <div style={styles.placeholderIcon}>✦</div>
            <div style={styles.placeholderText}>选择一个动画预设开始预览</div>
          </div>
        )}
      </div>

      <div style={styles.toolbar}>
        <button
          onClick={addPreviewElement}
          disabled={!selectedPresetId || previewElements.length >= 4}
          style={{
            ...styles.addBtn,
            opacity: !selectedPresetId || previewElements.length >= 4 ? 0.4 : 1,
            cursor: !selectedPresetId || previewElements.length >= 4 ? 'not-allowed' : 'pointer',
          }}
        >
          + 添加对比元素 ({previewElements.length}/4)
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  previewBg: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '8px',
    position: 'relative',
    overflow: 'hidden',
    minHeight: '300px',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  placeholderIcon: {
    fontSize: '48px',
    color: '#333',
    opacity: 0.5,
  },
  placeholderText: {
    color: '#555',
    fontSize: '14px',
  },
  label: {
    position: 'absolute',
    top: '-8px',
    left: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    zIndex: 10,
  },
  labelText: {
    background: '#000',
    opacity: 1,
    color: '#fff',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    lineHeight: '1.2',
  },
  closeBtn: {
    width: '10px',
    height: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    fontSize: '7px',
    cursor: 'pointer',
    borderRadius: '2px',
    padding: 0,
    lineHeight: 1,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0 0',
  },
  addBtn: {
    background: '#2a2a4a',
    color: '#e0e0e0',
    border: '1px solid #3a3a5a',
    padding: '6px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default PreviewArea;

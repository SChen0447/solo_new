import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CountdownConfig } from '../config/ConfigDataModel';
import { RemainingTime } from '../core/CountdownEngine';
import { eventBus, Events } from '../utils/EventBus';
import { configDataModel } from '../config/ConfigDataModel';
import './PreviewRenderer.css';

type Theme = 'dark' | 'light';
type PreviewBackground = 'solid' | 'stripes' | 'checkerboard';

export const PreviewRenderer: React.FC = () => {
  const [config, setConfig] = useState<CountdownConfig>(configDataModel.getConfig());
  const [remainingTime, setRemainingTime] = useState<RemainingTime>({
    totalMs: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
    isExpired: false
  });
  const [theme, setTheme] = useState<Theme>('dark');
  const [previewBg, setPreviewBg] = useState<PreviewBackground>('solid');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevValues, setPrevValues] = useState({ hours: '00', minutes: '00', seconds: '00' });

  const rafRef = useRef<number | null>(null);
  const pendingTickRef = useRef<RemainingTime | null>(null);

  useEffect(() => {
    const unsubscribeConfig = eventBus.on(Events.CONFIG_CHANGED, (newConfig: CountdownConfig) => {
      setIsTransitioning(true);
      setTimeout(() => {
        setConfig(newConfig);
        setIsTransitioning(false);
      }, 100);
    });

    const unsubscribeTick = eventBus.on(Events.TICK, (time: RemainingTime) => {
      pendingTickRef.current = time;
    });

    const unsubscribeEnded = eventBus.on(Events.TIMER_ENDED, () => {
      // Timer ended event handled by tick with isExpired flag
    });

    const animate = () => {
      if (pendingTickRef.current) {
        setRemainingTime(pendingTickRef.current);
        pendingTickRef.current = null;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      unsubscribeConfig();
      unsubscribeTick();
      unsubscribeEnded();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPrevValues({
      hours: String(remainingTime.hours).padStart(2, '0'),
      minutes: String(remainingTime.minutes).padStart(2, '0'),
      seconds: String(remainingTime.seconds).padStart(2, '0')
    });
  }, [remainingTime.hours, remainingTime.minutes, remainingTime.seconds]);

  const formatNumber = useCallback((num: number, digits: number = 2) => {
    return String(num).padStart(digits, '0');
  }, []);

  const getBackgroundStyle = useCallback(() => {
    const { backgroundColor, backgroundOpacity } = config;
    const opacity = backgroundOpacity / 100;

    if (backgroundColor.type === 'solid') {
      return {
        background: backgroundColor.color1,
        opacity
      };
    } else if (backgroundColor.type === 'linear-gradient') {
      return {
        background: `linear-gradient(${backgroundColor.angle}deg, ${backgroundColor.color1}, ${backgroundColor.color2})`,
        opacity
      };
    } else {
      return {
        background: `radial-gradient(circle, ${backgroundColor.color1}, ${backgroundColor.color2})`,
        opacity
      };
    }
  }, [config]);

  const getBorderStyle = useCallback(() => {
    const { borderStyle, borderColor, borderWidth } = config;
    if (borderStyle === 'none') return {};

    if (borderStyle === 'rounded') {
      return {
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: '12px'
      };
    }

    return {
      border: `${borderWidth}px ${borderStyle} ${borderColor}`,
      borderRadius: '4px'
    };
  }, [config]);

  const renderTimeUnit = (value: string, label: string, show: boolean, key: string) => {
    if (!show) return null;

    const isChanged = prevValues[key as keyof typeof prevValues] !== value && config.animation !== 'none';

    return (
      <div className="time-unit" key={key}>
        <div
          className={`time-value ${isChanged ? `anim-${config.animation}` : ''}`}
          style={{
            fontFamily: config.fontFamily,
            fontSize: `${config.fontSize}px`,
            color: config.textColor
          }}
        >
          {value}
        </div>
        {config.timeLabels.showHours || config.timeLabels.showMinutes || config.timeLabels.showSeconds ? (
          <span className="time-label">{label}</span>
        ) : null}
      </div>
    );
  };

  const getPreviewBgStyle = (): React.CSSProperties => {
    if (previewBg === 'solid') {
      return {
        background: theme === 'dark' ? '#1A1A2E' : '#f5f5f5'
      };
    } else if (previewBg === 'stripes') {
      const color1 = theme === 'dark' ? '#1A1A2E' : '#f5f5f5';
      const color2 = theme === 'dark' ? '#16213E' : '#e0e0e0';
      return {
        background: `repeating-linear-gradient(
          45deg,
          ${color1},
          ${color1} 10px,
          ${color2} 10px,
          ${color2} 20px
        )`
      };
    } else {
      const color1 = theme === 'dark' ? '#1A1A2E' : '#f5f5f5';
      const color2 = theme === 'dark' ? '#16213E' : '#e0e0e0';
      return {
        backgroundImage: `
          linear-gradient(45deg, ${color2} 25%, transparent 25%),
          linear-gradient(-45deg, ${color2} 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${color2} 75%),
          linear-gradient(-45deg, transparent 75%, ${color2} 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        backgroundColor: color1
      };
    }
  };

  return (
    <div className={`preview-container theme-${theme}`}>
      <div className="preview-header">
        <h2>实时预览</h2>
        <div className="theme-switcher">
          <button
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            暗色主题
          </button>
          <button
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            亮色主题
          </button>
        </div>
      </div>

      <div className="bg-selector">
        <span className="bg-label">背景预览:</span>
        <button
          className={`bg-btn ${previewBg === 'solid' ? 'active' : ''}`}
          onClick={() => setPreviewBg('solid')}
        >
          纯色
        </button>
        <button
          className={`bg-btn ${previewBg === 'stripes' ? 'active' : ''}`}
          onClick={() => setPreviewBg('stripes')}
        >
          条纹
        </button>
        <button
          className={`bg-btn ${previewBg === 'checkerboard' ? 'active' : ''}`}
          onClick={() => setPreviewBg('checkerboard')}
        >
          棋盘格
        </button>
      </div>

      <div className="preview-area" style={getPreviewBgStyle()}>
        <div
          className={`countdown-card ${isTransitioning ? 'transitioning' : ''}`}
          style={{
            ...getBackgroundStyle(),
            ...getBorderStyle()
          }}
        >
          {!remainingTime.isExpired ? (
            <>
              <div className="activity-name" style={{ color: config.textColor, fontFamily: config.fontFamily }}>
                {config.activityName}
              </div>
              <div className="time-display">
                {renderTimeUnit(formatNumber(remainingTime.hours), '时', config.timeLabels.showHours, 'hours')}
                {config.timeLabels.showHours && (config.timeLabels.showMinutes || config.timeLabels.showSeconds) && (
                  <span className="time-separator" style={{ color: config.textColor, fontSize: `${config.fontSize}px` }}>:</span>
                )}
                {renderTimeUnit(formatNumber(remainingTime.minutes), '分', config.timeLabels.showMinutes, 'minutes')}
                {config.timeLabels.showMinutes && config.timeLabels.showSeconds && (
                  <span className="time-separator" style={{ color: config.textColor, fontSize: `${config.fontSize}px` }}>:</span>
                )}
                {renderTimeUnit(formatNumber(remainingTime.seconds), '秒', config.timeLabels.showSeconds, 'seconds')}
                {config.timeLabels.showMilliseconds && (
                  <>
                    <span className="time-separator ms-separator" style={{ color: config.textColor, fontSize: `${config.fontSize * 0.7}px` }}>.</span>
                    <div className="time-unit ms-unit">
                      <div
                        className="time-value"
                        style={{
                          fontFamily: config.fontFamily,
                          fontSize: `${config.fontSize * 0.7}px`,
                          color: config.textColor
                        }}
                      >
                        {formatNumber(Math.floor(remainingTime.milliseconds / 10), 2)}
                      </div>
                      {(config.timeLabels.showHours || config.timeLabels.showMinutes || config.timeLabels.showSeconds) && (
                        <span className="time-label">毫秒</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="ended-message" style={{ color: config.textColor, fontFamily: config.fontFamily, fontSize: `${config.fontSize}px` }}>
              活动已结束
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

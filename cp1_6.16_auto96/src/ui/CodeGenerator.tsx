import React, { useState, useEffect, useRef } from 'react';
import { CountdownConfig, Timezone } from '../config/ConfigDataModel';
import { eventBus, Events } from '../utils/EventBus';
import { configDataModel } from '../config/ConfigDataModel';
import { RemainingTime } from '../core/CountdownEngine';
import './CodeGenerator.css';

export const CodeGenerator: React.FC = () => {
  const [config, setConfig] = useState<CountdownConfig>(configDataModel.getConfig());
  const [remainingTime, setRemainingTime] = useState<RemainingTime | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsubscribeConfig = eventBus.on(Events.CONFIG_CHANGED, (newConfig: CountdownConfig) => {
      setConfig(newConfig);
    });

    const unsubscribeTick = eventBus.on(Events.TICK, (time: RemainingTime) => {
      setRemainingTime(time);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeTick();
    };
  }, []);

  const parseTimezone = (timezone: Timezone): number => {
    const match = timezone.match(/UTC([+-]\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  };

  const generateCode = (): string => {
    const tzOffset = parseTimezone(config.timezone);
    
    let targetTimeExpr: string;
    if (config.useTargetTime && config.targetTime) {
      targetTimeExpr = `new Date('${config.targetTime}').getTime() - (${tzOffset} - new Date().getTimezoneOffset() / 60) * 3600000`;
    } else {
      const durationMs = (config.durationHours * 3600 + config.durationMinutes * 60 + config.durationSeconds) * 1000;
      targetTimeExpr = `Date.now() + ${durationMs}`;
    }

    const bgStyle = config.backgroundColor.type === 'solid'
      ? `background: ${config.backgroundColor.color1}; opacity: ${config.backgroundOpacity / 100};`
      : config.backgroundColor.type === 'linear-gradient'
        ? `background: linear-gradient(${config.backgroundColor.angle}deg, ${config.backgroundColor.color1}, ${config.backgroundColor.color2}); opacity: ${config.backgroundOpacity / 100};`
        : `background: radial-gradient(circle, ${config.backgroundColor.color1}, ${config.backgroundColor.color2}); opacity: ${config.backgroundOpacity / 100};`;

    let borderStyle = '';
    if (config.borderStyle !== 'none') {
      if (config.borderStyle === 'rounded') {
        borderStyle = `border: ${config.borderWidth}px solid ${config.borderColor}; border-radius: 12px;`;
      } else {
        borderStyle = `border: ${config.borderWidth}px ${config.borderStyle} ${config.borderColor}; border-radius: 4px;`;
      }
    }

    const fontUrl = `https://fonts.googleapis.com/css2?family=${config.fontFamily.replace(/ /g, '+')}&display=swap`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.activityName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontUrl}" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1A1A2E;
    }
    .countdown-container {
      text-align: center;
      padding: 40px 50px;
      ${bgStyle}
      ${borderStyle}
      font-family: '${config.fontFamily}', sans-serif;
      min-width: 300px;
    }
    .activity-name {
      font-size: 18px;
      font-weight: 600;
      color: ${config.textColor};
      margin-bottom: 20px;
      letter-spacing: 2px;
    }
    .time-display {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
    }
    .time-unit {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
    }
    .time-value {
      font-size: ${config.fontSize}px;
      font-weight: 700;
      color: ${config.textColor};
      line-height: 1;
    }
    .time-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 8px;
      font-family: system-ui, sans-serif;
      font-weight: normal;
    }
    .time-separator {
      font-size: ${config.fontSize}px;
      font-weight: 700;
      color: ${config.textColor};
      line-height: 1;
      padding-bottom: 20px;
      animation: pulse 1s ease-in-out infinite;
    }
    .ms-separator { padding-bottom: 14px; }
    .ms-unit .time-value { font-size: ${Math.round(config.fontSize * 0.7)}px; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .ended-message {
      font-size: ${config.fontSize}px;
      font-weight: 700;
      color: ${config.textColor};
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="countdown-container" id="countdown">
    <div class="activity-name">${config.activityName}</div>
    <div class="time-display" id="timeDisplay"></div>
  </div>
  <script>
  (function() {
    var targetTime = ${targetTimeExpr};
    var showHours = ${config.timeLabels.showHours};
    var showMinutes = ${config.timeLabels.showMinutes};
    var showSeconds = ${config.timeLabels.showSeconds};
    var showMilliseconds = ${config.timeLabels.showMilliseconds};

    function pad(num, len) {
      len = len || 2;
      return String(num).padStart(len, '0');
    }

    function render() {
      var now = Date.now();
      var totalMs = Math.max(0, targetTime - now);
      var isExpired = totalMs <= 0;
      var container = document.getElementById('countdown');
      var display = document.getElementById('timeDisplay');

      if (isExpired) {
        container.innerHTML = '<div class="ended-message">活动已结束</div>';
        return;
      }

      var hours = Math.floor(totalMs / 3600000);
      var minutes = Math.floor((totalMs % 3600000) / 60000);
      var seconds = Math.floor((totalMs % 60000) / 1000);
      var milliseconds = totalMs % 1000;

      var html = '';
      if (showHours) {
        html += '<div class="time-unit"><div class="time-value">' + pad(hours) + '</div><div class="time-label">时</div></div>';
      }
      if (showHours && (showMinutes || showSeconds)) {
        html += '<span class="time-separator">:</span>';
      }
      if (showMinutes) {
        html += '<div class="time-unit"><div class="time-value">' + pad(minutes) + '</div><div class="time-label">分</div></div>';
      }
      if (showMinutes && showSeconds) {
        html += '<span class="time-separator">:</span>';
      }
      if (showSeconds) {
        html += '<div class="time-unit"><div class="time-value">' + pad(seconds) + '</div><div class="time-label">秒</div></div>';
      }
      if (showMilliseconds) {
        html += '<span class="time-separator ms-separator">.</span>';
        html += '<div class="time-unit ms-unit"><div class="time-value">' + pad(Math.floor(milliseconds / 10), 2) + '</div><div class="time-label">毫秒</div></div>';
      }

      display.innerHTML = html;
    }

    render();
    var timer = setInterval(render, 50);

    function checkEnd() {
      if (Date.now() >= targetTime) {
        clearInterval(timer);
        render();
      }
    }
    var endCheck = setInterval(checkEnd, 1000);
  })();
  </script>
</body>
</html>`;
  };

  const handleCopy = () => {
    const code = generateCode();
    if (textareaRef.current) {
      textareaRef.current.value = code;
      textareaRef.current.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 1500);
      } catch (err) {
        console.error('复制失败:', err);
      }
    }
  };

  return (
    <div className="code-generator">
      <div className="generator-header">
        <h2>代码生成器</h2>
        <div className="copy-section">
          {copySuccess && <span className="copy-success">复制成功</span>}
          <button className="btn-copy" onClick={handleCopy}>
            复制代码
          </button>
        </div>
      </div>
      <div className="code-preview">
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={generateCode()}
          readOnly
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export const uiStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #app {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    background: linear-gradient(135deg, #0D1B2A 0%, #1B2838 100%);
    color: #fff;
    position: relative;
  }

  #app {
    position: relative;
  }

  canvas {
    display: block;
  }

  .stardust-left,
  .stardust-right {
    position: fixed;
    top: 0;
    width: 15%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .stardust-left {
    left: 0;
  }

  .stardust-right {
    right: 0;
  }

  .stardust-particle {
    position: absolute;
    background: #ffffff;
    border-radius: 50%;
    animation: floatUp 8s ease-in-out infinite;
  }

  @keyframes floatUp {
    0%, 100% {
      transform: translateY(0);
      opacity: 0.3;
    }
    50% {
      transform: translateY(-20px);
      opacity: 0.6;
    }
  }

  .control-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 280px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 20px;
    z-index: 100;
    border: 1px solid rgba(79, 195, 247, 0.2);
  }

  .panel-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
    color: #4FC3F7;
    letter-spacing: 1px;
  }

  .control-section {
    margin-bottom: 20px;
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #B0BEC5;
    margin-bottom: 8px;
  }

  .control-value {
    color: #FFB74D;
    font-weight: 500;
  }

  .slider-container {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .slider-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, #FFB74D, #FF8A65);
    border-radius: 3px;
    transition: width 0.05s linear;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: transparent;
    cursor: pointer;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    margin: 0;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFB74D;
    cursor: pointer;
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(255, 183, 77, 0.5);
    transition: transform 0.2s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.05);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFB74D;
    cursor: pointer;
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(255, 183, 77, 0.5);
    transition: transform 0.2s ease;
  }

  input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.05);
  }

  .planet-switches {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .planet-switch-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
  }

  .planet-color-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
    vertical-align: middle;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .switch-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 22px;
    transition: 0.2s;
  }

  .switch-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background: #fff;
    border-radius: 50%;
    transition: 0.2s;
  }

  .switch input:checked + .switch-slider {
    background: #4FC3F7;
  }

  .switch input:checked + .switch-slider:before {
    transform: translateX(18px);
  }

  .switch:hover .switch-slider {
    transform: scale(1.05);
  }

  .reset-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #4FC3F7 0%, #29B6F6 100%);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    letter-spacing: 0.5px;
  }

  .reset-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(79, 195, 247, 0.4);
  }

  .info-panel {
    position: fixed;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    padding: 24px;
    z-index: 200;
    color: #fff;
    max-width: 320px;
    width: calc(100% - 40px);
    animation: fadeIn 0.3s ease-out;
    border: 1px solid rgba(79, 195, 247, 0.3);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -48%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  .info-panel-title {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #4FC3F7;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .info-panel-title::before {
    content: '';
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--planet-color, #4FC3F7);
    box-shadow: 0 0 10px var(--planet-color, #4FC3F7);
  }

  .info-list {
    list-style: none;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 13px;
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-label {
    color: #B0BEC5;
  }

  .info-value {
    color: #fff;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .control-panel {
      top: auto;
      right: 0;
      bottom: 0;
      left: 0;
      width: 100%;
      border-radius: 16px 16px 0 0;
      padding: 16px;
    }

    .panel-title {
      font-size: 16px;
      margin-bottom: 14px;
    }

    .planet-switches {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }

    .planet-switch-item {
      flex: 1 1 45%;
      font-size: 12px;
    }

    .control-section {
      margin-bottom: 14px;
    }

    .info-panel {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      transform: none;
      width: 100%;
      max-width: none;
      border-radius: 16px 16px 0 0;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .stardust-left,
    .stardust-right {
      width: 8%;
    }
  }
`;

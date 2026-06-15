import React from "react";
import { useAquariumStore, FishSpecies } from "./store";
import { SPECIES_NAMES, FISH_PALETTES } from "./FishBehavior";

const speciesList: FishSpecies[] = ["clownfish", "angelfish", "lanternfish"];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            color: "#00e5ff",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            backgroundColor: "#1b3b5a",
            padding: "2px 10px",
            borderRadius: "4px",
            transition: "all 0.2s ease",
            boxShadow: isDragging
              ? "0 0 6px #00bcd4"
              : "none",
          }}
        >
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "6px",
          background: "#1b3b5a",
          borderRadius: "3px",
          cursor: "pointer",
        }}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${percentage}%`,
            background: "linear-gradient(90deg, #00bcd4, #00e676)",
            borderRadius: "3px",
            transition: "width 0.1s ease",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `calc(${percentage}% - 8px)`,
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#00bcd4",
            transform: "translateY(-50%)",
            transition: "all 0.15s ease",
            boxShadow: isDragging
              ? "0 0 12px #00e676, 0 0 4px #00bcd4"
              : "0 0 4px #00bcd4",
            border: "2px solid #ffffff",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

const ControlPanel: React.FC = () => {
  const {
    temperature,
    waterQuality,
    lightIntensity,
    selectedSpecies,
    fishes,
    selectedFishId,
    setTemperature,
    setWaterQuality,
    setLightIntensity,
    setSelectedSpecies,
  } = useAquariumStore();

  const selectedFish = fishes.find((f) => f.id === selectedFishId);

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        width: "260px",
        background: "linear-gradient(145deg, #0d1b2a, #162447)",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid #1b3b5a",
        color: "#ffffff",
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        zIndex: 100,
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#00e5ff",
          marginBottom: "16px",
          textAlign: "center",
          paddingBottom: "10px",
          borderBottom: "1px solid #1b3b5a",
          letterSpacing: "1px",
          textShadow: "0 0 8px rgba(0, 229, 255, 0.3)",
        }}
      >
        🐠 海洋控制台
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            color: "#00e5ff",
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "10px",
            letterSpacing: "0.5px",
          }}
        >
          选择鱼类品种
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {speciesList.map((species) => {
            const palette = FISH_PALETTES[species];
            const isSelected = selectedSpecies === species;
            return (
              <button
                key={species}
                onClick={() => setSelectedSpecies(species)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = `0 0 8px ${palette.primary}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = isSelected
                    ? `0 0 10px ${palette.primary}, inset 0 0 4px rgba(255,255,255,0.2)`
                    : "none";
                }}
                style={{
                  flex: 1,
                  minWidth: "70px",
                  padding: "8px 6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "6px",
                  border: isSelected
                    ? `2px solid ${palette.primary}`
                    : "2px solid #1b3b5a",
                  background: isSelected
                    ? `linear-gradient(135deg, ${palette.primary}22, ${palette.secondary}22)`
                    : "#1b3b5a44",
                  color: "#ffffff",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected
                    ? `0 0 10px ${palette.primary}, inset 0 0 4px rgba(255,255,255,0.2)`
                    : "none",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "3px",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: palette.primary,
                      boxShadow: `0 0 4px ${palette.primary}`,
                    }}
                  />
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: palette.secondary,
                      boxShadow: palette.glow
                        ? `0 0 6px ${palette.glow}`
                        : "none",
                    }}
                  />
                </div>
                {SPECIES_NAMES[species]}
              </button>
            );
          })}
        </div>
      </div>

      <Slider
        label="🌡️ 水温"
        value={temperature}
        min={10}
        max={35}
        step={0.5}
        unit="°C"
        onChange={setTemperature}
      />

      <Slider
        label="💧 水质"
        value={waterQuality}
        min={0}
        max={100}
        step={1}
        unit=""
        onChange={setWaterQuality}
      />

      <Slider
        label="☀️ 光照强度"
        value={lightIntensity}
        min={0}
        max={10}
        step={0.1}
        unit=""
        onChange={setLightIntensity}
      />

      {selectedFish && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(0, 188, 212, 0.08)",
            border: "1px solid rgba(0, 229, 255, 0.3)",
            borderRadius: "8px",
            animation: "pulse 1.2s ease-in-out infinite",
          }}
        >
          <div
            style={{
              color: "#00e676",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            ✨ 鱼的信息
          </div>
          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.8,
              color: "#e0f7fa",
            }}
          >
            <div>
              <span style={{ color: "#00e5ff" }}>品种：</span>
              {SPECIES_NAMES[selectedFish.species]}
            </div>
            <div>
              <span style={{ color: "#00e5ff" }}>游速：</span>
              {selectedFish.speed.toFixed(2)} 单位/秒
            </div>
            <div>
              <span style={{ color: "#00e5ff" }}>体长：</span>
              {(selectedFish.size * 3).toFixed(2)} 单位
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid #1b3b5a",
          fontSize: "11px",
          color: "#80cbc4",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <div>🐟 当前鱼群：{fishes.length} 条</div>
        <div style={{ marginTop: "4px", color: "#4db6ac" }}>
          点击鱼缸地面放置鱼类
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0, 229, 255, 0.2); }
          50% { box-shadow: 0 0 14px rgba(0, 229, 255, 0.4); }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #1b3b5a;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: #00bcd4;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;

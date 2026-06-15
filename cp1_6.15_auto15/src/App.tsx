import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from '@/audio/AudioEngine';
import { CombatEngine } from '@/combat/CombatEngine';
import { useAppStore } from '@/store';
import BattleScene from '@/components/BattleScene';
import DataPanel from '@/components/DataPanel';
import skillMappingData from '@/data/skillMapping.json';

type KeyConfig = {
  frequencyRange: [number, number];
  volumeRange: [number, number];
  label: string;
};

const keyMap = skillMappingData.keyboardSim as unknown as Record<string, KeyConfig>;

const App: React.FC = () => {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const combatEngineRef = useRef<CombatEngine | null>(null);
  const [micAvailable, setMicAvailable] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const simIntervalRef = useRef<number>(0);

  const setAudioFeatures = useAppStore((s) => s.setAudioFeatures);
  const addSkillEffect = useAppStore((s) => s.addSkillEffect);
  const setEnemies = useAppStore((s) => s.setEnemies);
  const setCombatRecords = useAppStore((s) => s.setCombatRecords);
  const showSkillPopup = useAppStore((s) => s.showSkillPopup);
  const triggerShake = useAppStore((s) => s.triggerShake);
  const setShieldActive = useAppStore((s) => s.setShieldActive);
  const setMicActive = useAppStore((s) => s.setMicActive);

  const handleSkillTrigger = useCallback(
    (effect: Parameters<typeof addSkillEffect>[0]) => {
      addSkillEffect(effect);
      showSkillPopup(effect.skillName);
      if (effect.shakeAmplitude > 0) {
        triggerShake(effect.shakeAmplitude, effect.shakeDuration);
      }
      if (effect.skillId === 'shieldResonance') {
        setShieldActive(true);
        setTimeout(() => setShieldActive(false), 3000);
      }
    },
    [addSkillEffect, showSkillPopup, triggerShake, setShieldActive]
  );

  const injectSimulated = useCallback((pitch: number, volume: number) => {
    const now = performance.now();
    const bpm = pitch < 200 ? 70 : pitch < 500 ? 100 : 140;
    const onset = Math.random() > 0.5;
    const features = {
      pitch,
      volume,
      bpm,
      onset,
      timestamp: now,
      waveform: new Float32Array(128).map(() => (Math.random() - 0.5) * volume * 2),
      frequencyData: new Uint8Array(128).map(() => Math.random() * 255 * volume),
    };
    setAudioFeatures(features);
    if (combatEngineRef.current) {
      combatEngineRef.current.processAudioFeatures(features);
    }
  }, [setAudioFeatures]);

  const handleStart = useCallback(() => {
    const combat = new CombatEngine();
    combatEngineRef.current = combat;

    combat.setCallback((effect, enemies) => {
      handleSkillTrigger(effect);
      setEnemies([...enemies]);
    });

    combat.setRecordsCallback((records) => {
      setCombatRecords(records);
    });

    setIsStarted(true);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const engine = new AudioEngine();
      audioEngineRef.current = engine;
      engine.init((features) => {
        setAudioFeatures(features);
        if (combatEngineRef.current) {
          combatEngineRef.current.processAudioFeatures(features);
        }
      }).then((ok) => {
        if (ok) {
          engine.start();
          setMicAvailable(true);
          setMicActive(true);
        }
      }).catch(() => {
        setMicAvailable(false);
      });
    }
  }, [handleSkillTrigger, setEnemies, setCombatRecords, setAudioFeatures, setMicActive]);

  useEffect(() => {
    if (!isStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toUpperCase();
      if (['A', 'S', 'D'].includes(key)) {
        setActiveKeys((prev) => new Set(prev).add(key));
        const config = keyMap[key];
        if (config) {
          const pitch = config.frequencyRange[0] + Math.random() * (config.frequencyRange[1] - config.frequencyRange[0]);
          const volume = config.volumeRange[0] + Math.random() * (config.volumeRange[1] - config.volumeRange[0]);
          injectSimulated(pitch, volume);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isStarted, injectSimulated]);

  useEffect(() => {
    if (!isStarted) return;
    simIntervalRef.current = window.setInterval(() => {
      const active = Array.from(activeKeys);
      if (active.length === 0) return;
      const key = active[Math.floor(Math.random() * active.length)];
      const config = keyMap[key];
      if (!config) return;
      const pitch = config.frequencyRange[0] + Math.random() * (config.frequencyRange[1] - config.frequencyRange[0]);
      const volume = config.volumeRange[0] + Math.random() * (config.volumeRange[1] - config.volumeRange[0]);
      injectSimulated(pitch, volume);
    }, 100);
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isStarted, activeKeys, injectSimulated]);

  useEffect(() => {
    if (!isStarted) return;
    const interval = setInterval(() => {
      if (combatEngineRef.current) {
        setEnemies([...combatEngineRef.current.getEnemies()]);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isStarted, setEnemies]);

  useEffect(() => {
    return () => {
      if (audioEngineRef.current) audioEngineRef.current.destroy();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  if (!isStarted) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#0d1117', color: '#c9d1d9', fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      }}>
        <h1 style={{ fontSize: '36px', color: '#58a6ff', marginBottom: '12px', textShadow: '0 0 20px rgba(88,166,255,0.5)' }}>
          声波战斗实验室
        </h1>
        <p style={{ fontSize: '14px', color: '#8b949e', marginBottom: '32px', maxWidth: '500px', textAlign: 'center', lineHeight: '1.6' }}>
          通过声音或键盘触发技能，在2D战场中击败敌人
        </p>
        <button
          onClick={handleStart}
          style={{
            padding: '12px 40px', fontSize: '16px', fontWeight: 'bold',
            background: 'linear-gradient(135deg, #58a6ff, #1f6feb)', color: '#fff',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(88,166,255,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(88,166,255,0.6)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(88,166,255,0.4)'; }}
        >
          开始战斗
        </button>
        <div style={{ marginTop: '24px', fontSize: '12px', color: '#484f58' }}>
          <div>键盘模拟: A=低音 · S=中音 · D=高音</div>
          <div style={{ marginTop: '4px' }}>麦克风将自动启用（如可用）</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      background: '#0d1117', fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
      overflow: 'hidden',
    }}>
      <div style={{ flex: 7, minWidth: 0, height: '100%', position: 'relative' }}>
        <BattleScene />
        <div style={{
          position: 'absolute', bottom: '12px', left: '12px',
          display: 'flex', gap: '6px', alignItems: 'center',
        }}>
          <div style={{
            padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
            background: micAvailable ? 'rgba(63,185,80,0.2)' : 'rgba(139,148,158,0.2)',
            color: micAvailable ? '#3fb950' : '#8b949e',
            border: `1px solid ${micAvailable ? 'rgba(63,185,80,0.3)' : 'rgba(139,148,158,0.3)'}`,
          }}>
            {micAvailable ? '🎤 麦克风已连接' : '🔇 使用键盘模拟'}
          </div>
          {activeKeys.size > 0 && (
            <div style={{
              padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
              background: 'rgba(88,166,255,0.2)', color: '#58a6ff',
              border: '1px solid rgba(88,166,255,0.3)',
            }}>
              按键: {Array.from(activeKeys).join(' ')}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 3, minWidth: '280px', maxWidth: '360px', height: '100%', overflow: 'hidden' }}>
        <DataPanel />
      </div>
    </div>
  );
};

export default App;

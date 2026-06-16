import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { usePetStore } from '@/store/petStore';
import { startSimulation } from '@/utils/simulationEngine';
import type { PetState } from '../../shared/types.js';

const BARS: { key: keyof PetState; label: string }[] = [
  { key: 'hunger', label: '饱腹度' },
  { key: 'energy', label: '精力' },
  { key: 'social', label: '社交' },
  { key: 'hygiene', label: '卫生' },
];

const SPEEDS: (1 | 2 | 4)[] = [1, 2, 4];

export default function PetSimulator() {
  const [searchParams] = useSearchParams();
  const petId = searchParams.get('petId') ?? '';
  const { pet, petState, tasks, speed, setPetId, setPet, setTasks, setSpeed, setPetState } = usePetStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const rafRef = useRef<number>(0);
  const prevRef = useRef<PetState>(petState);

  useEffect(() => {
    if (!petId) return;
    setPetId(petId);
    axios.get(`/api/pet/${petId}`).then((r) => setPet(r.data)).catch(() => {});
    axios.get(`/api/tasks/${petId}`).then((r) => setTasks(r.data)).catch(() => {});
    const cleanup = startSimulation(petId, usePetStore);
    return cleanup;
  }, [petId]);

  useEffect(() => {
    const tick = () => {
      const current = usePetStore.getState().petState;
      if (current !== prevRef.current) {
        prevRef.current = current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const isCat = pet?.type === 'cat';
  const eyeSize = 8 + petState.energy / 20;

  return (
    <div style={{ background: '#F5F5F5', minHeight: '100vh' }}>
      <nav style={{ height: 60, background: '#37474F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <span className="text-lg font-bold">虚拟试养</span>
        <div className="hidden md:flex items-center gap-2">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)} style={{ padding: '4px 12px', borderRadius: 4, background: speed === s ? '#1976D2' : '#546E7A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              {s}x
            </button>
          ))}
        </div>
        <button className="hidden md:block" style={{ background: '#1976D2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }}>
          导出报告
        </button>
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>☰</button>
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', top: 60, right: 0, background: '#37474F', padding: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {SPEEDS.map((s) => (
              <button key={s} onClick={() => { setSpeed(s); setMenuOpen(false); }} style={{ padding: '4px 12px', borderRadius: 4, background: speed === s ? '#1976D2' : '#546E7A', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {s}x
              </button>
            ))}
          </div>
          <button style={{ background: '#1976D2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>导出报告</button>
        </div>
      )}

      <div style={{ paddingTop: 76, padding: '76px 24px 24px', display: 'flex', gap: 32, maxWidth: 1200, margin: '0 auto' }} className="flex-col md:flex-row">
        <div style={{ flex: '0 0 40%', maxWidth: '100%' }} className="md:max-w-[40%]">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2 className="text-xl font-bold">{pet?.name ?? '...'}</h2>
            <div style={{
              width: 120, height: isCat ? 120 : 140, margin: '12px auto',
              borderRadius: isCat ? '50%' : '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: isCat ? '#FFB74D' : '#A1887F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', fontSize: 40,
            }}>
              {isCat ? '🐱' : '🐶'}
              <div style={{ position: 'absolute', top: '30%', left: '30%', width: eyeSize, height: eyeSize, borderRadius: '50%', background: '#333' }} />
              <div style={{ position: 'absolute', top: '30%', right: '30%', width: eyeSize, height: eyeSize, borderRadius: '50%', background: '#333' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            {BARS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span className="text-xs font-medium">{label}</span>
                <div style={{ width: 20, height: 200, background: '#E0E0E0', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: `${petState[key]}%`,
                    background: `linear-gradient(to top, #FF5722, #4CAF50)`,
                    transition: 'height 0.5s ease',
                  }} />
                </div>
                <span className="text-xs">{Math.round(petState[key])}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 60%' }}>
          <h3 className="text-lg font-bold mb-4">护理任务</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {tasks.length === 0 && <div className="text-gray-400 text-sm">暂无任务</div>}
            {tasks.map((t) => (
              <div key={t.id} style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #E0E0E0', opacity: t.completed ? 0.5 : 1 }}>
                {t.icon} {t.name}
              </div>
            ))}
          </div>
          <h3 className="text-lg font-bold mb-4">日历视图</h3>
          <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #E0E0E0', minHeight: 120 }} />
        </div>
      </div>
    </div>
  );
}

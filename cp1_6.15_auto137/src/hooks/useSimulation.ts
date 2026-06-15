import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const SIMULATION_INTERVAL = 10000;

export function useSimulation() {
  const simulatePrice = useStore((s) => s.simulatePrice);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    simulatePrice();
    timerRef.current = setInterval(() => {
      simulatePrice();
    }, SIMULATION_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [simulatePrice]);
}

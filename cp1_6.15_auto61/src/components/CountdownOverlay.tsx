import { motion } from 'framer-motion';
import { useEffect } from 'react';

interface CountdownOverlayProps {
  seconds: 3 | 2 | 1;
  onComplete: () => void;
}

export default function CountdownOverlay({ seconds, onComplete }: CountdownOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-arena-bg/90">
      <motion.div
        key={seconds}
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 1] }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="font-display text-9xl font-bold text-arena-accent select-none"
      >
        {seconds}
      </motion.div>
    </div>
  );
}

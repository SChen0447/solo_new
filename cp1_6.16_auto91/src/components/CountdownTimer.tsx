import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownTimerProps {
  initialTime: number;
  onComplete: () => void;
  isRunning: boolean;
}

export function CountdownTimer({ initialTime, onComplete, isRunning }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isAnimating, setIsAnimating] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
        if (newTime <= 0) {
          clearInterval(timer);
          handleComplete();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, handleComplete]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">投票倒计时：</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={timeLeft}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-[#F44336]' : 'text-[#FF5722]'}`}
        >
          {formatTime(Math.max(0, timeLeft))}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

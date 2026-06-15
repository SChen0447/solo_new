import { useEffect, useState } from 'react';
import { useColorStore } from './store';

export default function Toast() {
  const { toastColor, hideToast } = useColorStore();
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (toastColor) {
      setVisible(true);
      setEntering(true);
      const enterTimer = setTimeout(() => setEntering(false), 300);
      const hideTimer = setTimeout(() => {
        setEntering(true);
        setTimeout(() => {
          setVisible(false);
          hideToast();
        }, 300);
      }, 3000);
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [toastColor, hideToast]);

  if (!visible || !toastColor) return null;

  return (
    <div
      className="fixed top-4 left-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-lg"
      style={{
        transform: entering
          ? 'translateX(-50%) translateY(-60px)'
          : 'translateX(-50%) translateY(0)',
        opacity: entering ? 0 : 1,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div
        className="w-5 h-5 rounded flex-shrink-0"
        style={{ backgroundColor: toastColor }}
      />
      <span className="text-sm text-gray-700 font-mono">
        色值 {toastColor} 已复制
      </span>
    </div>
  );
}

import React from 'react'

export const Crosshair: React.FC = () => {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
      <div className="relative">
        <div
          className="w-1.5 h-1.5 bg-white rounded-full opacity-60"
          style={{
            animation: 'pulse-glow 1.5s ease-in-out infinite'
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white/30"
          style={{
            animation: 'pulse-ring 1.5s ease-in-out infinite'
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/10"
          style={{
            animation: 'pulse-ring-outer 1.5s ease-in-out infinite',
            animationDelay: '0.2s'
          }}
        />
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 4px rgba(255, 255, 255, 0.4);
            opacity: 0.6;
          }
          50% {
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
            opacity: 1;
          }
        }
        
        @keyframes pulse-ring {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.1;
          }
        }
        
        @keyframes pulse-ring-outer {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

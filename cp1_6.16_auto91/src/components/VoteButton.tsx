import { motion } from 'framer-motion';

interface VoteButtonProps {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function VoteButton({ selected, onClick, disabled = false }: VoteButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-hover relative w-6 h-6 rounded-full border-2 transition-all duration-0.2
        ${selected ? 'border-[#4CAF50]' : 'border-gray-500'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-1 rounded-full bg-[#4CAF50]"
        />
      )}
    </button>
  );
}

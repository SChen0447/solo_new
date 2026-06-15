import { motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import type { Comment } from '../types';

interface CommentBubbleProps {
  comment: Comment;
  showAnimal?: boolean;
  onLike?: () => void;
  isLiked?: boolean;
  delay?: number;
}

export function CommentBubble({ comment, showAnimal = false, onLike, isLiked = false, delay = 0 }: CommentBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="flex items-start gap-2 mb-2"
    >
      {showAnimal && comment.animalIcon ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-lg">
          {comment.animalIcon}
        </div>
      ) : (
        <div
          className="flex-shrink-0 w-[30px] h-[30px] rounded-full"
          style={{ backgroundColor: comment.authorColor }}
        />
      )}
      <div className="flex-1">
        <div className="bg-[#333333] rounded-lg px-3 py-2 text-sm">
          {comment.content}
        </div>
        {showAnimal && onLike && (
          <button
            onClick={onLike}
            className={`btn-hover flex items-center gap-1 mt-1 text-xs text-gray-400 ${isLiked ? 'text-[#FF5722]' : ''}`}
          >
            <motion.div animate={isLiked ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}} transition={{ duration: 0.3 }}>
              <ThumbsUp size={14} fill={isLiked ? '#FF5722' : 'none'} />
            </motion.div>
            <span>{comment.likes}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

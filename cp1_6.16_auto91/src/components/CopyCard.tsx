import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import type { CopyItem } from '../types';
import { CommentBubble } from './CommentBubble';
import { VoteButton } from './VoteButton';

interface CopyCardProps {
  copy: CopyItem;
  index: number;
  round: number;
  showComments?: boolean;
  showCommentInput?: boolean;
  showVoteButton?: boolean;
  isVoted?: boolean;
  isRound2Candidate?: boolean;
  onCommentSubmit?: (content: string) => void;
  onVote?: () => void;
  onLike?: (commentId: string) => void;
  likedComments?: Set<string>;
  disableVote?: boolean;
}

export function CopyCard({
  copy,
  index,
  round,
  showComments = true,
  showCommentInput = false,
  showVoteButton = false,
  isVoted = false,
  isRound2Candidate = false,
  onCommentSubmit,
  onVote,
  onLike,
  likedComments = new Set(),
  disableVote = false
}: CopyCardProps) {
  const [commentText, setCommentText] = useState('');
  const MAX_COMMENT_LENGTH = 200;

  const handleSubmitComment = () => {
    if (!commentText.trim() || !onCommentSubmit) return;
    onCommentSubmit(commentText.trim());
    setCommentText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const getAnimationDelay = () => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    return (row + col) * 0.1;
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: getAnimationDelay(), ease: 'easeOut' }}
      className={`relative bg-[#2a2a2a] rounded-xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.3)]
        ${isRound2Candidate ? 'ring-2 ring-[#FF5722]' : ''}`}
    >
      {isRound2Candidate && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF5722] text-white text-xs px-3 py-1 rounded-full">
          待辩论文案
        </div>
      )}

      <div className="absolute top-3 left-3">
        <span className="inline-block px-2 py-1 bg-[#FF5722] text-white text-[10px] rounded-md">
          {copy.styleLabel}
        </span>
      </div>

      {showVoteButton && (
        <div className="absolute top-3 right-3">
          <VoteButton selected={isVoted} onClick={onVote || (() => {})} disabled={disableVote} />
        </div>
      )}

      <div className="mt-6 mb-4 text-[#E0E0E0] leading-relaxed whitespace-pre-wrap">
        {copy.content}
      </div>

      {showComments && copy.comments.length > 0 && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <h4 className="text-xs text-gray-400 mb-3">评论（{copy.comments.length}）</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {copy.comments.map((comment, idx) => (
              <CommentBubble
                key={comment.id}
                comment={comment}
                showAnimal={round >= 2}
                onLike={round >= 2 && onLike ? () => onLike(comment.id) : undefined}
                isLiked={likedComments.has(comment.id)}
                delay={idx * 0.05}
              />
            ))}
          </div>
        </div>
      )}

      {showCommentInput && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="relative">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="输入你的评价或改进建议..."
              className="w-full bg-[#1E1E1E] border border-gray-600 rounded-lg px-3 py-2 text-sm
                text-[#E0E0E0] placeholder-gray-500 resize-none focus:outline-none
                focus:border-[#FF5722] transition-colors"
              rows={2}
            />
            <div className="absolute bottom-2 right-12 text-xs text-gray-500">
              {commentText.length}/{MAX_COMMENT_LENGTH}
            </div>
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              className={`btn-hover absolute bottom-2 right-2 p-1.5 rounded-lg
                ${commentText.trim() ? 'bg-[#FF5722] text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

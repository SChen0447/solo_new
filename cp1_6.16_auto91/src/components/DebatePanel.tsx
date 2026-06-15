import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle, MessageSquare, ThumbsUp, Vote } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CopyCard } from './CopyCard';
import { VoteChart } from './VoteChart';
import { CountdownTimer } from './CountdownTimer';
import type { RankingItem } from '../types';

interface GenerateFormProps {
  onGenerate: (params: { productName: string; targetAudience: string; keySellingPoints: string }) => void;
  isLoading: boolean;
}

function GenerateForm({ onGenerate, isLoading }: GenerateFormProps) {
  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keySellingPoints, setKeySellingPoints] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !targetAudience.trim() || !keySellingPoints.trim()) return;
    onGenerate({
      productName: productName.trim(),
      targetAudience: targetAudience.trim(),
      keySellingPoints: keySellingPoints.trim()
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="bg-[#2a2a2a] rounded-xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.3)] mb-8"
    >
      <h2 className="text-xl font-bold text-[#E0E0E0] mb-6 flex items-center gap-2">
        <Sparkles className="text-[#FF5722]" />
        生成AI文案
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">产品名称</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="例如：XX智能手表"
            className="w-full bg-[#1E1E1E] border border-gray-600 rounded-lg px-4 py-2.5
              text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-[#FF5722]
              transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">目标受众</label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="例如：年轻职场人"
            className="w-full bg-[#1E1E1E] border border-gray-600 rounded-lg px-4 py-2.5
              text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-[#FF5722]
              transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">核心卖点</label>
          <input
            type="text"
            value={keySellingPoints}
            onChange={(e) => setKeySellingPoints(e.target.value)}
            placeholder="例如：超长续航，健康监测，时尚外观"
            className="w-full bg-[#1E1E1E] border border-gray-600 rounded-lg px-4 py-2.5
              text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-[#FF5722]
              transition-colors"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading || !productName.trim() || !targetAudience.trim() || !keySellingPoints.trim()}
        className={`btn-hover flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium
          ${isLoading || !productName.trim() || !targetAudience.trim() || !keySellingPoints.trim()
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-[#FF5722] text-white'}`}
      >
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles size={18} />
            </motion.div>
            生成中...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            生成文案
          </>
        )}
      </button>
    </motion.form>
  );
}

interface RoundIndicatorProps {
  currentRound: number;
}

function RoundIndicator({ currentRound }: RoundIndicatorProps) {
  const rounds = [
    { id: 1, name: '生成文案', icon: Sparkles },
    { id: 2, name: '第一轮辩论', icon: MessageSquare },
    { id: 3, name: '第二轮辩论', icon: ThumbsUp },
    { id: 4, name: '投票', icon: Vote },
    { id: 5, name: '结果', icon: CheckCircle }
  ];

  return (
    <div className="flex items-center justify-center mb-8 overflow-x-auto py-2">
      <div className="flex items-center gap-2">
        {rounds.map((round, index) => {
          const Icon = round.icon;
          const isActive = currentRound >= round.id;
          const isCurrent = currentRound === round.id;
          
          return (
            <div key={round.id} className="flex items-center">
              <motion.div
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg
                  ${isActive ? 'bg-[#FF5722] text-white' : 'bg-[#2a2a2a] text-gray-500'}
                  ${isCurrent ? 'ring-2 ring-[#FF5722]/50' : ''}`}
              >
                <Icon size={16} />
                <span className="text-sm font-medium whitespace-nowrap">{round.name}</span>
              </motion.div>
              {index < rounds.length - 1 && (
                <motion.div
                  animate={isActive && currentRound > round.id ? { width: '40px' } : { width: '20px' }}
                  className={`h-0.5 mx-1 transition-all duration-300
                    ${isActive && currentRound > round.id ? 'bg-[#FF5722]' : 'bg-gray-600'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ReplayControllerProps {
  onStop: () => void;
  currentStep: number;
  totalSteps: number;
}

function ReplayController({ onStop, currentStep, totalSteps }: ReplayControllerProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#2a2a2a] rounded-full
      px-6 py-3 shadow-xl border border-[#FF5722] flex items-center gap-4">
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-[#FF5722]"
      />
      <span className="text-sm text-[#E0E0E0]">
        回放中 {currentStep}/{totalSteps}
      </span>
      <button
        onClick={onStop}
        className="btn-hover text-sm text-gray-400 hover:text-white"
      >
        停止
      </button>
    </div>
  );
}

export function DebatePanel() {
  const {
    currentSession,
    currentRound,
    rankings,
    round2Copies,
    hasVoted,
    votedCopyId,
    isLoading,
    isReplaying,
    generateCopy,
    submitComment,
    proceedToRound2,
    submitLike,
    startVoting,
    submitVote,
    finishVoting,
    resetSession,
    stopReplay
  } = useStore();

  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [replayStep, setReplayStep] = useState(0);

  const handleLike = useCallback((copyId: string, commentId: string) => {
    if (likedComments.has(commentId)) return;
    setLikedComments((prev) => new Set([...prev, commentId]));
    submitLike(copyId, commentId);
  }, [likedComments, submitLike]);

  const handleVotingComplete = useCallback(() => {
    finishVoting();
  }, [finishVoting]);

  useEffect(() => {
    if (isReplaying && currentSession) {
      const totalSteps = 4;
      const timer = setInterval(() => {
        setReplayStep((prev) => {
          if (prev >= totalSteps) {
            clearInterval(timer);
            return prev;
          }
          const nextStep = prev + 1;
          useStore.setState({ currentRound: nextStep });
          return nextStep;
        });
      }, 2000);

      return () => clearInterval(timer);
    }
  }, [isReplaying, currentSession]);

  const canProceedToRound2 = currentSession && currentRound === 1 &&
    currentSession.copies.some(c => c.comments.length > 0);

  const canStartVoting = currentRound === 2 && round2Copies.length > 0;

  const displayCopies = currentRound === 2 && round2Copies.length > 0
    ? round2Copies
    : currentSession?.copies || [];

  if (!currentSession) {
    return (
      <div>
        <GenerateForm onGenerate={generateCopy} isLoading={isLoading} />
        <div className="text-center text-gray-400 py-16">
          <Sparkles size={60} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">输入产品信息，开始生成AI文案</p>
          <p className="text-sm mt-2">通过多轮辩论和投票，找到最佳文案</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AnimatePresence>
        {isReplaying && (
          <ReplayController
            onStop={stopReplay}
            currentStep={replayStep}
            totalSteps={4}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#E0E0E0]">{currentSession.productName}</h2>
          <p className="text-sm text-gray-400">
            目标受众：{currentSession.targetAudience} | 核心卖点：{currentSession.keySellingPoints}
          </p>
        </div>
        {currentRound >= 4 && (
          <button
            onClick={resetSession}
            className="btn-hover px-4 py-2 bg-[#2a2a2a] text-[#E0E0E0] rounded-lg
              border border-gray-600 hover:border-[#FF5722]"
          >
            开始新的辩论
          </button>
        )}
      </div>

      <RoundIndicator currentRound={currentRound} />

      {currentRound >= 1 && currentRound < 4 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayCopies.map((copy, index) => (
              <CopyCard
                key={copy.id}
                copy={copy}
                index={index}
                round={currentRound}
                showComments={currentRound >= 1}
                showCommentInput={currentRound === 1 && !isReplaying}
                showVoteButton={currentRound === 3 && !isReplaying}
                isVoted={votedCopyId === copy.id}
                isRound2Candidate={currentRound >= 2 && currentSession.topCopiesForRound2.includes(copy.id)}
                onCommentSubmit={(content) => submitComment(copy.id, content)}
                onVote={() => submitVote(copy.id)}
                onLike={(commentId) => handleLike(copy.id, commentId)}
                likedComments={likedComments}
                disableVote={hasVoted}
              />
            ))}
          </div>
        </div>
      )}

      {currentRound === 1 && !isReplaying && (
        <div className="flex justify-center my-8">
          <button
            onClick={proceedToRound2}
            disabled={!canProceedToRound2 || isLoading}
            className={`btn-hover flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-lg
              ${canProceedToRound2 && !isLoading
                ? 'bg-gradient-to-r from-[#FF5722] to-[#FF8C00] text-white shadow-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
          >
            进入第二轮辩论
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {currentRound === 2 && !isReplaying && (
        <div className="flex justify-center my-8">
          <button
            onClick={startVoting}
            disabled={!canStartVoting}
            className={`btn-hover flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-lg
              ${canStartVoting
                ? 'bg-gradient-to-r from-[#4CAF50] to-[#8BC34A] text-white shadow-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
          >
            开始投票
            <Vote size={20} />
          </button>
        </div>
      )}

      {currentRound === 3 && (
        <div className="bg-[#2a2a2a] rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#E0E0E0]">投票环节</h3>
            <CountdownTimer
              initialTime={60}
              onComplete={handleVotingComplete}
              isRunning={!isReplaying}
            />
          </div>
          {hasVoted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-[#4CAF50]/20 border border-[#4CAF50] rounded-lg
                text-[#4CAF50] flex items-center gap-2"
            >
              <CheckCircle size={18} />
              您已成功投票，等待倒计时结束查看结果
            </motion.div>
          )}
          <p className="text-sm text-gray-400">
            每位用户只能投一票，请在倒计时结束前选择您认为最佳的文案
          </p>
        </div>
      )}

      {currentRound >= 4 && rankings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#2a2a2a] rounded-xl p-6 mb-8"
        >
          <VoteChart rankings={rankings as RankingItem[]} />
        </motion.div>
      )}
    </div>
  );
}

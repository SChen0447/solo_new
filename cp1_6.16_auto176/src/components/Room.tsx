import { useState, useEffect, useCallback } from 'react';
import { fetchRoomState, startGame, submitAnswer } from '../api';
import type { Room, Player, Question, PlayerAnswer } from '../types';
import { categoryColors, categoryNames, medalColors } from '../types';

interface RoomViewProps {
  room: Room | null;
  playerId: string | null;
  onLeaveRoom: () => void;
  onRoomUpdate: (room: Room) => void;
  roomCode: string;
}

export default function RoomView({ room, playerId, onLeaveRoom, onRoomUpdate, roomCode }: RoomViewProps) {
  const [localRoom, setLocalRoom] = useState<Room | null>(room);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(timeRemaining);
  const [celebrationShown, setCelebrationShown] = useState(false);

  useEffect(() => {
    setLocalRoom(room);
  }, [room]);

  const loadRoomState = useCallback(async () => {
    if (!roomCode) return;
    try {
      const response = await fetchRoomState(roomCode);
      setLocalRoom(response.room);
      setTimeRemaining(response.timeRemaining);
      onRoomUpdate(response.room);
    } catch (e: any) {
      if (e.response?.status === 404) {
        onLeaveRoom();
      }
    }
  }, [roomCode, onRoomUpdate, onLeaveRoom]);

  useEffect(() => {
    loadRoomState();
    const interval = setInterval(loadRoomState, 2000);
    return () => clearInterval(interval);
  }, [loadRoomState]);

  useEffect(() => {
    setCountdown(timeRemaining);
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  useEffect(() => {
    if (localRoom?.status === 'playing') {
      const currentQuestion = localRoom.questions[localRoom.currentQuestionIndex];
      const me = localRoom.players.find(p => p.id === playerId);
      const hasAnswered = me?.answers.some(a => a.questionId === currentQuestion?.id);
      if (hasAnswered) {
        setAnswerSubmitted(true);
      } else {
        setAnswerSubmitted(false);
        setSelectedAnswer(null);
      }
    }
  }, [localRoom, playerId]);

  useEffect(() => {
    if (localRoom?.status === 'finished' && !celebrationShown) {
      setCelebrationShown(true);
    }
  }, [localRoom?.status, celebrationShown]);

  const handleStartGame = async () => {
    if (!playerId || !roomCode) return;
    setError(null);
    try {
      await startGame(roomCode, playerId);
      loadRoomState();
    } catch (e: any) {
      setError(e.response?.data?.error || '开始游戏失败');
    }
  };

  const handleSelectAnswer = async (optionIndex: number) => {
    if (answerSubmitted || !localRoom || !playerId) return;
    if (localRoom.status !== 'playing') return;

    const currentQuestion = localRoom.questions[localRoom.currentQuestionIndex];
    if (!currentQuestion) return;

    const me = localRoom.players.find(p => p.id === playerId);
    if (me?.answers.some(a => a.questionId === currentQuestion.id)) {
      return;
    }

    setSelectedAnswer(optionIndex);
    setAnswerSubmitted(true);

    try {
      await submitAnswer({
        roomCode,
        playerId,
        questionId: currentQuestion.id,
        selectedOption: optionIndex
      });
    } catch (e: any) {
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      setError(e.response?.data?.error || '提交答案失败');
    }
  };

  const getMedalColor = (index: number): string => {
    if (index === 0) return medalColors.gold;
    if (index === 1) return medalColors.silver;
    if (index === 2) return medalColors.bronze;
    return 'inherit';
  };

  const getMedalEmoji = (index: number): string => {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  const getCorrectnessRate = (player: Player): number => {
    if (player.answers.length === 0) return 0;
    const correct = player.answers.filter(a => a.isCorrect).length;
    return (correct / player.answers.length) * 100;
  };

  const getMyAnswerForQuestion = (questionId: string): PlayerAnswer | undefined => {
    const me = localRoom?.players.find(p => p.id === playerId);
    return me?.answers.find(a => a.questionId === questionId);
  };

  const sortedPlayers = [...(localRoom?.players || [])].sort((a, b) => b.score - a.score);
  const currentQuestion = localRoom?.questions[localRoom.currentQuestionIndex];
  const isCreator = localRoom?.creatorId === playerId;
  const me = localRoom?.players.find(p => p.id === playerId);

  if (!localRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">加载中...</div>
      </div>
    );
  }

  const displaySeconds = Math.ceil(countdown / 1000);
  const isLast5Seconds = displaySeconds <= 5 && displaySeconds > 0;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes crown-fall {
          0% { transform: translateY(-50px) scale(0); opacity: 0; }
          60% { transform: translateY(10px) scale(1.2); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .blink-text {
          animation: blink 0.5s ease-in-out infinite;
        }
        .crown-animation {
          animation: crown-fall 0.3s ease-out forwards;
        }
        .pulse-animation {
          animation: pulse-scale 0.3s ease-in-out;
        }
        .option-card {
          transition: all 0.15s ease;
        }
        .option-card:hover:not(:disabled) {
          transform: scale(1.02);
        }
        .option-card.selected {
          transform: scale(1.02);
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors text-sm"
            >
              ← 返回大厅
            </button>
            <div className="text-xl font-bold">
              {localRoom.name}
            </div>
            <div className="px-3 py-1 bg-[#1E88E5]/30 rounded-lg font-mono text-sm">
              {localRoom.code}
            </div>
          </div>
          <div className="text-sm text-gray-400">
            题目: {localRoom.questionCount}题 | 时限: {localRoom.timeLimit}秒
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {localRoom.status === 'waiting' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#212121]/80 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>👥</span> 等待玩家加入
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {localRoom.players.map(player => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      player.id === playerId
                        ? 'border-[#1E88E5] bg-[#1E88E5]/10'
                        : 'border-gray-700 bg-[#121212]/50'
                    }`}
                  >
                    <div className="font-medium truncate">{player.nickname}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {player.isCreator ? '👑 房主' : '玩家'}
                      {player.id === playerId && ' (你)'}
                    </div>
                  </div>
                ))}
              </div>
              {isCreator && (
                <button
                  onClick={handleStartGame}
                  disabled={localRoom.players.length < 1}
                  className="mt-8 w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                >
                  🎮 开始游戏
                </button>
              )}
              {!isCreator && (
                <div className="mt-8 text-center text-gray-400">
                  等待房主开始游戏...
                </div>
              )}
            </div>

            <div className="bg-[#212121]/80 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">🏆 积分榜</h3>
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#121212]/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center font-bold" style={{ color: getMedalColor(index) }}>
                        {index + 1}
                      </span>
                      <span className="truncate max-w-[100px]">{player.nickname}</span>
                    </div>
                    <span className="font-mono font-bold">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {localRoom.status === 'playing' && currentQuestion && (
          <div className="space-y-6">
            <div className="bg-[#212121]/80 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    第 {localRoom.currentQuestionIndex + 1} / {localRoom.questions.length} 题
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: categoryColors[currentQuestion.category] + '40', color: '#fff' }}
                  >
                    {categoryNames[currentQuestion.category]}
                  </span>
                </div>
                <div
                  className={`text-4xl md:text-6xl font-bold text-red-500 ${isLast5Seconds ? 'blink-text' : ''}`}
                >
                  {displaySeconds}
                </div>
              </div>

              <div className="flex justify-center gap-2 mb-6">
                {localRoom.questions.map((q: Question, idx: number) => {
                  const myAnswer = getMyAnswerForQuestion(q.id);
                  let bgColor = 'bg-gray-600';
                  if (myAnswer) {
                    bgColor = myAnswer.isCorrect ? 'bg-[#4CAF50]' : 'bg-[#F44336]';
                  } else if (idx === localRoom.currentQuestionIndex) {
                    bgColor = 'bg-[#1E88E5]';
                  }
                  return (
                    <div
                      key={q.id}
                      className={`w-3 h-3 md:w-4 md:
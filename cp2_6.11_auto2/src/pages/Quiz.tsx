import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Clock, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/store'
import type { Card } from '@/store'
import { cn } from '@/lib/utils'

type QuizState = 'setup' | 'quiz' | 'result'

interface AnswerRecord {
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

const QUIZ_COUNT = 10
const TIME_PER_QUESTION = 15

const PARTICLE_COLORS = ['#ff6f00', '#1a237e', '#4caf50', '#2196f3', '#9c27b0', '#e91e63', '#00bcd4']

interface Particle {
  id: number
  size: number
  color: string
  delay: number
  angle: number
  distance: number
  duration: number
}

export default function Quiz() {
  const { decks, fetchDecks } = useAppStore()
  const [quizState, setQuizState] = useState<QuizState>('setup')
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION)
  const [userAnswer, setUserAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [displayScore, setDisplayScore] = useState(0)
  const [questionKey, setQuestionKey] = useState(0)

  const timerRef = useRef<number | null>(null)
  const scoreAnimationRef = useRef<number | null>(null)
  const userAnswerRef = useRef('')
  const submittedRef = useRef(false)

  useEffect(() => {
    userAnswerRef.current = userAnswer
  }, [userAnswer])

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      size: Math.random() * 12 + 4,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: Math.random() * 0.5,
      angle: (i / 50) * 360 + Math.random() * 20,
      distance: Math.random() * 200 + 80,
      duration: Math.random() * 0.8 + 0.8,
    }))
  }, [])

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  const handleTimeout = useCallback(() => {
    if (submittedRef.current) return
    const currentCard = cards[currentIndex]
    if (!currentCard) return

    setSubmitted(true)
    submittedRef.current = true
    setIsCorrect(false)
    setAnswers((prev) => [
      ...prev,
      {
        question: currentCard.question,
        userAnswer: userAnswerRef.current || '',
        correctAnswer: currentCard.answer,
        isCorrect: false,
      },
    ])
  }, [cards, currentIndex])

  useEffect(() => {
    if (quizState === 'quiz' && !submitted) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            setTimeout(() => handleTimeout(), 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [quizState, submitted, currentIndex, handleTimeout])

  useEffect(() => {
    if (quizState === 'result') {
      const startTime = performance.now()
      const duration = 1500
      const finalScore = score

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayScore(Math.floor(eased * finalScore))

        if (progress < 1) {
          scoreAnimationRef.current = requestAnimationFrame(animate)
        }
      }

      scoreAnimationRef.current = requestAnimationFrame(animate)

      return () => {
        if (scoreAnimationRef.current) {
          cancelAnimationFrame(scoreAnimationRef.current)
        }
      }
    }
  }, [quizState, score])

  const startQuiz = async () => {
    if (!selectedDeckId) return

    try {
      const res = await fetch(`/api/quiz/random?deckId=${selectedDeckId}&count=${QUIZ_COUNT}`)
      const quizCards = await res.json()
      setCards(quizCards)
      setCurrentIndex(0)
      setScore(0)
      setAnswers([])
      setUserAnswer('')
      userAnswerRef.current = ''
      setSubmitted(false)
      submittedRef.current = false
      setTimeLeft(TIME_PER_QUESTION)
      setQuestionKey(0)
      setQuizState('quiz')
    } catch (error) {
      console.error('Failed to start quiz:', error)
    }
  }

  const submitAnswer = () => {
    if (submitted || !cards[currentIndex]) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const currentCard = cards[currentIndex]
    const userTrimmed = userAnswer.trim().toLowerCase()
    const correctTrimmed = currentCard.answer.trim().toLowerCase()
    const correct = userTrimmed === correctTrimmed

    setSubmitted(true)
    submittedRef.current = true
    setIsCorrect(correct)
    if (correct) {
      setScore((prev) => prev + 10)
    }
    setAnswers((prev) => [
      ...prev,
      {
        question: currentCard.question,
        userAnswer: userAnswer,
        correctAnswer: currentCard.answer,
        isCorrect: correct,
      },
    ])
  }

  const nextQuestion = async () => {
    if (currentIndex >= cards.length - 1) {
      const finalScore = score
      try {
        await fetch('/api/quiz/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: finalScore,
            total: QUIZ_COUNT * 10,
            deckId: selectedDeckId,
          }),
        })
      } catch (error) {
        console.error('Failed to save result:', error)
      }
      setQuizState('result')
      return
    }

    setCurrentIndex((prev) => prev + 1)
    setUserAnswer('')
    userAnswerRef.current = ''
    setSubmitted(false)
    submittedRef.current = false
    setIsCorrect(false)
    setTimeLeft(TIME_PER_QUESTION)
    setQuestionKey((prev) => prev + 1)
  }

  const restartQuiz = () => {
    setQuizState('setup')
    setCards([])
    setCurrentIndex(0)
    setScore(0)
    setAnswers([])
    setUserAnswer('')
    userAnswerRef.current = ''
    setSubmitted(false)
    submittedRef.current = false
    setDisplayScore(0)
    setTimeLeft(TIME_PER_QUESTION)
  }

  const getScoreComment = () => {
    if (score >= 90) return { text: '优秀！你真是学习达人！', emoji: '🎉' }
    if (score >= 70) return { text: '不错！继续加油！', emoji: '👍' }
    if (score >= 60) return { text: '及格了，还需努力！', emoji: '💪' }
    return { text: '加油，多多练习！', emoji: '📚' }
  }

  const pieData = [
    { name: '正确', value: answers.filter((a) => a.isCorrect).length, color: '#4caf50' },
    { name: '错误', value: answers.filter((a) => !a.isCorrect).length, color: '#f44336' },
  ]

  const correctCount = answers.filter((a) => a.isCorrect).length
  const wrongCount = answers.filter((a) => !a.isCorrect).length
  const percentage = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0

  const currentCard = cards[currentIndex]
  const timerColor = timeLeft > 5 ? 'text-orange-500' : 'text-red-500'
  const timerStroke = timeLeft > 5 ? '#ff9800' : '#f44336'
  const timerProgress = (timeLeft / TIME_PER_QUESTION) * 100
  const comment = getScoreComment()

  if (quizState === 'setup') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">开始测试</h1>
            <p className="text-gray-500">选择一个闪卡组开始测试</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择闪卡组
            </label>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              <option value="">请选择闪卡组</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name} ({deck.cards.length} 张卡片)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={startQuiz}
            disabled={!selectedDeckId}
            className={cn(
              'w-full py-4 px-6 rounded-xl text-white font-semibold text-lg btn-press transition-all',
              selectedDeckId
                ? 'bg-accent hover:bg-accent/90'
                : 'bg-gray-300 cursor-not-allowed'
            )}
          >
            开始测试
          </button>
        </div>
      </div>
    )
  }

  if (quizState === 'quiz') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center p-6">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-medium text-gray-600">
              第 {currentIndex + 1} / {cards.length} 题
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke={timerStroke}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - timerProgress / 100)}
                  className="transition-all duration-500 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className={cn('w-5 h-5 mr-1', timerColor)} />
                <span className={cn('text-2xl font-bold', timerColor)}>{timeLeft}</span>
              </div>
            </div>
          </div>

          {timeLeft <= 5 && timeLeft > 0 && !submitted && (
            <div className="text-center mb-3 fade-in">
              <span className="text-red-500 text-sm font-medium animate-pulse">⏰ 即将超时！</span>
            </div>
          )}

          {currentCard && (
            <div key={questionKey} className="fade-in">
              <div className="bg-lightBlue rounded-2xl p-8 mb-6 shadow-md">
                <h2 className="text-2xl font-bold text-primary text-center">
                  {currentCard.question}
                </h2>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !submitted) {
                      e.preventDefault()
                      submitAnswer()
                    }
                  }}
                  disabled={submitted}
                  placeholder="请输入你的答案..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none disabled:bg-gray-100"
                />

                {!submitted ? (
                  <button
                    onClick={submitAnswer}
                    className="w-full mt-4 py-3 px-6 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl btn-press transition-all"
                  >
                    提交答案
                  </button>
                ) : (
                  <div className="mt-4 fade-in">
                    <div
                      className={cn(
                        'p-4 rounded-xl mb-4',
                        isCorrect ? 'bg-green-50' : 'bg-red-50'
                      )}
                    >
                      <div className="flex items-center mb-2">
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-green-500 mr-2 fade-in" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500 mr-2 fade-in" />
                        )}
                        <span
                          className={cn(
                            'font-semibold',
                            isCorrect ? 'text-green-700' : 'text-red-700'
                          )}
                        >
                          {isCorrect ? '回答正确！' : '回答错误'}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        <span className="font-medium">正确答案：</span>
                        {currentCard.answer}
                      </div>
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="w-full py-3 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl btn-press transition-all"
                    >
                      {currentIndex >= cards.length - 1 ? '查看结果' : '下一题'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => {
          const rad = (particle.angle * Math.PI) / 180
          const tx = Math.cos(rad) * particle.distance
          const ty = Math.sin(rad) * particle.distance
          return (
            <div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                left: '50%',
                top: '50%',
                opacity: 0,
                animation: `particleFly${particle.id % 4} ${particle.duration}s ease-out ${particle.delay}s forwards`,
                ['--tx' as string]: `${tx}px`,
                ['--ty' as string]: `${ty}px`,
              }}
            />
          )
        })}
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 fade-in relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">测试完成！</h1>
        </div>

        <div className="text-center mb-6">
          <div className="text-6xl font-bold text-accent mb-2" style={{ animation: 'scoreCount 0.8s ease-out' }}>
            {displayScore}
          </div>
          <div className="text-gray-500 text-lg">/ {QUIZ_COUNT * 10} 分</div>
        </div>

        <div className="text-center mb-6 p-4 bg-lightYellow rounded-xl">
          <span className="text-2xl mr-2">{comment.emoji}</span>
          <span className="text-lg font-medium text-gray-700">{comment.text}</span>
        </div>

        <div className="mb-6" style={{ animation: 'pieExpand 0.8s ease-out' }}>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span style={{ color: '#666', fontSize: '14px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-12 mb-6">
            <div className="text-3xl font-bold text-primary">{percentage}%</div>
            <div className="text-sm text-gray-500">正确率</div>
          </div>
        </div>

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{correctCount}</div>
            <div className="text-sm text-gray-500">正确</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{wrongCount}</div>
            <div className="text-sm text-gray-500">错误</div>
          </div>
        </div>

        <button
          onClick={restartQuiz}
          className="w-full py-4 px-6 bg-accent hover:bg-accent/90 text-white font-semibold text-lg rounded-xl btn-press transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          再测一次
        </button>
      </div>

      <style>{`
        @keyframes particleFly0 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          60% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); opacity: 0; }
        }
        @keyframes particleFly1 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          50% { opacity: 0.8; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.5); opacity: 0; }
        }
        @keyframes particleFly2 {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          70% { opacity: 0.6; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); opacity: 0; }
        }
        @keyframes particleFly3 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          40% { opacity: 1; transform: translate(calc(-50% + var(--tx) * 0.3), calc(-50% + var(--ty) * 0.3)) scale(1.2); }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

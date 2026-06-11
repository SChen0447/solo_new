import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getHours,
  isToday,
  zhCN,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  HelpCircle,
  X as XIcon,
  BarChart3,
  Users,
  CalendarDays,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { Event, Vote, VoteStatus, StatsResponse } from '@/types';

const STATUS_ORDER: (VoteStatus | null)[] = ['available', 'hesitant', 'unavailable', null];

const STATUS_CONFIG = {
  available: {
    label: '有空',
    color: 'var(--color-available)',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    icon: Check,
  },
  hesitant: {
    label: '犹豫',
    color: 'var(--color-hesitant)',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: HelpCircle,
  },
  unavailable: {
    label: '没空',
    color: 'var(--color-unavailable)',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: XIcon,
  },
};

const VotePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [participantName, setParticipantName] = useState(state.participantName);
  const [nameInput, setNameInput] = useState(state.participantName);
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const slideProgress = useRef(0);
  const slideAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error('Event not found');
        const data = await response.json();
        setEvent(data.event);
        setVotes(data.votes);
        dispatch({ type: 'SET_EVENT', payload: data.event });
        dispatch({ type: 'SET_VOTES', payload: data.votes });

        if (data.event.candidateTimes.length > 0) {
          const firstDate = new Date(data.event.candidateTimes[0].startTime);
          setCurrentMonth(firstDate);
          setDisplayMonth(firstDate);
        }
      } catch (err) {
        setError('事件不存在或已过期');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events/${eventId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'initial') {
          if (message.data.stats) {
            setStats(message.data.stats);
            dispatch({ type: 'SET_STATS', payload: message.data.stats });
          }
          if (message.data.votes) {
            setVotes(message.data.votes);
            dispatch({ type: 'SET_VOTES', payload: message.data.votes });
          }
          if (message.data.event) {
            setEvent(message.data.event);
            dispatch({ type: 'SET_EVENT', payload: message.data.event });
          }
        } else if (message.type === 'vote_update') {
          if (message.data.stats) {
            setStats(message.data.stats);
            dispatch({ type: 'SET_STATS', payload: message.data.stats });
          }
          if (message.data.votes) {
            setVotes(message.data.votes);
            dispatch({ type: 'SET_VOTES', payload: message.data.votes });
          }
        }
      } catch (e) {
        console.error('WebSocket message parsing error:', e);
      }
    };

    websocket.onopen = () => {
      console.log('[VotePage] WebSocket connected');
    };

    return () => {
      websocket.close();
      if (slideAnimationRef.current) {
        cancelAnimationFrame(slideAnimationRef.current);
      }
    };
  }, [eventId, dispatch]);

  const getVoteStatus = useCallback(
    (candidateTimeId: string, participant: string): VoteStatus | null => {
      const vote = votes.find(
        (v) => v.candidateTimeId === candidateTimeId && v.participantName === participant
      );
      return vote?.status || null;
    },
    [votes]
  );

  const getStatusCounts = useCallback(
    (candidateTimeId: string) => {
      const timeVotes = votes.filter((v) => v.candidateTimeId === candidateTimeId);
      return {
        available: timeVotes.filter((v) => v.status === 'available').length,
        hesitant: timeVotes.filter((v) => v.status === 'hesitant').length,
        unavailable: timeVotes.filter((v) => v.status === 'unavailable').length,
      };
    },
    [votes]
  );

  const triggerCellAnimation = (cellId: string) => {
    setAnimatingCells((prev) => new Set(prev).add(cellId));
    setTimeout(() => {
      setAnimatingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    }, 250);
  };

  const vibrate = (pattern: number | number[]) => {
    try {
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
    }
  };

  const handleCellClick = async (candidateTimeId: string) => {
    if (!participantName.trim()) {
      alert('请先输入您的姓名');
      return;
    }

    vibrate([10, 20, 10]);
    triggerCellAnimation(candidateTimeId);

    const currentStatus = getVoteStatus(candidateTimeId, participantName);
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];

    if (nextStatus === null) {
      return;
    }

    const localVote: Vote = {
      id: Date.now().toString(),
      eventId: eventId!,
      candidateTimeId,
      participantName,
      status: nextStatus,
      timestamp: new Date().toISOString(),
    };

    const existingIndex = votes.findIndex(
      (v) => v.candidateTimeId === candidateTimeId && v.participantName === participantName
    );
    let newVotes;
    if (existingIndex >= 0) {
      newVotes = [...votes];
      newVotes[existingIndex] = localVote;
    } else {
      newVotes = [...votes, localVote];
    }
    setVotes(newVotes);
    dispatch({ type: 'ADD_VOTE', payload: localVote });

    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          candidateTimeId,
          participantName,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.error('Vote submission failed:', err);
    }
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setParticipantName(nameInput.trim());
      dispatch({ type: 'SET_PARTICIPANT', payload: nameInput.trim() });
      vibrate(10);
    }
  };

  const animateMonthSwitch = (direction: 'left' | 'right', targetMonth: Date) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection(direction);

    const duration = 300;
    const startTime = performance.now();
    const startMonth = new Date(currentMonth);

    const animate =
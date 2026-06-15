import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Question, Exam, ExamState, StudentAnswers, QuestionType } from '../types';

interface ExamStore {
  exams: Exam[];
  questionBank: Question[];
  examState: ExamState;
  currentPage: string;

  setCurrentPage: (page: string) => void;

  createExam: (title: string, description: string, duration?: number) => Exam;
  updateExam: (id: string, data: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  publishExam: (id: string) => void;
  getExamById: (id: string) => Exam | undefined;

  addQuestion: (examId: string, question: Omit<Question, 'id'>) => void;
  updateQuestion: (examId: string, questionId: string, data: Partial<Question>) => void;
  deleteQuestion: (examId: string, questionId: string) => void;

  addQuestionsToBank: (questions: Omit<Question, 'id'>[]) => Question[];
  generateRandomExam: (title: string, count: number, duration?: number) => Exam | null;

  startExam: (examId: string) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setAnswer: (questionId: string, answer: string | string[]) => void;
  submitExam: (studentId: string, studentName: string, className?: string) => ExamResult | null;
  resetExamState: () => void;
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const initialExams: Exam[] = loadFromStorage('examforge_exams', []);
const initialQuestionBank: Question[] = loadFromStorage('examforge_questionBank', []);

export const useExamStore = create<ExamStore>((set, get) => ({
  exams: initialExams,
  questionBank: initialQuestionBank,
  examState: {
    currentExamId: null,
    currentQuestionIndex: 0,
    answers: {},
    startTime: null,
    isSubmitted: false,
    result: null,
  },
  currentPage: 'examManage',

  setCurrentPage: (page) => set({ currentPage: page }),

  createExam: (title, description, duration = 60) => {
    const newExam: Exam = {
      id: uuidv4(),
      title,
      description,
      status: 'draft',
      duration,
      questions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => {
      const exams = [...state.exams, newExam];
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
    return newExam;
  },

  updateExam: (id, data) => {
    set((state) => {
      const exams = state.exams.map((exam) =>
        exam.id === id ? { ...exam, ...data, updatedAt: Date.now() } : exam
      );
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
  },

  deleteExam: (id) => {
    set((state) => {
      const exams = state.exams.filter((exam) => exam.id !== id);
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
  },

  publishExam: (id) => {
    set((state) => {
      const exams = state.exams.map((exam) =>
        exam.id === id
          ? { ...exam, status: 'published' as const, updatedAt: Date.now() }
          : exam
      );
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
  },

  getExamById: (id) => {
    return get().exams.find((exam) => exam.id === id);
  },

  addQuestion: (examId, question) => {
    const newQuestion: Question = {
      ...question,
      id: uuidv4(),
    };
    set((state) => {
      const exams = state.exams.map((exam) =>
        exam.id === examId
          ? {
              ...exam,
              questions: [...exam.questions, newQuestion],
              updatedAt: Date.now(),
            }
          : exam
      );
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
  },

  updateQuestion: (examId, questionId, data) => {
    set((state) => {
      const exams = state.exams.map((exam) =>
        exam.id === examId
          ? {
              ...exam,
              questions: exam.questions.map((q) =>
                q.id === questionId ? { ...q, ...data } : q
              ),
              updatedAt: Date.now(),
            }
          : exam
      );
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
  },

  deleteQuestion: (examId, questionId) => {
    set((state) => {
      const exams = state.exams.map((exam) =>
        exam.id === examId
          ? {
              ...exam,
              questions: exam.questions.filter((q) => q.id !== questionId),
              updatedAt: Date.now(),
            }
          : exam
      );
      saveToStorage('examforge_exams', exams);
      return { exams };
    });
  },

  addQuestionsToBank: (questions) => {
    const newQuestions: Question[] = questions.map((q) => ({
      ...q,
      id: uuidv4(),
    }));
    set((state) => {
      const questionBank = [...state.questionBank, ...newQuestions];
      saveToStorage('examforge_questionBank', questionBank);
      return { questionBank };
    });
    return newQuestions;
  },

  generateRandomExam: (title, count, duration = 60) => {
    const { questionBank, createExam } = get();
    if (questionBank.length < count) return null;

    const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const exam = createExam(title, `随机组卷 - ${count}道题`, duration);

    selected.forEach((q) => {
      get().addQuestion(exam.id, {
        type: q.type,
        question: q.question,
        options: q.options,
        answer: q.answer,
        score: q.score,
      });
    });

    return get().getExamById(exam.id) || null;
  },

  startExam: (examId) => {
    set({
      examState: {
        currentExamId: examId,
        currentQuestionIndex: 0,
        answers: {},
        startTime: Date.now(),
        isSubmitted: false,
        result: null,
      },
    });
  },

  setCurrentQuestionIndex: (index) => {
    set((state) => ({
      examState: { ...state.examState, currentQuestionIndex: index },
    }));
  },

  setAnswer: (questionId, answer) => {
    set((state) => ({
      examState: {
        ...state.examState,
        answers: { ...state.examState.answers, [questionId]: answer },
      },
    }));
  },

  submitExam: (studentId, studentName, className) => {
    const { examState, exams } = get();
    const exam = exams.find((e) => e.id === examState.currentExamId);
    if (!exam || examState.isSubmitted) return null;

    let totalScore = 0;
    let correctCount = 0;
    const scoreByType = {
      single: 0,
      multiple: 0,
      truefalse: 0,
    };

    exam.questions.forEach((q) => {
      const studentAnswer = examState.answers[q.id];
      let isCorrect = false;

      if (q.type === 'multiple') {
        const correctAns = Array.isArray(q.answer) ? q.answer.sort() : [q.answer];
        const studentAns = Array.isArray(studentAnswer) ? studentAnswer.sort() : [];
        isCorrect =
          correctAns.length === studentAns.length &&
          correctAns.every((a, i) => a === studentAns[i]);
      } else {
        isCorrect = studentAnswer === q.answer;
      }

      if (isCorrect) {
        totalScore += q.score;
        correctCount++;
        scoreByType[q.type as keyof typeof scoreByType] += q.score;
      }
    });

    const duration = Math.floor((Date.now() - (examState.startTime || Date.now())) / 1000);
    const correctRate = Math.round((correctCount / exam.questions.length) * 100);

    const result = {
      id: uuidv4(),
      examId: exam.id,
      examTitle: exam.title,
      studentId,
      studentName,
      className,
      totalScore,
      correctRate,
      duration,
      answers: examState.answers,
      scoreByType,
      submittedAt: Date.now(),
    };

    set((state) => ({
      examState: { ...state.examState, isSubmitted: true, result },
    }));

    return result;
  },

  resetExamState: () => {
    set({
      examState: {
        currentExamId: null,
        currentQuestionIndex: 0,
        answers: {},
        startTime: null,
        isSubmitted: false,
        result: null,
      },
    });
  },
}));

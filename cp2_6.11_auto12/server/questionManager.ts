import { v4 as uuidv4 } from 'uuid';
import type { Survey, SurveyResponse, Question, QuestionResponse } from '../src/types';

const surveys = new Map<string, Survey>();
const responses = new Map<string, SurveyResponse[]>();

export function createSurvey(title: string): Survey {
  const survey: Survey = {
    id: uuidv4(),
    title,
    questions: [],
    published: false,
  };
  surveys.set(survey.id, survey);
  responses.set(survey.id, []);
  return survey;
}

export function getSurvey(id: string): Survey | undefined {
  return surveys.get(id);
}

export function getAllSurveys(): Survey[] {
  return Array.from(surveys.values());
}

export function updateSurveyTitle(id: string, title: string): Survey | undefined {
  const survey = surveys.get(id);
  if (!survey) return undefined;
  survey.title = title;
  return survey;
}

export function addQuestion(surveyId: string, type: Question['type'], index?: number): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;

  const defaultOptions =
    type === 'rating'
      ? []
      : [
          { id: uuidv4(), text: '选项1' },
          { id: uuidv4(), text: '选项2' },
        ];

  const question: Question = {
    id: uuidv4(),
    type,
    title: type === 'single' ? '单选题' : type === 'multiple' ? '多选题' : '评分题',
    options: defaultOptions,
  };

  if (index !== undefined) {
    survey.questions.splice(index, 0, question);
  } else {
    survey.questions.push(question);
  }
  return survey;
}

export function updateQuestion(
  surveyId: string,
  questionId: string,
  updates: Partial<Pick<Question, 'title'>>
): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  const q = survey.questions.find((q) => q.id === questionId);
  if (!q) return undefined;
  if (updates.title !== undefined) q.title = updates.title;
  return survey;
}

export function addOption(surveyId: string, questionId: string): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  const q = survey.questions.find((q) => q.id === questionId);
  if (!q) return undefined;
  if (q.options.length >= 10) return undefined;
  q.options.push({ id: uuidv4(), text: `选项${q.options.length + 1}` });
  return survey;
}

export function updateOption(
  surveyId: string,
  questionId: string,
  optionId: string,
  text: string
): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  const q = survey.questions.find((q) => q.id === questionId);
  if (!q) return undefined;
  const opt = q.options.find((o) => o.id === optionId);
  if (!opt) return undefined;
  opt.text = text;
  return survey;
}

export function removeOption(
  surveyId: string,
  questionId: string,
  optionId: string
): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  const q = survey.questions.find((q) => q.id === questionId);
  if (!q) return undefined;
  q.options = q.options.filter((o) => o.id !== optionId);
  return survey;
}

export function removeQuestion(surveyId: string, questionId: string): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  survey.questions = survey.questions.filter((q) => q.id !== questionId);
  return survey;
}

export function moveQuestion(surveyId: string, questionId: string, newIndex: number): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  const oldIndex = survey.questions.findIndex((q) => q.id === questionId);
  if (oldIndex === -1) return undefined;
  const [q] = survey.questions.splice(oldIndex, 1);
  survey.questions.splice(newIndex, 0, q);
  return survey;
}

export function publishSurvey(surveyId: string): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  survey.published = true;
  return survey;
}

export function resetSurvey(surveyId: string): Survey | undefined {
  const survey = surveys.get(surveyId);
  if (!survey) return undefined;
  responses.set(surveyId, []);
  return survey;
}

export function addResponse(surveyId: string, answers: QuestionResponse[]): SurveyResponse | undefined {
  const survey = surveys.get(surveyId);
  if (!survey || !survey.published) return undefined;
  const resp: SurveyResponse = {
    id: uuidv4(),
    surveyId,
    answers,
    createdAt: Date.now(),
  };
  const arr = responses.get(surveyId) || [];
  arr.push(resp);
  responses.set(surveyId, arr);
  return resp;
}

export function getResponses(surveyId: string): SurveyResponse[] {
  return responses.get(surveyId) || [];
}

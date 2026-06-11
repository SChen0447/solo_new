import { v4 as uuidv4 } from 'uuid';
import type { Survey, Response, SurveyStats, QuestionStats } from '../types';

const SURVEYS_KEY = 'survey_platform_surveys';
const RESPONSES_KEY = 'survey_platform_responses';

function loadSurveys(): Survey[] {
  const data = localStorage.getItem(SURVEYS_KEY);
  if (!data) {
    const sample = createSampleData();
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(sample.surveys));
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(sample.responses));
    return sample.surveys;
  }
  return JSON.parse(data);
}

function saveSurveys(surveys: Survey[]) {
  localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
}

function loadResponses(): Response[] {
  const data = localStorage.getItem(RESPONSES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveResponses(responses: Response[]) {
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
}

function createSampleData() {
  const surveyId1 = uuidv4();
  const q1Id = uuidv4();
  const q2Id = uuidv4();
  const q3Id = uuidv4();
  const q4Id = uuidv4();
  const q5Id = uuidv4();

  const surveys: Survey[] = [
    {
      id: surveyId1,
      title: '用户满意度调查',
      description: '感谢您参与本次调查，您的反馈对我们非常重要！',
      createdAt: Date.now() - 86400000 * 3,
      questions: [
        {
          id: q1Id,
          type: 'radio',
          title: '您的年龄段是？',
          required: true,
          options: ['18岁以下', '18-25岁', '26-35岁', '36-45岁', '46岁以上'],
        },
        {
          id: q2Id,
          type: 'checkbox',
          title: '您平时使用哪些功能？（可多选）',
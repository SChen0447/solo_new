import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { WSMessage, QuestionResponse } from '../src/types';
import * as qm from './questionManager';

const app = express();
app.use(express.json());

const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg: WSMessage) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as WSMessage;
      broadcast(msg);
    } catch {
      // ignore malformed messages
    }
  });
});

app.post('/api/surveys', (_req, res) => {
  const { title } = _req.body as { title?: string };
  const survey = qm.createSurvey(title || '未命名问卷');
  res.json(survey);
});

app.get('/api/surveys', (_req, res) => {
  res.json(qm.getAllSurveys());
});

app.get('/api/surveys/:id', (req, res) => {
  const survey = qm.getSurvey(req.params.id);
  if (!survey) return res.status(404).json({ error: '未找到问卷' });
  res.json(survey);
});

app.put('/api/surveys/:id/title', (req, res) => {
  const { title } = req.body as { title: string };
  const survey = qm.updateSurveyTitle(req.params.id, title);
  if (!survey) return res.status(404).json({ error: '未找到问卷' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.post('/api/surveys/:id/questions', (req, res) => {
  const { type, index } = req.body as { type: 'single' | 'multiple' | 'rating'; index?: number };
  const survey = qm.addQuestion(req.params.id, type, index);
  if (!survey) return res.status(404).json({ error: '未找到问卷' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.put('/api/surveys/:id/questions/:qid', (req, res) => {
  const { title } = req.body as { title?: string };
  const survey = qm.updateQuestion(req.params.id, req.params.qid, { title: title! });
  if (!survey) return res.status(404).json({ error: '未找到问卷或题目' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.delete('/api/surveys/:id/questions/:qid', (req, res) => {
  const survey = qm.removeQuestion(req.params.id, req.params.qid);
  if (!survey) return res.status(404).json({ error: '未找到问卷' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.post('/api/surveys/:id/questions/:qid/options', (req, res) => {
  const survey = qm.addOption(req.params.id, req.params.qid);
  if (!survey) return res.status(400).json({ error: '操作失败' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.put('/api/surveys/:id/questions/:qid/options/:oid', (req, res) => {
  const { text } = req.body as { text: string };
  const survey = qm.updateOption(req.params.id, req.params.qid, req.params.oid, text);
  if (!survey) return res.status(404).json({ error: '未找到' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.delete('/api/surveys/:id/questions/:qid/options/:oid', (req, res) => {
  const survey = qm.removeOption(req.params.id, req.params.qid, req.params.oid);
  if (!survey) return res.status(404).json({ error: '未找到' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.post('/api/surveys/:id/publish', (req, res) => {
  const survey = qm.publishSurvey(req.params.id);
  if (!survey) return res.status(404).json({ error: '未找到问卷' });
  broadcast({ type: 'survey_updated', payload: survey });
  res.json(survey);
});

app.post('/api/surveys/:id/reset', (req, res) => {
  const survey = qm.resetSurvey(req.params.id);
  if (!survey) return res.status(404).json({ error: '未找到问卷' });
  broadcast({ type: 'survey_reset', payload: { surveyId: req.params.id } });
  res.json(survey);
});

app.post('/api/surveys/:id/responses', (req, res) => {
  const { answers } = req.body as { answers: QuestionResponse[] };
  const resp = qm.addResponse(req.params.id, answers);
  if (!resp) return res.status(400).json({ error: '提交失败' });
  broadcast({ type: 'new_response', payload: resp });
  res.json(resp);
});

app.get('/api/surveys/:id/responses', (req, res) => {
  res.json(qm.getResponses(req.params.id));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

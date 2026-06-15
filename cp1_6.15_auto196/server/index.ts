import express from 'express';
import cors from 'cors';
import { IncomingForm } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getRequirements,
  createRequirement,
  getDemosByReqId,
  createDemo,
  getFeedbackByDemoId,
  createFeedback,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.get('/api/requirements', (req, res) => {
  try {
    const requirements = getRequirements();
    res.json(requirements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

app.post('/api/requirements', (req, res) => {
  try {
    const { title, style_tags, lyrics_direction, reference_style, deadline } = req.body;
    const id = uuidv4();
    createRequirement(id, title, style_tags, lyrics_direction, reference_style, deadline);
    res.json({ id, message: 'Requirement created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

app.get('/api/demos/:reqId', (req, res) => {
  try {
    const { reqId } = req.params;
    const demos = getDemosByReqId(reqId);
    res.json(demos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch demos' });
  }
});

app.post('/api/demos', (req, res) => {
  const form = new IncomingForm({
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'File upload failed' });
    }

    try {
      const reqId = Array.isArray(fields.req_id) ? fields.req_id[0] : fields.req_id;
      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
      const creator = Array.isArray(fields.creator) ? fields.creator[0] : fields.creator;

      if (!reqId || !title || !creator) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const file = files.file as any;
      if (!file || !file[0]) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadedFile = file[0];
      const id = uuidv4();
      const newFilename = `${id}${path.extname(uploadedFile.originalFilename || '.mp3')}`;
      const newFilePath = path.join(uploadsDir, newFilename);

      fs.renameSync(uploadedFile.filepath, newFilePath);

      createDemo(
        id,
        reqId,
        title,
        creator,
        uploadedFile.originalFilename || 'unknown.mp3',
        `/uploads/${newFilename}`,
        0
      );

      res.json({ id, message: 'Demo uploaded successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save demo' });
    }
  });
});

app.get('/api/feedback/:demoId', (req, res) => {
  try {
    const { demoId } = req.params;
    const feedback = getFeedbackByDemoId(demoId);
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

app.post('/api/feedback', (req, res) => {
  try {
    const { demo_id, tech_score, creative_score, comment, status } = req.body;
    const id = uuidv4();
    createFeedback(id, demo_id, tech_score, creative_score, comment, status);
    res.json({ id, message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

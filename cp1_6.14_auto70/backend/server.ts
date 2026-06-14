import express, { type Request, type Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
const PORT = 5174;

app.use(cors());
app.use(express.json());

const distDir = path.resolve(process.cwd(), 'dist');
const dataDir = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(express.static(distDir));

interface SaveRequest {
  type: 'config' | 'replay';
  data: any;
  filename: string;
}

app.post('/api/save', (req: Request, res: Response) => {
  try {
    const { type, data, filename } = req.body as SaveRequest;

    if (!type || !data || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, data, filename'
      });
    }

    if (type !== 'config' && type !== 'replay') {
      return res.status(400).json({
        success: false,
        error: "Invalid type. Must be 'config' or 'replay'"
      });
    }

    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    res.json({ success: true, filename });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/load/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

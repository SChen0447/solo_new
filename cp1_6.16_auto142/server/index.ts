import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

interface SceneData {
  id: string;
  name: string;
  createdAt: number;
  data: any;
}

const sceneStorage = new Map<string, SceneData>();

app.post('/api/save', (req: Request, res: Response) => {
  try {
    const { name, data } = req.body;
    const id = uuidv4();
    const scene: SceneData = {
      id,
      name: name || `场景_${Date.now()}`,
      createdAt: Date.now(),
      data,
    };
    sceneStorage.set(id, scene);
    res.json({ success: true, id, scene });
  } catch (error) {
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

app.get('/api/load', (req: Request, res: Response) => {
  try {
    const scenes = Array.from(sceneStorage.values());
    res.json({ success: true, scenes });
  } catch (error) {
    res.status(500).json({ success: false, error: '加载失败' });
  }
});

app.get('/api/load/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scene = sceneStorage.get(id);
    if (!scene) {
      return res.status(404).json({ success: false, error: '场景不存在' });
    }
    res.json({ success: true, scene });
  } catch (error) {
    res.status(500).json({ success: false, error: '加载失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

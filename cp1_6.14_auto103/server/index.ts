import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import artworkRoutes from './routes/artworks.js';
import exhibitionRoutes from './routes/exhibitions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.use('/api/artworks', artworkRoutes);
app.use('/api/exhibitions', exhibitionRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

app.use((error: Error, _req: express.Request, res: express.Response) => {
  console.error(error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

export default app;

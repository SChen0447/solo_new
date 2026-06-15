import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseRSS } from './rssParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Read stats error:', e);
  }
  return { weeklyStats: [], allStats: {} };
}

function writeStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Write stats error:', e);
    return false;
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/parse', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'RSS URL is required' });
    }

    let feedUrl = String(url);
    if (!feedUrl.startsWith('http://') && !feedUrl.startsWith('https://')) {
      feedUrl = 'https://' + feedUrl;
    }

    const response = await axios.get(feedUrl, {
      timeout: 15000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastManager/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    const parsed = await parseRSS(response.data);
    parsed.rssUrl = String(url);

    res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('Parse RSS error:', error.message);
    let errorMsg = 'Failed to fetch or parse RSS feed';
    if (error.code === 'ECONNABORTED') errorMsg = 'Request timed out';
    else if (error.code === 'ENOTFOUND') errorMsg = 'Host not found';
    else if (error.response) {
      errorMsg = `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.message.includes('parse')) {
      errorMsg = error.message;
    }
    res.status(500).json({ success: false, error: errorMsg });
  }
});

app.post('/api/stats', (req, res) => {
  try {
    const stats = req.body;
    if (!stats) {
      return res.status(400).json({ success: false, error: 'Stats data required' });
    }
    const current = readStats();
    const merged = {
      ...current,
      ...stats,
      lastUpdated: Date.now(),
    };
    writeStats(merged);
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('Save stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = readStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Podcast Manager Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  API Endpoints:`);
  console.log(`    GET  /api/parse?url=<rss_url>`);
  console.log(`    GET  /api/stats`);
  console.log(`    POST /api/stats`);
  console.log(`    GET  /api/health`);
  console.log(`========================================\n`);
});

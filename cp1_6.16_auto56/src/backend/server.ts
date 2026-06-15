import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

interface CustomHeader {
  key: string;
  value: string;
}

interface EndpointConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  responseData: any;
  statusCode: number;
  delay: number;
  headers: CustomHeader[];
  enabled: boolean;
  createdAt: number;
}

interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  endpointId?: string;
}

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'endpoints.json');

let endpoints: EndpointConfig[] = [];
let requestLogs: RequestLogEntry[] = [];

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveEndpoints() {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(endpoints, null, 2));
}

function loadEndpoints() {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      endpoints = JSON.parse(data);
    } catch {
      endpoints = [];
    }
  }
}

function matchEndpoint(reqMethod: string, reqPath: string): EndpointConfig | null {
  for (const ep of endpoints) {
    if (!ep.enabled) continue;
    if (ep.method !== reqMethod.toUpperCase()) continue;

    const paramNames: string[] = [];
    const regexStr = ep.path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);
    const match = reqPath.match(regex);
    if (match) {
      return ep;
    }
  }
  return null;
}

function extractParams(epPath: string, reqPath: string): Record<string, string> {
  const params: Record<string, string> = {};
  const paramNames: string[] = [];
  const regexStr = epPath.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const regex = new RegExp(`^${regexStr}$`);
  const match = reqPath.match(regex);
  if (match) {
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });
  }
  return params;
}

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
    return next();
  }

  const ep = matchEndpoint(req.method, req.path);
  if (!ep) {
    return next();
  }

  const start = Date.now();
  const reqParams = extractParams(ep.path, req.path);

  const timeout = setTimeout(() => {
    if (res.headersSent) return;

    for (const h of ep.headers) {
      res.setHeader(h.key, h.value);
    }
    res.setHeader('X-Mock-Server', 'true');
    res.status(ep.statusCode).json(ep.responseData);

    const elapsed = Date.now() - start;
    const logEntry: RequestLogEntry = {
      id: uuidv4(),
      method: ep.method,
      path: req.path,
      query: req.query as Record<string, any>,
      params: reqParams,
      body: req.body,
      statusCode: ep.statusCode,
      responseTime: elapsed,
      timestamp: Date.now(),
      endpointId: ep.id,
    };
    requestLogs.unshift(logEntry);
    if (requestLogs.length > 500) requestLogs = requestLogs.slice(0, 500);
    io.emit('request-log', logEntry);
  }, ep.delay);

  res.on('close', () => clearTimeout(timeout));
});

app.get('/api/endpoints', (_req, res) => {
  res.json(endpoints);
});

app.post('/api/endpoints', (req, res) => {
  const { method, path: epPath, description, responseData, statusCode, delay, headers } = req.body;

  if (!method || !epPath) {
    res.status(400).json({ error: 'Method and path are required' });
    return;
  }

  const newEndpoint: EndpointConfig = {
    id: uuidv4(),
    method,
    path: epPath.startsWith('/') ? epPath : `/${epPath}`,
    description: description || '',
    responseData: responseData ?? {},
    statusCode: statusCode ?? 200,
    delay: delay ?? 0,
    headers: headers ?? [],
    enabled: true,
    createdAt: Date.now(),
  };

  endpoints.push(newEndpoint);
  saveEndpoints();

  res.json(newEndpoint);
});

app.put('/api/endpoints/:id', (req, res) => {
  const { id } = req.params;
  const idx = endpoints.findIndex((ep) => ep.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Endpoint not found' });
    return;
  }

  endpoints[idx] = { ...endpoints[idx], ...req.body, id: endpoints[idx].id, createdAt: endpoints[idx].createdAt };
  saveEndpoints();

  res.json(endpoints[idx]);
});

app.delete('/api/endpoints/:id', (req, res) => {
  const { id } = req.params;
  const idx = endpoints.findIndex((ep) => ep.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Endpoint not found' });
    return;
  }

  endpoints.splice(idx, 1);
  saveEndpoints();

  res.json({ success: true });
});

app.get('/api/logs', (_req, res) => {
  res.json(requestLogs.slice(0, 200));
});

app.delete('/api/logs', (_req, res) => {
  requestLogs = [];
  io.emit('logs-cleared');
  res.json({ success: true });
});

app.post('/api/import', (req, res) => {
  const { endpoints: importedEndpoints, editorContent } = req.body;
  if (importedEndpoints && Array.isArray(importedEndpoints)) {
    endpoints = importedEndpoints.map((ep: any) => ({
      id: ep.id || uuidv4(),
      method: ep.method || 'GET',
      path: ep.path || '/',
      description: ep.description || '',
      responseData: ep.responseData ?? {},
      statusCode: ep.statusCode ?? 200,
      delay: ep.delay ?? 0,
      headers: ep.headers ?? [],
      enabled: ep.enabled !== false,
      createdAt: ep.createdAt || Date.now(),
    }));
    saveEndpoints();
  }
  res.json({ success: true, endpoints, editorContent: editorContent || '' });
});

app.get('/api/export', (_req, res) => {
  res.json({ endpoints, exportedAt: new Date().toISOString() });
});

app.get('/api/projects', (_req, res) => {
  const projectsDir = path.join(__dirname, '..', '..', 'data', 'projects');
  if (!fs.existsSync(projectsDir)) {
    res.json([]);
    return;
  }
  const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.json'));
  const projects = files.map((f) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(projectsDir, f), 'utf-8'));
      return { name: data.name, savedAt: data.savedAt };
    } catch {
      return null;
    }
  }).filter(Boolean);
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name, editorContent, endpoints: projectEndpoints } = req.body;
  const projectsDir = path.join(__dirname, '..', '..', 'data', 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.json'));
  if (files.length >= 5) {
    const oldest = files
      .map((f) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(projectsDir, f), 'utf-8'));
          return { file: f, savedAt: data.savedAt || 0 };
        } catch {
          return { file: f, savedAt: 0 };
        }
      })
      .sort((a, b) => a.savedAt - b.savedAt)[0];
    if (oldest) {
      fs.unlinkSync(path.join(projectsDir, oldest.file));
    }
  }

  const projectData = {
    name,
    editorContent,
    endpoints: projectEndpoints,
    savedAt: Date.now(),
  };
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  fs.writeFileSync(path.join(projectsDir, `${safeName}.json`), JSON.stringify(projectData, null, 2));
  res.json({ success: true });
});

app.get('/api/projects/:name', (req, res) => {
  const projectsDir = path.join(__dirname, '..', '..', 'data', 'projects');
  const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(projectsDir, `${safeName}.json`);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
});

io.on('connection', (socket) => {
  socket.emit('request-logs-history', requestLogs.slice(0, 50));
  socket.on('disconnect', () => {});
});

loadEndpoints();

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`API Mock Server running on http://localhost:${PORT}`);
});

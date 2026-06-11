import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { Headers } from 'node-fetch';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
}

app.post('/api/proxy', async (req, res) => {
  const { method, url, headers, body }: ProxyRequest = req.body;

  if (!method || !url) {
    return res.status(400).json({ error: 'Method and URL are required' });
  }

  const startTime = Date.now();

  try {
    const fetchHeaders = new Headers();
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (key && value !== undefined) {
          fetchHeaders.append(key, value);
        }
      });
    }

    const fetchOptions: any = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
    };

    if (body && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD') {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const endTime = Date.now();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBody = await response.text();

    const proxyResponse: ProxyResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      responseTime: endTime - startTime,
    };

    res.json(proxyResponse);
  } catch (error: any) {
    const endTime = Date.now();
    res.status(500).json({
      error: error.message || 'Request failed',
      responseTime: endTime - startTime,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Postman Lite server running on http://localhost:${PORT}`);
});

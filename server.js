'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const httpServer = require('http-server');

const port = Number(process.env.PORT) || 5174;
const host = '0.0.0.0';
const apiBase = process.env.OCR_API_URL || process.env.API_BASE_URL || '';

const staticServer = httpServer.createServer({
  root: path.resolve(__dirname, '.'),
  cache: process.env.NODE_ENV === 'production' ? 3600 : 0,
  before: [
    function proxyApi(req, res) {
      if (!req.url.startsWith('/api/')) {
        res.emit('next');
        return;
      }

      if (!apiBase) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'OCR_API_URL is not configured' }));
        return;
      }

      forwardApiRequest(req, res);
    },
  ],
});

staticServer.listen(port, host, () => {
  console.log(`Frontend listening on http://${host}:${port}`);
});

function forwardApiRequest(req, res) {
  let targetUrl;
  try {
    const base = new URL(apiBase);
    targetUrl = new URL(req.url, base);
  } catch (error) {
    console.error('Invalid OCR_API_URL:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid OCR_API_URL setting' }));
    return;
  }

  const client = targetUrl.protocol === 'https:' ? https : http;
  const headers = { ...req.headers, host: targetUrl.host };

  const proxyRequest = client.request(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: req.method,
      headers,
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res, { end: true });
    }
  );

  proxyRequest.on('error', (error) => {
    console.error('API proxy error:', error);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Failed to reach OCR API' }));
  });

  req.pipe(proxyRequest, { end: true });

  res.on('close', () => {
    proxyRequest.destroy();
  });
}

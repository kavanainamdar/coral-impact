import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Serve static assets from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Health endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// SPA fallback: send index.html for all unmatched GET routes
app.get('*', (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

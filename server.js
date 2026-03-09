import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Filter } from 'bad-words';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = 5858;

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  }
}

// Heartbeat to keep connections alive
setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.ping();
    }
  }
}, 30000);

// Profanity filter
const filter = new Filter();
filter.addWords(
  'nazi', 'hitler', 'heil', 'swastika', 'kkk', 'whitepow',
  'whitepower', 'n1gger', 'n1gga', 'f4ggot', 'f4g',
  'tr4nny', 'ch1nk', 'sp1c', 'k1ke', 'wetb4ck'
);

// Data file path (persisted in Docker volume)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'styles.json');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function loadStyles() {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveStyles(styles) {
  writeFileSync(DATA_FILE, JSON.stringify(styles, null, 2));
}

// Rate limit: max 5 posts per IP per minute
const rateLimits = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || [];
  const recent = entry.filter(t => now - t < 60000);
  if (recent.length >= 5) return false;
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of rateLimits) {
    const recent = times.filter(t => now - t < 60000);
    if (recent.length === 0) rateLimits.delete(ip);
    else rateLimits.set(ip, recent);
  }
}, 300000);

app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// --- API Routes ---

app.get('/api/styles', (req, res) => {
  const styles = loadStyles();
  res.json(styles);
});

app.post('/api/styles', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many submissions. Wait a minute.' });
  }

  const { username, formatString, label } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (!formatString || typeof formatString !== 'string' || formatString.trim().length === 0) {
    return res.status(400).json({ error: 'Format string is required.' });
  }

  const cleanUsername = username.trim().slice(0, 24);
  const cleanLabel = (label || '').trim().slice(0, 40);
  const cleanFormat = formatString.trim().slice(0, 200);

  if (filter.isProfane(cleanUsername) || filter.isProfane(cleanLabel)) {
    return res.status(400).json({ error: 'Inappropriate content detected.' });
  }

  const visibleText = cleanFormat.replace(/<#[0-9A-Fa-f]{6}>|<\/#[0-9A-Fa-f]{6}>|&[0-9a-fk-or]/gi, '');
  if (filter.isProfane(visibleText)) {
    return res.status(400).json({ error: 'Inappropriate content detected.' });
  }

  const styles = loadStyles();

  const newStyle = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    username: cleanUsername,
    label: cleanLabel,
    formatString: cleanFormat,
    createdAt: new Date().toISOString(),
  };

  styles.unshift(newStyle);
  if (styles.length > 500) styles.length = 500;

  saveStyles(styles);

  // Broadcast new style to all connected clients
  broadcast({ type: 'new_style', style: newStyle });

  res.status(201).json(newStyle);
});

// SPA fallback (Express 5 syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MCStyle server running on port ${PORT}`);
});

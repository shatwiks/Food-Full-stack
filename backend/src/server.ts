import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initWss } from './lib/wss.js';

dotenv.config();

const port = Number(process.env.PORT ?? 3001);

// Wrap Express in a plain http.Server so the WS server can share the same port.
const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
initWss(wss);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`OrderFlow backend listening on http://localhost:${port}`);
  console.log(`OrderFlow WebSocket listening on ws://localhost:${port}/ws`);
});

import { createServer } from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initSocketServer } from './socket.js';

dotenv.config();

const port = Number(process.env.PORT ?? 3001);

const httpServer = createServer(app);

// Initialize Socket.io server on the same HTTP instance
initSocketServer(httpServer);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`OrderFlow backend listening on http://localhost:${port}`);
  console.log(`OrderFlow Real-Time Socket.IO engine ready on port ${port}`);
});


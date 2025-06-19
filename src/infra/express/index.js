import { createServer } from 'http';
import { createExpressApp } from './app.js';
import { setupWebSocket } from './websocket.js';

export function startServer(port = 3009) {
  const app = createExpressApp();
  const server = createServer(app);
  const wss = setupWebSocket(server);

  server.listen(port, () => {
    console.log(`Servidor HTTP/Express rodando na porta ${port}`);
    console.log(`WebSocket ativo na mesma porta`);
  });

  return { app, server, wss };
}

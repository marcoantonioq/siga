import { Server } from 'socket.io';
import { login } from './app/siga/login.js';
import { empresas } from './app/siga/empresas.js';
import { igrejas } from './app/siga/igrejas.js';
import { empresaAlterar } from './app/siga/empresaAlternar.js';
import { carregarEventosSecretaria } from './app/siga/carregarEventosSecretaria.js';
import { carregarFluxo, carregarOfertas } from './app/siga/fluxos.js';
import { carregarDados } from './app/siga/carregarDados.js';
import { carregarSolicitacoes } from './app/siga/carregarSolictacoes.js';
import { preventiva } from './app/siga/preventiva.js';
import { token } from './app/siga/token.js';

const createResponse = (data = {}) => ({
  status: true,
  message: '',
  data,
  timestamp: new Date().toISOString(),
});

const handleRequest = (socket, event, fn) => {
  socket.on(event, async (payload, callback) => {
    const response = createResponse();
    try {
      response.data = JSON.stringify(await fn(payload));
    } catch (error) {
      response.status = false;
      response.message = error.message;
    }
    callback(response);
  });
};

export function setupWebSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.emit('connected', { success: true, id: socket.id });

    socket.on('login', async (data, callback) => {
      const response = createResponse({
        cookies: '',
        username: '',
        token: '',
      });
      response.status = false;

      try {
        if (!data.cookies) throw new Error('Cookies não informados.');

        const { data: auth } = await login(data.cookies);
        response.data = auth;
        response.message = auth.message || 'Login realizado com sucesso.';
        response.status = true;
      } catch (error) {
        response.message = error.message;
      }
      response.data = JSON.stringify(response.data);
      callback(response);
    });


    socket.on('token', async (data, callback) => {
      const response = createResponse({
        cookies: '',
        username: '',
        token: '',
      });
      response.token = await token(data)
      response.data = data;
      callback(response);
    })

    handleRequest(socket, 'getUnidades', empresas);
    handleRequest(socket, 'getIgrejas', igrejas);
    handleRequest(socket, 'empresaAlterar', empresaAlterar);
    handleRequest(socket, 'eventos', carregarEventosSecretaria);
    handleRequest(socket, 'fluxos', carregarFluxo);
    handleRequest(socket, 'ofertas', carregarOfertas);
    handleRequest(socket, 'dados', carregarDados);
    handleRequest(socket, 'solicitacoes', carregarSolicitacoes);
    handleRequest(socket, 'preventiva', preventiva);
  });

  return io;
}

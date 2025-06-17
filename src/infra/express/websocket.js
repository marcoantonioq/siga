import { Server } from 'socket.io';
import { login } from './app/siga/login.js';
import { empresas } from './app/siga/empresas.js';
import { igrejas } from './app/siga/igrejas.js';
import { empresaAlterar } from './app/siga/empresaAlternar.js';
import { carregarEventosSecretaria } from './app/siga/carregarEventosSecretaria.js';
import { carregarFluxo, carregarOfertas } from './app/siga/fluxos.js';

const createResponse = (data) => {
  return {
    status: true,
    message: '',
    data: {},
    timestamp: new Date().toISOString(),
  };
};

export function setupWebSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.emit('connected', { success: true, id: socket.id });

    socket.on('login', async (data, callback) => {
      const response = createResponse();
      response.status = false;
      response.data = {
        cookies: '',
        username: '',
        token: '',
      };

      try {
        if (data.cookies) {
          const { data: auth } = await login(data.cookies);
          response.status = true;
          response.data = auth;
          response.message = auth.message || 'Login realizado com sucesso.';
        } else {
          response.message = 'Cookies não informados.';
        }
      } catch (error) {
        response.message = error.message;
      }
      callback(response);
    });

    socket.on('getUnidades', async (auth, callback) => {
      const response = createResponse(auth);
      response.data = await empresas(auth);
      response.status = true;
      callback(response);
    });

    socket.on('getIgrejas', async (values, callback) => {
      const response = createResponse(values);
      response.data = await igrejas(values);
      response.status = true;
      callback(response);
    });

    socket.on('empresaAlterar', async (payload, callback) => {
      const response = createResponse();
      response.data = await empresaAlterar(payload);
      response.status = true;
      callback(response);
    });

    socket.on('carregarEventosSecretaria', async (payload, callback) => {
      const response = createResponse();
      response.data = await carregarEventosSecretaria(payload);
      response.status = true;
      callback(response);
    });

    socket.on('fluxos', async (payload, callback) => {
      const response = createResponse();
      response.data = await carregarFluxo(payload);
      response.status = true;
      callback(response);
    });

    socket.on('ofertas', async (payload, callback) => {
      const response = createResponse();
      response.data = await carregarOfertas(payload);
      response.status = true;
      callback(response);
    });

  });

  return io;
}

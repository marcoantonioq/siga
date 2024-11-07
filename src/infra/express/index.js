import express from 'express';
import { searchDataAll } from '../../siga.js';

export const app = express();
const processingClients = {};

app.use(express.json({ limit: '1gb' }));

app.post('/siga', async (req, res) => {
  const { date1, date2, filter, cookies } = req.body;
  if (!(date1 && date2 && cookies)) {
    return res
      .status(400)
      .json({ error: 'Configurações ausentes no corpo da requisição.' });
  }

  let userCookie = '';
  let cacheKey = '';

  try {
    userCookie =
      cookies.match(/(;| )(user)=([^;]*)/i)?.[3] ||
      Math.random().toString(36).slice(2);
    if (!userCookie) throw new Error('Usuário cookie inválido!');

    cacheKey = `siga.${userCookie}`;
    console.log('cache id:', cacheKey);

    const cachedEntry = processingClients[cacheKey];

    if (cachedEntry) {
      // Se o cache ainda for válido, retorna o resultado em cache
      return res.json(await cachedEntry.promise);
    }

    const requestPromise = (async () => {
      const result = await searchDataAll(date1, date2, filter, cookies);
      return result;
    })();

    // Armazena a promessa e configura o tempo de expiração
    processingClients[cacheKey] = {
      promise: requestPromise,
    };

    const msg = await requestPromise;
    msg.success = true;

    // Define um timeout de 10s para limpar o cache
    setTimeout(() => {
      delete processingClients[cacheKey];
    }, 10000);

    res.json(msg);
  } catch (error) {
    console.log('Erro ao processar:', error);
    if (processingClients[cacheKey]) {
      delete processingClients[cacheKey];
    }
    res.status(400).json({ msg: error.message });
  }
});

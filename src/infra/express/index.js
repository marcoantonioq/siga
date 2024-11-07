import express from 'express';
import { searchDataAll } from '../../siga.js';

const CACHE_DURATION = 30 * 60 * 1000;

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

    cacheKey = userCookie ? `siga.${userCookie}.${date1}.${date2}` : null;

    console.log('cache id: ', cacheKey);

    if (!cacheKey) {
      return res
        .status(400)
        .json({ error: 'Cookie de usuário não encontrado.' });
    }

    const cachedEntry = processingClients[cacheKey];

    if (cachedEntry) {
      if (Date.now() < cachedEntry.expiration) {
        return res.json(await cachedEntry.promise);
      } else {
        delete processingClients[cacheKey];
      }
    }

    const requestPromise = (async () => {
      const result = await searchDataAll(date1, date2, filter, cookies);
      delete processingClients[cacheKey];
      return result;
    })();

    processingClients[cacheKey] = {
      promise: requestPromise,
      expiration: Date.now() + CACHE_DURATION,
    };

    const msg = await requestPromise;
    msg.success = true;
    res.json(msg);
  } catch (error) {
    console.log('Erro ao processar: ', error);
    if (processingClients[cacheKey]) {
      delete processingClients[cacheKey];
    }
    res.status(400).json({ msg: error.message });
  }
});

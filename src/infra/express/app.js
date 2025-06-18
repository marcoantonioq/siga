import express from 'express';
import { searchDataAll } from '../../siga.js';
import path from 'path';

export function createExpressApp() {
  const app = express();
  const processingClients = {};

  app.use(express.json({ limit: '1gb' }));

  // @ts-ignore
  app.post('/siga', async (req, res) => {
    const { date1, date2, filter, cookies, options } = req.body;
    if (!(date1 && date2 && cookies)) {
      return res.status(400).json({ error: 'Configurações ausentes no corpo da requisição.' });
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
        return res.json(await cachedEntry.promise);
      }

      const requestPromise = searchDataAll(date1, date2, filter, cookies, '', options);
      processingClients[cacheKey] = { promise: requestPromise };

      const msg = await requestPromise;
      msg.success = true;

      setTimeout(() => delete processingClients[cacheKey], 4 * 60 * 1000);

      res.json(msg);
    } catch (error) {
      console.log('Erro ao processar:', error);
      if (processingClients[cacheKey]) delete processingClients[cacheKey];
      res.status(200).json({ success: false, errors: [error.message] });
    }
  });

  app.get('/socket', (req, res) => {
    const htmlPath = path.resolve('clasp/socket.html');
    res.sendFile(htmlPath);
  });

  return app;
}

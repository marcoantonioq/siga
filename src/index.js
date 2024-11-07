import { HTTPClient } from './infra/http/index.js';
import { EventosRepo } from './repo/EventosRepo.js';
import { FluxosRepo } from './repo/FluxosRepo.js';
import { IgrejasRepo } from './repo/IgrejasRepo.js';
import { writeFileSync } from 'fs';
import { betweenDates } from './util/date.js';

async function searchDataAll(date1, date2, filter, cookies, username = '.') {
  const client = new HTTPClient({
    cookie: cookies,
  });

  const app = {
    fluxos: new FluxosRepo([], client),
    igrejas: new IgrejasRepo([], client),
    eventos: new EventosRepo([], client),
  };

  const msg = {
    settings: { date1, date2, filter, cookies, betweenDates: [] },
    tables: { igrejas: [], fluxos: [], eventos: [] },
    success: false,
    username,
    errors: [],
  };

  msg.settings.betweenDates = betweenDates(date1, date2);

  if (!(date1 && date2 && cookies)) {
    throw new Error('Configurações ausentes no corpo da requisição.');
  }

  console.log('Buscar informações: ', {
    username,
    date1,
    date2,
    filter,
    cookies,
  });

  (await app.igrejas.getIgrejas()).map((e) => msg.tables.igrejas.push(e));

  const filterRegex = new RegExp(filter, 'i');

  const adms = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
  );

  for (const adm of adms) {
    console.log('ADM: ', adm);

    const eventosAsync = app.eventos.getEventosSecretaria(
      date1,
      date2,
      adm.UNIDADE_COD
    );

    const fluxosAsync = Promise.all([
      app.igrejas.alterarIgreja(adm.UNIDADE_COD, adm.IGREJA_COD),
      app.fluxos.getDespesas(date1, date2, adm.IGREJA_COD),
      app.fluxos.getDepositos(date1, date2, adm.IGREJA_COD),
      app.fluxos.getColetas(date1, date2),
    ]);

    (await eventosAsync).map((e) => msg.tables.eventos.push(e));

    msg.tables.fluxos = (await fluxosAsync)
      .flat()
      .map((f) => {
        try {
          const igreja = msg.tables.igrejas.find(
            (ig) => ig?.IGREJA_DESC === f?.IGREJA_DESC
          );
          f.REGIONAL = igreja?.REGIONAL;
          f.IGREJA_ADM = igreja?.IGREJA_DESC;
          f.IGREJA_COD = igreja?.IGREJA_COD;
          f.IGREJA_TIPO = igreja?.IGREJA_TIPO;
        } catch (error) {
          console.log('Fluxo com erro: ', f);
          console.error('Erro ao buscar dados de fluxo: ', error);
        }
        return f;
      })
      .filter((f) => f);
  }

  writeFileSync('msg.json', JSON.stringify(msg, null, 2));
  console.log('Finalizado: ', msg.settings);
}

searchDataAll('2024-10-01', '2024-11-30', 'Itaberaí', '');

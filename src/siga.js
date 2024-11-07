import { HTTPClient } from './infra/http/index.js';
import { EventosRepo } from './repo/EventosRepo.js';
import { FluxosRepo } from './repo/FluxosRepo.js';
import { IgrejasRepo } from './repo/IgrejasRepo.js';
import { betweenDates } from './util/date.js';

export async function searchDataAll(
  date1,
  date2,
  filter,
  cookies,
  username = '.'
) {
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

  console.log('Buscar informações: ', msg.settings);

  (await app.igrejas.getIgrejas()).map((e) => msg.tables.igrejas.push(e));

  const filterRegex = new RegExp(filter, 'i');

  const adms = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
  );

  msg.username = client.username;

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
      .filter((e) => e)
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
          console.error('Erro ao buscar dados de fluxo: ', error);
        }
        return f;
      });
  }

  return msg;
}

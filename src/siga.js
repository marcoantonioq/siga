import fetch from 'node-fetch';
import { HTTPClient } from './infra/http/index.js';
import { EventosRepo } from './repo/EventosRepo.js';
import { FluxosRepo } from './repo/FluxosRepo.js';
import { IgrejasRepo } from './repo/IgrejasRepo.js';
import { betweenDates } from './util/date.js';
import { DadosRepo } from './repo/DadosRepo.js';

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
    dados: new DadosRepo([], client),
  };

  const msg = {
    settings: { date1, date2, filter, cookies, betweenDates: [] },
    tables: { igrejas: [], fluxos: [], eventos: [], dados: [] },
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

  /**
   * Buscar informações em secretarias
   */
  const secs = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 11 && filterRegex.test(e.IGREJA_DESC)
  );

  for (const sec of secs) {
    try {
      await app.igrejas.alterarIgreja(sec.UNIDADE_COD, sec.IGREJA_COD);
      await client.login();
      console.log('Coletando: ' + sec.IGREJA_DESC, client.token);
      (
        await Promise.all([
          app.dados.getDadosMinisterio(client.token),
          app.dados.getDadosAdministradores(client.token),
        ])
      )
        .flat()
        .forEach((e) => {
          msg.tables.dados.push(e);
        });
      break;
    } catch (error) {
      console.error('Erro ao coletar dados: ', error);
    }
  }

  /**
   * Buscar dados em administrações
   */

  const adms = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
  );

  msg.username = client.username;

  for (const adm of adms) {
    console.log('Coletando ' + adm.IGREJA_DESC);

    const eventos = await app.eventos.getEventosSecretaria(
      date1,
      date2,
      adm.UNIDADE_COD
    );
    msg.tables.eventos.push(...eventos);

    await app.igrejas.alterarIgreja(adm.UNIDADE_COD, adm.IGREJA_COD);

    const despesas = await app.fluxos.getDespesas(date1, date2, adm.IGREJA_COD);
    const depositos = await app.fluxos.getDepositos(
      date1,
      date2,
      adm.IGREJA_COD
    );
    const coletas = await app.fluxos.getColetas(date1, date2);

    const fluxos = [...despesas, ...depositos, ...coletas].map((f) => {
      const igrejaData = msg.tables.igrejas.find(
        (ig) => ig?.IGREJA_DESC === f?.IGREJA_DESC
      );
      if (igrejaData) {
        Object.assign(f, {
          REGIONAL: igrejaData.REGIONAL,
          IGREJA_ADM: igrejaData.IGREJA_DESC,
          IGREJA_COD: igrejaData.IGREJA_COD,
          IGREJA_TIPO: igrejaData.IGREJA_TIPO,
        });
      }
      return f;
    });

    if (fluxos) {
      msg.tables.fluxos.push(...fluxos);
    }
  }

  return msg;
}

import { HTTPClient } from './infra/http/index.js';
import { EventosRepo } from './repo/EventosRepo.js';
import { FluxosRepo } from './repo/FluxosRepo.js';
import { IgrejasRepo } from './repo/IgrejasRepo.js';
import { writeFileSync } from 'fs';

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
    tables: { igrejas: [], fluxos: [], eventos: [], empresas: [] },
    success: false,
    username,
    errors: [],
  };

  // if (!(date1 && date2 && cookies && username)) {
  //   throw new Error('Configurações ausentes no corpo da requisição.');
  // }

  // console.log('Buscar informações: ', {
  //   username,
  //   date1,
  //   date2,
  //   filter,
  //   cookies,
  // });

  (await app.igrejas.getIgrejas()).map((e) => msg.tables.igrejas.push(e));

  const filterRegex = new RegExp(filter, 'i');
  const adms = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
  );
  for (const adm of adms) {
    console.log('ADM: ', adm);

    (
      await Promise.all(
        app.igrejas.alterarIgreja(adm.UNIDADE_COD, adm.IGREJA_COD),
        app.fluxos.getDespesas(date1, date2, adm.IGREJA_COD),
        app.fluxos.getDepositos(date1, date2, adm.IGREJA_COD),
        app.fluxos.getColetas(date1, date2)
      )
    ).flatMap((e) => msg.tables.fluxos.push(e));

    (await app.eventos.getEventosSecretaria(date1, date2, adm.UNIDADE_COD)).map(
      (e) => msg.tables.eventos.push(e)
    );
  }

  writeFileSync('msg.json', JSON.stringify(msg, null, 2));
}

searchDataAll('2024-08-01', '2024-11-30', '', 'ApplicationGatewayAf');

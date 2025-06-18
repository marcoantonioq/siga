import { HTTPClient } from './infra/http/index.js';
import { EventosRepo } from './repo/EventosRepo.js';
import { FluxosRepo } from './repo/FluxosRepo.js';
import { IgrejasRepo } from './repo/IgrejasRepo.js';
import { betweenDates } from './util/date.js';
import { DadosRepo } from './repo/DadosRepo.js';
import { writeFileSync } from 'fs';
import { SolicitacoesRepo } from './repo/SolicitacoesRepo.js';

const saveJSON = async (data, filename) => {
  try {
    await writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Erro ao salvar arquivo: ', error);
  }
};

export async function searchDataAll(
  date1,
  date2,
  filter,
  cookies,
  username = '.',
  options = ['igrejas', 'fluxos', 'eventos', 'dados', 'solicitacoes'] // ofertas,
) {
  const client = new HTTPClient({
    cookie: cookies,
  });

  const app = {
    fluxos: new FluxosRepo([], client),
    igrejas: new IgrejasRepo([], client),
    eventos: new EventosRepo([], client),
    dados: new DadosRepo([], client),
    solicitacoes: new SolicitacoesRepo([], client),
  };

  const msg = {
    settings: { date1, date2, filter, cookies, betweenDates: [] },
    tables: {
      igrejas: [],
      fluxos: [],
      eventos: [],
      dados: [],
      solicitacoes: [],
    },
    success: false,
    username,
    errors: [],
  };

  msg.settings.betweenDates = betweenDates(date1, date2);

  if (!(date1 && date2 && cookies)) {
    throw new Error('Configurações ausentes no corpo da requisição.');
  }

  console.log('Buscar informações: ', msg.settings);

  (await app.igrejas.getUnidades()).map((e) => msg.tables.igrejas.push(e));

  const filterRegex = new RegExp(filter, 'i');

  /**
   * Buscar dados em administrações
   */
  const adms = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
  );

  await client.login();
  msg.username = client.username;

  for (const adm of adms) {
    console.log('Coletando ' + adm.IGREJA_DESC);
    await app.igrejas.alterarIgreja(adm.UNIDADE_COD, adm.IGREJA_COD);

    if (options.includes('eventos')) {
      const eventos = await app.eventos.getEventosSecretaria(
        date1,
        date2,
        adm.UNIDADE_COD
      );
      msg.tables.eventos.push(...eventos);
    }

    let ofertas = [];
    if (options.includes('ofertas')) {
      ofertas = await app.fluxos.getOfertas(date1, date2);
    }
    if (options.includes('fluxos')) {
      const despesas = await app.fluxos.getDespesas(
        date1,
        date2,
        adm.IGREJA_COD
      );
      const depositos = await app.fluxos.getDepositos(
        date1,
        date2,
        adm.IGREJA_COD
      );
      const coletas = await app.fluxos.getColetas(date1, date2);

      const fluxos = [...despesas, ...depositos, ...coletas, ...ofertas].map(
        (f) => {
          const id = f.IGREJA_DESC.match(/\b\d{2}-\d+\b/)?.[0] || null;
          const igrejaData = msg.tables.igrejas.find(
            (ig) =>
              (id && ig.IGREJA_DESC.includes(id)) ||
              ig?.IGREJA_DESC === f?.IGREJA_DESC
          );

          if (igrejaData) {
            Object.assign(f, {
              IGREJA_COD: igrejaData.IGREJA_COD,
              IGREJA_TIPO: igrejaData.IGREJA_TIPO,
            });
          }

          return Object.assign(f, {
            IGREJA: f.IGREJA.replace(/^BR \d+-\d+ -/, '').trim(),
            REGIONAL: adm.REGIONAL,
            IGREJA_ADM: adm.IGREJA_ADM,
          });
        }
      );

      msg.tables.fluxos.push(...fluxos);
    }
  }

  /**
   * Buscar informações em secretarias
   */
  const secs = msg.tables.igrejas.filter(
    (e) => e.IGREJA_TIPO === 11 && filterRegex.test(e.IGREJA_DESC)
  );

  for (const sec of secs) {
    try {
      await app.igrejas.alterarIgreja(sec.UNIDADE_COD, sec.IGREJA_COD);
      if (options.includes('dados')) {
        const { secretaria_cadastro } = await app.dados.access();
        if (secretaria_cadastro) {
          console.log('Coletando: ' + sec.IGREJA_DESC);
          (
            await Promise.all([
              app.dados.getDadosMinisterio(),
              app.dados.getDadosAdministradores(),
            ])
          )
            .flat()
            .forEach((e) => {
              msg.tables.dados.push(e);
            });
          break;
        } else {
          console.log(
            'Não tem acesso a cadastro secretária: ' + sec.IGREJA_DESC
          );
        }
      }
      if (options.includes('solicitacoes')) {
        msg.tables.solicitacoes = await app.solicitacoes.getSolicitacoes();
      }
    } catch (error) {
      console.error('Erro ao coletar dados: ', error);
    }
  }

  saveJSON(msg, 'user_data/data.json');

  return msg;
}

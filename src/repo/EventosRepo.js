import { Evento } from '../core/Evento.js';
import { Request } from '../infra/http/entity/Request.js';
import { HTTPClient } from '../infra/http/index.js';

/**
 * Classe para gerenciar um repositório de objetos Eventos.
 */
export class EventosRepo {
  #client;

  /**
   * Construtor da classe EventosRepo.
   * @param {Evento[]} [eventos=[]] - Um array opcional de objetos Evento.
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(eventos = [], client) {
    this.eventos = eventos;
    this.#client = client;
  }

  async getEventosSecretaria(startDate, endDate, codigoEmpresa) {
    const eventos = [];
    try {
      const { code, data } = await this.#client.fetch({
        url: 'https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW',
        method: 'post',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        data: {
          codigoTipoEvento: null,
          codigoEmpresa,
          codigoEstabelecimento: null,
          data1: startDate.split('-').reverse().join('/'),
          data2: new Date()
            .toISOString()
            .split('T')[0]
            .split('-')
            .reverse()
            .join('/'),
          listaStatus: '4,3',
          config: {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 100,
            sSearch: '',
            iSortCol: 0,
            sSortDir: 'asc',
          },
        },
      });
      const result = JSON.parse(data);
      if (result?.d?.aaData && code == 200) {
        result.d.aaData
          .map(([DATA, SEMANA, HORA, GRUPO, IGREJA, , STATUS, ID]) => {
            return Evento.create({
              EVENTO: 'Secretaria',
              GRUPO,
              DATA: new Date(
                `${DATA.split('/').reverse().join('-')} ${HORA.split(
                  '-'
                )[0].trim()}`
              ),
              IGREJA,
              OBSERVACOES: `${SEMANA}: ${HORA}`,
              STATUS: STATUS.replace(/<\/?[^>]+>/gi, ''),
              ID,
            });
          })
          .forEach((e) => eventos.push(e));
      }
    } catch (erro) {
      console.warn('Erro ao obter Eventos: ', erro);
    }
    return eventos;
  }
}

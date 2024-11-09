import { Dados } from '../core/Dados.js';
import { Request } from '../infra/http/entity/Request.js';
import { HTTPClient } from '../infra/http/index.js';

/**
 * Classe para gerenciar um repositório de objetos Eventos.
 */
export class DadosRepo {
  #client;

  /**
   * Construtor da classe EventosRepo.
   * @param {Dados[]} [dados=[]] - Um array opcional de objetos Evento.
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(dados = [], client) {
    this.dados = dados;
    this.#client = client;
  }

  async getDados() {
    const resRegionais = await fetch(
      'https://siga-api.congregacao.org.br/api/rel/rel032/listar/rrms?codigoPais=null&codigoEstado=null',
      {
        headers: {
          Authorization: `Bearer ${this.#client.token}`,
        },
      }
    );

    const regionais = await resRegionais.json();

    const resMinisterio = await fetch(
      'https://siga-api.congregacao.org.br/api/rel/rel032/dados/tabela',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.#client.token}`,
        },
        body: JSON.stringify({
          filtro: {
            codigoPais: null,
            codigoEstado: null,
            codigoCidade: null,
            codigoRRM: null,
            codigoAdministracao: null,
            codigoIgreja: null,
            codigoMinisterioCargo: null,
            codigoSexo: null,
            ativo: true,
            dataOrdenacao: '',
            aprovadorRrm: null,
            pesquisaRapida: '',
          },
          paginacao: null,
        }),
      }
    );

    const ministerio = await resMinisterio.json();
    const regionaisMap = new Map(
      regionais.map(({ codigo, nomeExibicao }) => [codigo, nomeExibicao])
    );
    const formated = ministerio.dados
      .map((e) => {
        e.regional = regionaisMap.get(Number(e.codigoRrm)) || '';
        return e;
      })
      .map((e) => Dados.create(e));
    return formated;
  }
}

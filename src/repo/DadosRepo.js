import { Dados } from '../core/Dados.js';
import { HTTPClient } from '../infra/http/index.js';

/**
 * Classe para gerenciar um repositório de objetos Dados.
 */
export class DadosRepo {
  #client;

  /**
   * Construtor da classe DadosRepo.
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(client) {
    this.#client = client;
  }

  /**
   * Função para obter as regionais.
   * @returns {Promise<Map<number, string>>} Um mapa de regionais.
   */
  async getRegionais(token) {
    const resRegionais = await fetch(
      'https://siga-api.congregacao.org.br/api/rel/rel032/listar/rrms?codigoPais=null&codigoEstado=null',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const regionais = await resRegionais.json();
    return new Map(
      regionais.map(({ codigo, nomeExibicao }) => [codigo, nomeExibicao])
    );
  }

  /**
   * Função para obter os dados do ministério ou administradores.
   * @param {string} grupo - Grupo para identificar o tipo de dado (Ministério ou Administradores).
   * @returns {Promise<Dados[]>} Lista de objetos Dados.
   */
  async getDados(grupo, url, token) {
    if (!token) throw new Error('Token inválido: ', token);
    const regionaisMap = await this.getRegionais(token);

    const resDados = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filtro: {
          codigoPais: null,
          codigoEstado: null,
          codigoCidade: null,
          codigoRegional: null,
          codigoAdministracao: null,
          codigoIgreja: null,
          codigoMinisterioCargo: null,
          codigoSexo: null,
          ativo: true,
          dataApresentacao: '',
          pesquisaRapida: '',
        },
        paginacao: null,
      }),
    });

    const { dados } = await resDados.json();
    return dados.map((e) => {
      e.grupo = grupo;
      e.regional = regionaisMap.get(Number(e.codigoRrm)) || '';
      return Dados.create(e);
    });
  }

  /**
   * Obtém os dados do ministério.
   * @returns {Promise<Dados[]>} Lista de objetos Dados do ministério.
   */
  async getDadosMinisterio(token = '') {
    return this.getDados(
      'Ministério',
      'https://siga-api.congregacao.org.br/api/rel/rel032/dados/tabela',
      token
    );
  }

  /**
   * Obtém os dados dos administradores.
   * @returns {Promise<Dados[]>} Lista de objetos Dados dos administradores.
   */
  async getDadosAdministradores(token = '') {
    return this.getDados(
      'Administradores',
      'https://siga-api.congregacao.org.br/api/rel/rel034/dados/tabela',
      token
    );
  }
}

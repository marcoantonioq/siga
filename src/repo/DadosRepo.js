import * as Cheerio from 'cheerio';
import { Dados } from '../core/Dados.js';
import { HTTPClient } from '../infra/http/index.js';

/**
 * Classe para gerenciar um repositório de objetos Dados.
 */
export class DadosRepo {
  #client;

  /**
   * Construtor da classe DadosRepo.
   * @param {Dados[]} dados - Um objeto HTTPClient para realizar requisições.
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(dados = [], client) {
    this.dados = dados;
    this.#client = client;
  }

  /**
   * Função para obter as regionais.
   * @param {string} token - Token de autenticação.
   * @returns {Promise<Map<number, string>>} Um mapa de regionais.
   */
  async getRegionais(token) {
    const resRegionais = await fetch(
      'https://siga-api.congregacao.org.br/api/rel/rel032/listar/rrms?codigoPais=null&codigoEstado=null',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!resRegionais.ok) {
      throw new Error(`Erro ao buscar regionais: ${resRegionais.statusText}`);
    }
    const regionais = await resRegionais.json();
    return new Map(
      regionais.map(({ codigo, nomeExibicao }) => [codigo, nomeExibicao])
    );
  }

  /**
   * Função para obter dados gerais (ministério ou administradores).
   * @param {string} url - URL da API.
   * @param {Map<number, string>} regionaisMap - Mapa de regionais.
   * @returns {Promise<Dados[]>} Lista de objetos Dados.
   */
  async fetchDados(url, regionaisMap) {
    const token = this.#client.token;
    if (!token) throw new Error('Token inválido');

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
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

        if (!resDados.ok) {
          throw new Error(`Erro na requisição: ${resDados.statusText}`);
        }

        const { dados } = await resDados.json();
        return dados.map((e) => {
          e.regional = regionaisMap.get(Number(e.codigoRrm)) || '';
          return Dados.create(e);
        });
      } catch (error) {
        attempt++;
        if (attempt < maxAttempts) {
          console.log(`Tentativa ${attempt} falhou. Tentando novamente...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Função para adicionar detalhes dos servidores aos dados.
   * @param {Dados[]} data - Dados dos servidores.
   * @param {string} endpoint - URL do endpoint para obter detalhes.
   * @returns {Promise<Dados[]>} Dados atualizados.
   */
  async addDetailsToData(data, endpoint) {
    for (const e of data) {
      try {
        const result = await fetch(
          `${endpoint}?codigoServo=${e.codigoServo}&codigoRelac=undefined`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${this.#client.token}` },
          }
        );
        if (!result.ok) {
          throw new Error(
            `Erro ao obter dados do servidor: ${result.statusText}`
          );
        }
        const dados = await result.json();
        Object.assign(e, dados);
      } catch (error) {
        console.log('Erro ao obter dados adicionais para:', e, error);
      }
    }
    return data;
  }

  /**
   * Obtém os dados do ministério.
   * @returns {Promise<Dados[]>} Lista de objetos Dados do ministério.
   */
  async getDadosMinisterio() {
    const token = this.#client.token;
    const regionaisMap = await this.getRegionais(token);
    const data = await this.fetchDados(
      'https://siga-api.congregacao.org.br/api/rel/rel032/dados/tabela',
      regionaisMap
    );
    return await this.addDetailsToData(
      data,
      'https://siga-api.congregacao.org.br/api/rel/rel032/servo/visualizar'
    );
  }

  /**
   * Obtém os dados dos administradores.
   * @returns {Promise<Dados[]>} Lista de objetos Dados dos administradores.
   */
  async getDadosAdministradores() {
    const token = this.#client.token;
    const regionaisMap = await this.getRegionais(token);
    const data = await this.fetchDados(
      'https://siga-api.congregacao.org.br/api/rel/rel034/dados/tabela',
      regionaisMap
    );
    return await this.addDetailsToData(
      data,
      'https://siga-api.congregacao.org.br/api/rel/rel034/servo/visualizar'
    );
  }

  /**
   * Verifica acessos.
   * @returns {Promise<Object>} Acessos disponíveis.
   */
  async access() {
    const access = { secretaria_cadastro: false };
    const result = await this.#client.fetch({
      url: 'https://siga.congregacao.org.br/SIS/SIS99908.aspx',
    });
    const $ = Cheerio.load(result.data);
    access.secretaria_cadastro = !!$('.submenu li#rotina_REL031').text();
    return access;
  }
}

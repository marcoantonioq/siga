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
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(dados = [], client) {
    this.dados = dados;
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
    if (!resRegionais.ok) {
      throw new Error(
        `Erro ao busca regionais status ${resRegionais.status}!: ${resRegionais.statusText}`
      );
    }
    const regionais = await resRegionais.json();
    return new Map(
      regionais.map(({ codigo, nomeExibicao }) => [codigo, nomeExibicao])
    );
  }

  /**
   * Função para obter os dados do ministério ou administradores.
   * @param {string} url - Url
   * @param {string} token - Url
   * @returns {Promise<Dados[]>} Lista de objetos Dados.
   */
  async getDados(url) {
    const token = this.#client.token;
    if (!token) throw new Error('Token inválido: ', this.#client.token);

    let attempt = 0;
    const maxAttempts = 3;
    let regionaisMap, resDados;

    while (attempt < maxAttempts) {
      try {
        regionaisMap = await this.getRegionais(token);
        if (!regionaisMap) throw new Error('Falha ao obter regionais');

        resDados = await fetch(url, {
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

        if (!resDados.ok)
          throw new Error(`Erro na requisição: ${resDados.statusText}`);

        const { dados } = await resDados.json();
        return dados.map((e) => {
          e.regional = regionaisMap.get(Number(e.codigoRrm)) || '';
          return Dados.create(e);
        });
      } catch (error) {
        attempt += 1;
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
   * Obtém os dados do ministério.
   * @returns {Promise<Dados[]>} Lista de objetos Dados do ministério.
   */
  async getDadosMinisterio() {
    return await this.getDados(
      'https://siga-api.congregacao.org.br/api/rel/rel032/dados/tabela'
    );
  }

  /**
   * Obtém os dados dos administradores.
   * @returns {Promise<Dados[]>} Lista de objetos Dados dos administradores.
   */
  async getDadosAdministradores() {
    return await this.getDados(
      'https://siga-api.congregacao.org.br/api/rel/rel034/dados/tabela'
    );
  }

  /**
   * Verifica acessos
   */
  async access() {
    const access = {
      secretaria_cadastro: false,
    };

    var result = await this.#client.fetch({
      url: 'https://siga.congregacao.org.br/SIS/SIS99908.aspx',
    });

    const $ = Cheerio.load(result.data);
    const menu_cadastros = $('.submenu li#rotina_REL031');
    access.secretaria_cadastro = !!menu_cadastros.text();
    return access;
  }
}

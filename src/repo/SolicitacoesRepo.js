import { Solicitacoes } from '../core/Solicitacoes.js';
import { HTTPClient } from '../infra/http/index.js';

/**
 * Classe para gerenciar um repositório de objetos Solicitacoes.
 */
export class SolicitacoesRepo {
  #client;
  /**
   * Construtor da classe SolicitacoesRepo.
   * @param {Solicitacoes[]} solicitacoes - Um array opcional de objetos Solicitacoes
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(solicitacoes = [], client) {
    this.solicitacoes = solicitacoes;
    this.#client = client;
  }

  /**
   * Obtém as solicitações de alteração de dados.
   * @async
   * @returns {Promise<Solicitacoes[]>} Uma Promise que resolve para um array de objetos Solicitacoes.
   */
  async getSolicitacoes() {
    try {
      const token = this.#client.token;
      const url =
        'https://siga-api.congregacao.org.br/api/rel/rel031/dados/tabela';

      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Sec-Ch-Ua-Platform': '"Linux"',
        },
        body: JSON.stringify({
          filtro: {
            codigoPais: 1,
            codigoRRM: null,
            codigoAdministracao: null,
            codigoIgreja: null,
            codigoMinisterioCargo: null,
            statusSolicitacao: null,
            pesquisaRapida: '',
          },
          paginacao: {
            paginaAtual: 0,
            quantidadePorPagina: 100,
            ordenarPor: null,
            ordenarDirecao: null,
          },
        }),
      };

      const constStatus = [
        { codigo: 0, nome: 'Pré-lançado' },
        { codigo: 1, nome: 'Lançado' },
        { codigo: 2, nome: 'Aguarda aprov. Min. RRM' },
        { codigo: 3, nome: 'Aguarda aprov. Min. Destino' },
        { codigo: 4, nome: 'Aguarda aprov. Conselho' },
        { codigo: 5, nome: 'Aguardando validação Relatório' },
        // { codigo: 6, nome: 'Processado' },
        { codigo: 7, nome: 'Cancelado' },
        { codigo: 8, nome: 'Pendente Revisar' },
      ];

      async function requisitarPorStatus(statusCodigo) {
        let pagina = 0;
        let resultados = [];
        while (true) {
          const body = JSON.parse(options.body);
          body.filtro.statusSolicitacao = statusCodigo;
          body.paginacao.paginaAtual = pagina;
          options.body = JSON.stringify(body);

          const response = await fetch(url, options);
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error('Resposta não é um JSON válido:', text);
            break;
          }

          if (Array.isArray(data.dados)) {
            resultados = resultados.concat(data.dados);
          }

          const totalLinhas = data.totalLinhas ?? 1;
          const quantidadePorPagina = data.quantitadePorPagina ?? 1;
          const paginaRetornada = data.paginaAtual ?? pagina;

          if ((paginaRetornada + 1) * quantidadePorPagina >= totalLinhas) {
            break;
          }
          pagina++;
        }
        return resultados;
      }

      let todosDados = [];
      try {
        for (const status of constStatus) {
          const dados = await requisitarPorStatus(status.codigo);
          todosDados = todosDados.concat(dados);
        }
        console.log(todosDados.length, 'itens encontrados');
      } catch (err) {
        console.error('Erro na requisição:', err);
      }
      return todosDados
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      return [];
    }
  }
}

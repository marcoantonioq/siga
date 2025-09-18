import ky from 'ky';
import { executeKyRequest } from '../../../http/executeKyRequest.js';

export async function carregarSolicitacoes({ auth }) {
  const url = 'https://siga-api.congregacao.org.br/api/rel/rel031/dados/tabela';

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
      const body = {
        filtro: {
          codigoPais: 1,
          codigoRRM: null,
          codigoAdministracao: null,
          codigoIgreja: null,
          codigoMinisterioCargo: null,
          statusSolicitacao: statusCodigo,
          pesquisaRapida: '',
        },
        paginacao: {
          paginaAtual: pagina,
          quantidadePorPagina: 100,
          ordenarPor: null,
          ordenarDirecao: null,
        },
      };

      try {
        const response = await executeKyRequest(() => ky.post(url, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          json: body,
          retry: { limit: 5 },
          timeout: 60000,
        }));
        const data = await response.json();
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
      } catch (e) {
        console.error('Erro na requisição:', e);
        break;
      }
    }
    return resultados;
  }

  let dados = [];
  try {
    for (const status of constStatus) {
      const values = await requisitarPorStatus(status.codigo);
      dados = dados.concat(values);
    }
    console.log(dados.length, 'itens encontrados');
  } catch (err) {
    console.error('Erro na requisição:', err);
  }
  return dados;
}

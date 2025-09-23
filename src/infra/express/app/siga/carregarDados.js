// @ts-nocheck
import ky from 'ky';
import { executeKyRequest } from '../../../http/executeKyRequest.js';

// --- Funções Auxiliares de Tratamento de Dados ---
/**
 * Remove caracteres de formatação e espaços em branco.
 * @param {*} value - O valor a ser limpo.
 * @returns {*} O valor limpo.
 */
const limparValor = (value) => {
  return typeof value === 'string'
    ? value.replace(/[\n\r\t\f\v\u200B-\u200D\uFEFF]/g, '').trim()
    : value;
};

/**
 * Normaliza um número de telefone para o formato sem DDI e sem caracteres especiais.
 * @param {string} phoneNumberString - O número de telefone.
 * @returns {string} O número de telefone normalizado.
 */
const formatPhoneNumberDD = (phoneNumberString) => {
  if (typeof phoneNumberString !== 'string') return '';
  return phoneNumberString
    .replace(/[^\d]/g, '')
    .replace(/^55(\d{2})(\d{8,})$/, '$1$2');
};

/**
 * Coleta valores válidos de um objeto, incluindo detalhes aninhados.
 * @param {Object} detalhesItem - O objeto de origem.
 * @param {Object} out - O objeto de destino para armazenar os valores válidos.
 * @returns {Object} O objeto de destino com os valores válidos.
 */
const coletarValidos = (detalhesItem, out = {}) => {
  if (typeof detalhesItem !== 'object' || detalhesItem === null) return out;

  for (const [key, value] of Object.entries(detalhesItem)) {
    if (
      value == null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    const valueType = typeof value;
    if (['string', 'number', 'boolean'].includes(valueType)) {
      out[key] = out[key] ?? value;
    } else if (
      value instanceof Date ||
      (!isNaN(Date.parse(value)) && valueType === 'string')
    ) {
      out[key] = out[key] ?? new Date(value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'object' && item) {
          coletarValidos(item, out);
        }
      });
    } else if (valueType === 'object') {
      coletarValidos(value, out);
    }
  }

  return out;
};

// --- Funções de API e Processamento ---
/**
 * Busca dados da API e trata possíveis erros.
 * @param {string} token - Token de autenticação.
 * @param {string} url - URL da API.
 * @returns {Promise<Array<Object>>} Uma promessa com os dados.
 */
const getApiData = async (token, url) => {
  try {
    const res = await executeKyRequest(() => ky.post(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
      },
      json: { filtro: { ativo: true }, paginacao: null },
      timeout: 60000,
    }));
    const { dados } = await res.json();
    return Array.isArray(dados) ? dados : [];
  } catch (error) {
    console.error(`Erro ao obter dados de ${url}:`, error.message);
    return [];
  }
};

function mesclarSemSobrescrever(destino, origem) {
  const novoObjeto = { ...destino };
  for (const chave in origem) {
    if (!novoObjeto[chave]) {
      novoObjeto[chave] = origem[chave];
    }
  }
  return novoObjeto;
}

/**
 * Obtém detalhes de um item da API de detalhes.
 * @param {Object} item - O item inicial.
 * @param {string} token - Token de autenticação.
 * @param {string} grupo - O grupo do item (ex: 'Ministério').
 * @param {string} urlBase - URL da API de detalhes.
 * @returns {Promise<Object>} O item com detalhes adicionados.
 */
const getDetalhesItem = async (item, token, grupo, urlBase) => {
  try {
    const url = `${urlBase}?codigoServo=${item.codigoServo || ''}&codigoRelac=${item.codigoRelac || ''
      }`;
    const res = await executeKyRequest(() => ky.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
      retry: { limit: 5 },
    }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // else process.stdout.write(grupo[0] || '.');
    const detalhes = await res.json();
    const dadosCompletos = mesclarSemSobrescrever(
      { ...item, grupo },
      coletarValidos(detalhes)
    );
    if (!dadosCompletos.cidade) {
      dadosCompletos.cidade = dadosCompletos.nomeIgreja.replace(/^BR-\d+-\d+ - /, '')
    }
    console.log('Dados: ', dadosCompletos);
    return dadosCompletos;
  } catch (e) {
    console.error(`Erro ao obter detalhes (${grupo}):`, e.message);
    return { ...item, grupo };
  }
};

/**
 * Processa uma lista de itens em lotes para evitar sobrecarga.
 * @param {Array<Object>} items - A lista de itens.
 * @param {Function} processor - A função de processamento assíncrona para cada item.
 * @param {number} batchSize - Tamanho do lote.
 * @returns {Promise<Array<Object>>} Uma promessa com a lista de resultados.
 */
const processarEmLotes = async (items, processor, batchSize = 20) => {
  const resultados = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const lote = items.slice(i, i + batchSize);
    const promessasLote = lote.map(processor);
    const resultadosLote = await Promise.allSettled(promessasLote);
    resultadosLote.forEach((res) => {
      if (res.status === 'fulfilled') {
        resultados.push(res.value);
      } else {
        console.warn('Falha em um item do lote, ignorado:', res.reason);
      }
    });
  }
  return resultados;
};

/**
 * Carrega e consolida dados de ministérios e administradores em paralelo.
 * @param {Object} options - As opções de carregamento.
 * @param {Object} options.auth - O objeto de autenticação com o token.
 * @returns {Promise<Array<Object>>} Uma lista de dados consolidados e normalizados.
 */
export const carregarDados = async ({ auth }) => {
  const inicio = Date.now();
  const { token } = auth;
  if (!token) {
    console.error('Token de autenticação não fornecido.');
    return [];
  }

  try {
    // 1. Coleta inicial de dados em paralelo
    const [ministerios, administradores] = await Promise.all([
      getApiData(
        token,
        'https://siga-api.congregacao.org.br/api/rel/rel032/dados/tabela'
      ),
      getApiData(
        token,
        'https://siga-api.congregacao.org.br/api/rel/rel034/dados/tabela'
      ),
    ]);

    // 2. Processamento dos detalhes de cada lista em paralelo
    const [detalhesMinisterios, detalhesAdministradores] = await Promise.all([
      processarEmLotes(ministerios, (item) =>
        getDetalhesItem(
          item,
          token,
          'Ministério',
          'https://siga-api.congregacao.org.br/api/rel/rel032/servo/visualizar'
        )
      ),
      processarEmLotes(administradores, (item) =>
        getDetalhesItem(
          item,
          token,
          'Administrador',
          'https://siga-api.congregacao.org.br/api/rel/rel034/servo/visualizar'
        )
      ),
    ]);

    // 3. Combinação e normalização dos dados
    const dadosCompletos = [...detalhesMinisterios.map(e => {
      e.administrador = 'NÃO';
      return e
    }), ...detalhesAdministradores.map(e => {
      e.administrador = 'SIM';
      return e
    })];

    const fim = Date.now();
    const minutos = ((fim - inicio) / 60000).toFixed(2);
    console.log(`Tempo gasto carregarDados: ${minutos} minutos`);

    return dadosCompletos;
  } catch (error) {
    console.error('Erro fatal em carregarDados:', error);
    return [];
  }
};

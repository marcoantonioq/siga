// @ts-nocheck
// Importa a biblioteca 'ky' para requisições HTTP e a classe TransformStream
import ky from 'ky';
import { TransformStream } from 'node:stream/web';

/**
 * Formata um número de telefone com código de área (DDD), removendo caracteres não numéricos.
 * @param {string} phoneNumberString - A string de telefone a ser formatada.
 * @returns {string} O número de telefone formatado, ou uma string vazia em caso de erro.
 */
function formatPhoneNumberDD(phoneNumberString) {
  try {
    // Verifica se a entrada é uma string válida antes de prosseguir
    if (typeof phoneNumberString !== 'string') {
      console.warn('formatPhoneNumberDD recebeu um valor não-string:', phoneNumberString);
      return '';
    }

    // Remove todos os caracteres que não são dígitos
    const phoneNumber = phoneNumberString
      .replace(/[^\d]/g, '')
      // Remove o prefixo '55' do DDD, se presente, e formata
      .replace(/^55(\d{2})(\d{8,})$/, '$1$2');

    return phoneNumber;
  } catch (error) {
    console.error('Erro ao formatar o número de telefone:', phoneNumberString, error);
    // Em caso de erro, retorna a string original para não perder o dado
    return phoneNumberString || '';
  }
}

/**
 * Limpa uma string de caracteres indesejados, como quebras de linha e espaços em branco.
 * @param {any} v - O valor a ser limpo.
 * @returns {any} O valor limpo, ou o valor original se não for uma string.
 */
const limparValor = (v) => {
  try {
    return typeof v === 'string'
      ? v.replace(/[\n\r\t\f\v\u200B-\u200D\uFEFF]/g, '').trim()
      : v;
  } catch (error) {
    console.error('Erro ao limpar valor:', v, error);
    return v;
  }
};

/**
 * Normaliza os dados brutos, aplicando aliases, limpando valores e garantindo a ordem das colunas.
 * Este é o ponto central de processamento e consolidação dos dados.
 * @param {Array<Object>} lista - A lista de objetos de dados brutos.
 * @returns {Array<Object>} A lista de objetos de dados normalizados.
 */
export function dadosPDO(lista = []) {
  try {
    if (!Array.isArray(lista)) {
      console.error('dadosPDO recebeu um valor que não é um array:', lista);
      return [];
    }

    const aliases = {
      nomerrm: 'nomeRRM',
      nomeRrm: 'nomeRRM',
      nomeRegional: 'nomeRRM',
      nomeRRM: 'nomeRRM',
      codigoRrm: 'codigoRRM',
      codigoRRM: 'codigoRRM',
      codigoAdministracao: 'codigoAdm',
      codigoAdm: 'codigoAdm',
      nomeAdministracao: 'nomeADM',
      nomeRa: 'nomeADM',
      nomeRA: 'nomeADM',
      nomeADM: 'nomeADM',
      dataOrdenacaoServo: 'Ordenação - Apresentação',
      dataApresentacao: 'Ordenação - Apresentação',
      dataOrdenacao: 'Ordenação - Apresentação',
      ministerioCargo: 'cargo',
      nomeMinisterioCargo: 'cargo',
      cargo: 'cargo',
      codigoMinisterioCargo: 'codigoFuncao',
      codigoServoMinisterioCargo: 'codigoFuncao',
      codigoFuncao: 'codigoFuncao',
      numeroIdentificacao1: 'documento',
      documento: 'documento',
    };

    const ordem = [
      'grupo',
      'nome',
      'sexo',
      'dataBatismo',
      'dataNascimento',
      'telefoneCasa',
      'telefoneCelular',
      'telefoneTrabalho',
      'telefoneRecado',
      'endereco',
      'bairro',
      'cep',
      'email1',
      'email2',
      'eventos',
      'dataOrdenacao',
      'cargo',
      'administrador',
      'nomeRA',
      'nomeAdministracao',
      'documento',
      'nomeRRM',
      'nomeIgreja',
      'comum',
      'pais',
      'estado',
      'cidade',
      'aprovadorRrm',
      'statusCadastroCompleto',
      'ativo',
      'indicadorFoto',
      'fotoUrl',
      'regional',
      'dataVencimentoMandato',
      'statusMandato',
      'qsa',
      'numeroIdentificacao1',
      'naoAtuando',
      'dataAGO',
      'codigo',
      'codigoServo',
      'codigoRelac',
      'codigoFuncao',
      'codigoAdministracao',
      'codigoRRM',
      'codigoRegional',
      'codigoIgreja',
      'codigoSexo',
      'numeroPosicaoIgreja',
    ];

    const padroes = {
      eventos: [],
      ativo: false,
      aprovadorRrm: false,
      indicadorFoto: false,
      administrador: false,
      qsa: false,
      naoAtuando: false,
    };

    const datas = new Set([
      'dataOrdenacaoServo',
      'dataApresentacao',
      'dataVencimentoMandato',
      'dataBatismo',
      'dataNascimento',
      'dataOrdenacao',
      'dataAGO',
    ]);

    const normalizados = lista.map((item) => {
      const result = {};
      if (typeof item !== 'object' || item === null) {
        console.warn('Item inválido na lista:', item);
        return {};
      }
      for (const [rawKey, value] of Object.entries(item)) {
        const key = aliases[rawKey] || rawKey;
        // Evita a substituição de valores já existentes
        if (value != null && value !== '' && result[key] === undefined) {
          result[key] = limparValor(value);
        }
      }
      return result;
    });

    const usados = new Set(normalizados.flatMap((item) => Object.keys(item)));

    const colunas = [
      ...ordem.filter((k) => usados.has(k)),
      ...[...usados].filter((k) => !ordem.includes(k)),
    ].filter((k) =>
      normalizados.some(
        (item) =>
          item[k] != null &&
          item[k] !== '' &&
          !(Array.isArray(item[k]) && item[k].length === 0)
      )
    );

    return normalizados.map((item) => {
      const resultado = Object.fromEntries(
        colunas.map((k) => {
          let valor;
          if (Object.prototype.hasOwnProperty.call(item, k)) {
            // Converte datas para objeto Date, se necessário
            valor = datas.has(k) && item[k]
              ? new Date(item[k]).toISOString().slice(0, 19).replace('T', ' ')
              : item[k];
          } else {
            // Usa valor padrão se não existir
            valor = padroes[k] ?? (datas.has(k) ? null : '');
          }
          return [k, valor];
        })
      );

      try {
        if (resultado.telefoneCasa) resultado.telefoneCasa = formatPhoneNumberDD(resultado.telefoneCasa);
        if (resultado.telefoneCelular) resultado.telefoneCelular = formatPhoneNumberDD(resultado.telefoneCelular);
        if (resultado.telefoneTrabalho) resultado.telefoneTrabalho = formatPhoneNumberDD(resultado.telefoneTrabalho);
        if (resultado.telefoneRecado) resultado.telefoneRecado = formatPhoneNumberDD(resultado.telefoneRecado);
      } catch (error) {
        console.error('Erro ao formatar telefone:', error, resultado);
      }

      try {
        if (typeof resultado.nomeRA === 'string') {
          resultado.nomeRA = resultado.nomeRA.replace(' - GO', '').trim();
        }
        if (typeof resultado.nomeRRM === 'string') {
          resultado.nomeRRM = resultado.nomeRRM.replace(' - GO', '').trim();
        }
      } catch (error) {
        console.error('Erro ao formatar dados de nome:', error, resultado);
      }

      return resultado;
    });
  } catch (error) {
    console.error('Erro fatal em dadosPDO:', error);
    return [];
  }
}

/**
 * Gerador assíncrono para obter ministérios da API 
 * @param {string} token - O token de autenticação.
 */
export async function* getMinisterios(token) {
  try {
    const res = await ky.post(
      'https://siga-api.congregacao.org.br/api/rel/rel032/dados/tabela',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        json: {
          filtro: { ativo: true },
          paginacao: null,
        },
        timeout: 60000,
        retry: { limit: 5 },
      }
    );
    const json = await res.json();
    if (Array.isArray(json.dados) && json.dados.length > 0) {
      for (const item of json.dados) {
        yield item;
      }
    }
  } catch (error) {
    console.error('Erro ao obter ministérios:', error.message);
    throw error;
  }
}

/**
 * Gerador assíncrono para obter administradores da API.
 * @param {string} token - O token de autenticação.
 */
export async function* getAdministradores(token) {
  try {
    const res = await ky.post(
      'https://siga-api.congregacao.org.br/api/rel/rel034/dados/tabela',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        json: {
          filtro: { ativo: true },
          paginacao: null,
        },
        timeout: 60000,
        retry: { limit: 5 },
      }
    );
    const json = await res.json();
    if (Array.isArray(json.dados) && json.dados.length > 0) {
      for (const item of json.dados) {
        yield item;
      }
    }
  } catch (error) {
    console.error('Erro ao obter administradores:', error.message);
    throw error;
  }
}

/**
 * Cria uma TransformStream para processamento paralelo de itens.
 * Os erros de cada item são tratados individualmente.
 * @param {Function} detalhesFn - Função assíncrona para processar cada item.
 * @param {string} token - O token de autenticação.
 * @returns {TransformStream} Uma stream de transformação.
 */
function createTransformStream(detalhesFn, token) {
  const pending = [];
  return new TransformStream({
    async transform(item, controller) {
      // Adiciona uma promessa para cada item ao array 'pending'
      const p = (async () => {
        try {
          const result = await detalhesFn(item, token);
          controller.enqueue(result);
        } catch (error) {
          // Captura e ignora erros para que um único item não quebre o pipeline.
          // O erro já foi logado na função `detalhesItem`.
          console.warn('Falha na transformação de um item, ignorando para não quebrar o processo.', error);
        }
      })();
      pending.push(p);
    },
    async flush() {
      // Aguarda que todas as promessas pendentes sejam resolvidas
      await Promise.all(pending);
    },
  });
}

/**
 * Transforma uma stream de origem usando uma função de detalhes.
 * @param {AsyncGenerator} source - O gerador assíncrono de origem.
 * @param {Function} detalhesFn - A função para obter detalhes de cada item.
 * @param {string} token - O token de autenticação.
 * @returns {AsyncGenerator} Um gerador assíncrono com os itens transformados.
 */
async function* streamTransform(source, detalhesFn, token) {
  try {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Processa a fonte de dados e escreve na stream
    (async () => {
      try {
        for await (const item of source) {
          await writer.write(item);
        }
      } catch (error) {
        console.error('Erro na fonte de dados do streamTransform:', error);
      } finally {
        writer.close();
      }
    })();

    // Lê e retorna os dados processados da stream
    const reader = readable
      .pipeThrough(createTransformStream(detalhesFn, token))
      .getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      yield value;
    }
  } catch (error) {
    console.error('Erro fatal em streamTransform:', error);
    // Não lança o erro para evitar que a aplicação quebre, mas o registra
  }
}

/**
 * Obtém detalhes de um item da API.
 * @param {Object} item - O item a ser enriquecido.
 * @param {string} token - O token de autenticação.
 * @param {string} grupo - O grupo do item ('Ministério' ou 'Administrador').
 * @param {string} urlBase - A URL base da API de detalhes.
 * @returns {Object} O item enriquecido com os detalhes, ou o item original em caso de falha.
 */
async function detalhesItem(item, token, grupo, urlBase) {
  try {
    if (typeof item !== 'object' || item === null) {
      console.warn('Item inválido recebido em detalhesItem:', item);
      return {};
    }

    item.grupo = grupo;
    const url = `${urlBase}?codigoServo=${item.codigoServo || ''}&codigoRelac=${item.codigoRelac || ''}`;

    function coletarValidos(detalhesItem, out = {}) {
      if (typeof detalhesItem !== 'object' || detalhesItem === null) return out;
      for (const [k, v] of Object.entries(detalhesItem)) {
        if (v == null || v === '') continue;
        const t = typeof v;
        if (['string', 'number', 'boolean'].includes(t)) {
          out[k] = out[k] ?? v;
        } else if (v instanceof Date || (!isNaN(Date.parse(v)) && t === 'string')) {
          out[k] = out[k] ?? new Date(v);
        } else if (Array.isArray(v)) {
          v.forEach((i) => typeof i === 'object' && i && coletarValidos(i, out));
        } else if (t === 'object') {
          coletarValidos(v, out);
        }
      }
      return out;
    }

    const res = await ky.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
      retry: { limit: 5 },
    });

    const detalhes = await res.json();
    const validos = coletarValidos(detalhes);

    for (const [k, v] of Object.entries(validos)) {
      if (!Object.prototype.hasOwnProperty.call(item, k)) {
        item[k] = v;
      }
    }

    return item;
  } catch (e) {
    console.error(`Erro ao obter detalhes (${grupo}):`, e.message);
    // Retorna o item original para não perder o dado mesmo com a falha na requisição
    return item;
  }
}

export function executarMinisterios(token) {
  return streamTransform(
    getMinisterios(token),
    (item) =>
      detalhesItem(
        item,
        token,
        'Ministério',
        'https://siga-api.congregacao.org.br/api/rel/rel032/servo/visualizar'
      ),
    token
  );
}

export function executarAdmin(token) {
  return streamTransform(
    getAdministradores(token),
    (item) =>
      detalhesItem(
        item,
        token,
        'Administrador',
        'https://siga-api.congregacao.org.br/api/rel/rel034/servo/visualizar'
      ),
    token
  );
}

/**
 * Carrega e consolida dados de várias fontes de forma assíncrona.
 * Usa Promise.allSettled para garantir que todas as fontes sejam processadas,
 * mesmo que algumas falhem.
 * @param {Object} options - As opções de carregamento.
 * @param {Object} options.auth - O objeto de autenticação com o token.
 * @returns {Array<Object>} Uma lista de dados consolidados e normalizados.
 */
export async function carregarDados({ auth }) {
  const inicio = Date.now();
  const dados = [];

  // As fontes de dados, criadas como geradores assíncronos
  const fontes = [
    executarMinisterios(auth.token),
    executarAdmin(auth.token),
  ];

  // Cria um array de promessas para iterar sobre cada fonte
  const promises = fontes.map(async (fonte) => {
    // Itera sobre a fonte e adiciona os itens aos dados
    for await (const item of fonte) {
      dados.push(item);
    }
  });

  // Usa Promise.allSettled para aguardar que todas as promessas terminem,
  // independentemente do resultado (sucesso ou falha).
  const resultados = await Promise.allSettled(promises);

  // Itera sobre os resultados para logar quaisquer falhas
  resultados.forEach((res, index) => {
    if (res.status === 'rejected') {
      console.error(`A fonte de dados na posição ${index} falhou. Motivo:`, res.reason);
    }
  });

  const fim = Date.now();
  const minutos = ((fim - inicio) / 60000).toFixed(2);
  console.log(`Tempo gasto carregarDados: ${minutos} minutos`);

  try {
    // Chama dadosPDO para processar os dados coletados.
    return dadosPDO(dados);
  } catch (error) {
    console.error('Erro ao normalizar dados com dadosPDO:', error);
    // Retorna a lista de dados brutos ou uma lista vazia para evitar quebras
    return dados;
  }
}

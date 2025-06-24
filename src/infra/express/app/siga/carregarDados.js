import ky from 'ky';
import { TransformStream } from 'node:stream/web';

function formatPhoneNumberDD(phoneNumberString) {
  try {
    const phoneNumber = phoneNumberString
      .replace(/[^\d]/g, '')
      .replace(/^55(\d{2})(\d{8,})$/, '$1$2');
    return phoneNumber;
  } catch (error) {
    console.error('Erro ao formatar o número:', phoneNumberString, error);
  }
  return '';
}

const limparValor = (v) =>
  typeof v === 'string'
    ? v.replace(/[\n\r\t\f\v\u200B-\u200D\uFEFF]/g, '').trim()
    : v;

export function dadosPDO(lista = []) {
  const aliases = {
    nomerrm: 'nomeRRM',
    nomeRrm: 'nomeRRM',
    nomeRegional: 'nomeRRM',
    nomeRRM: 'nomeRRM',
    codigoRrm: 'codigoRRM',
    codigoRRM: 'codigoRRM',
    codigoAdministracao: 'codigoAdm',
    codigoAdm: 'codigoAdm',
    nomeAdministracao: 'nomeRA',
    nomeRA: 'nomeRA',
    nomeRa: 'nomeRA',
    dataOrdenacaoServo: 'dataOrdenacao',
    dataOrdenacao: 'dataOrdenacao',
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
    'dataApresentacao',
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

  // Normaliza um objeto agrupando valores em chaves padrão
  const vistos = new Set();
  const normalizados = [];

  for (const item of lista) {
    const result = {};
    for (const [rawKey, value] of Object.entries(item)) {
      const key = aliases[rawKey] || rawKey;
      if (value != null && value !== '' && result[key] === undefined) {
        result[key] = limparValor(value);
      }
    }

    const chaveUnica = `${result.codigo ?? ''}|${result.grupo ?? ''}`;
    if (!vistos.has(chaveUnica)) {
      vistos.add(chaveUnica);
      normalizados.push(result);
    }
  }
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
    // Monta o objeto final com as colunas desejadas
    const resultado = Object.fromEntries(
      colunas.map((k) => {
        let valor;
        if (item[k] !== undefined) {
          // Converte datas para objeto Date, se necessário
          valor = datas.has(k) && item[k] ? new Date(item[k]) : item[k];
        } else {
          // Usa valor padrão se não existir
          valor = padroes[k] ?? (datas.has(k) ? null : '');
        }
        return [k, valor];
      })
    );

    // Formata telefones, se existirem
    try {
      if (resultado.telefoneCasa) {
        resultado.telefoneCasa = formatPhoneNumberDD(resultado.telefoneCasa);
      }
      if (resultado.telefoneCelular) {
        resultado.telefoneCelular = formatPhoneNumberDD(
          resultado.telefoneCelular
        );
      }
      if (resultado.telefoneTrabalho) {
        resultado.telefoneTrabalho = formatPhoneNumberDD(
          resultado.telefoneTrabalho
        );
      }
      if (resultado.telefoneRecado) {
        resultado.telefoneRecado = formatPhoneNumberDD(
          resultado.telefoneRecado
        );
      }
    } catch (error) {
      console.error('Erro ao formatar telefone:', error, resultado);
    }

    return resultado;
  });
}

export async function* getMinisterios(token, pag = 100) {
  let paginaAtual = 0;
  let recebidos = 0;
  let continuar = true;
  while (continuar) {
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
            paginacao: { paginaAtual, quantidadePorPagina: pag },
          },
          timeout: 60000,
          retry: { limit: 5 },
        }
      );
      const json = await res.json();

      if (Array.isArray(json.dados)) {
        for (const item of json.dados) {
          yield item;
          recebidos++;
        }
      }
      paginaAtual++;
      continuar =
        recebidos < (json.totalLinhas || 0) && json.dados.length === pag;
    } catch (error) {
      console.error('Erro ao obter ministérios:', error);
      throw error;
    }
  }
}

export async function* getAdministradores(token, pag = 100) {
  let paginaAtual = 0;
  let recebidos = 0;
  let continuar = true;
  while (continuar) {
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
            paginacao: { paginaAtual, quantidadePorPagina: pag },
          },
          timeout: 60000,
          retry: { limit: 5 },
        }
      );
      const json = await res.json();

      if (Array.isArray(json.dados)) {
        for (const item of json.dados) {
          yield item;
          recebidos++;
        }
      }
      paginaAtual++;
      continuar =
        recebidos < (json.totalLinhas || 0) && json.dados.length === pag;
    } catch (error) {
      console.error('Erro ao obter administradores:', error);
      throw error;
    }
  }
}

function createTransformStream(detalhesFn, token) {
  const pending = [];
  return new TransformStream({
    async transform(item, controller) {
      const p = (async () => {
        try {
          const result = await detalhesFn(item, token);
          controller.enqueue(result);
        } catch (_) {}
      })();
      pending.push(p);
    },
    async flush() {
      await Promise.all(pending);
    },
  });
}

async function* streamTransform(source, detalhesFn, token) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    for await (const item of source) {
      await writer.write(item);
    }
    writer.close();
  })();
  const reader = readable
    .pipeThrough(createTransformStream(detalhesFn, token))
    .getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}

async function detalhesItem(item, token, grupo, urlBase) {
  item.grupo = grupo;
  const url = `${urlBase}?codigoServo=${item.codigoServo}&codigoRelac=${
    item.codigoRelac || ''
  }`;
  function coletarValidos(item, out = {}) {
    for (const [k, v] of Object.entries(item)) {
      if (v == null || v === '') continue;
      const t = typeof v;
      if (['string', 'number', 'boolean'].includes(t)) out[k] ??= v;
      else if (v instanceof Date || (!isNaN(Date.parse(v)) && t === 'string'))
        out[k] ??= new Date(v);
      else if (Array.isArray(v))
        v.forEach((i) => typeof i === 'object' && i && coletarValidos(i, out));
      else if (t === 'object') coletarValidos(v, out);
    }
    return out;
  }
  try {
    const res = await ky.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
      retry: { limit: 5 },
    });
    const detalhes = await res.json();
    // process.stdout.write(grupo[0].toLowerCase());
    const validos = coletarValidos(detalhes);
    for (const [k, v] of Object.entries(validos)) if (!item[k]) item[k] = v;
  } catch (e) {
    console.error(`Erro ao obter detalhes (${grupo}):`, e.message);
  }
  return item;
}

export function executarMinisterios(token, pag = 100) {
  return streamTransform(
    getMinisterios(token, pag),
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

export function executarAdmin(token, pag = 100) {
  return streamTransform(
    getAdministradores(token, pag),
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

export async function carregarDados({ auth, pag = 100 }) {
  const inicio = Date.now();
  const dados = [];
  const fontes = [
    executarMinisterios(auth.token, pag),
    executarAdmin(auth.token, pag),
  ];
  await Promise.all(
    fontes.map(async (fonte) => {
      for await (const item of fonte) dados.push(item);
    })
  );
  const fim = Date.now();
  const minutos = ((fim - inicio) / 60000).toFixed(2);
  console.log(`Tempo gasto carregarDados: ${minutos} minutos`);
  return dadosPDO(dados);
}

// const token = "";
// carregarDados({ auth: { token, pag: 1 } })
//   .then((e) => {
//     console.log('Dados carregados:', e.length);
//     console.log(
//       'Primeiro mini:',
//       e.find((i) => i.grupo === 'Ministério')
//     );
//     console.log(
//       'Segundo adm:',
//       e.find((i) => i.grupo === 'Administrador')
//     );
//   })
//   .catch(console.error);

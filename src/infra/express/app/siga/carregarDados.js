import ky from 'ky';
import { TransformStream } from 'node:stream/web';
import { parsePhoneNumber } from 'libphonenumber-js';

function formatPhoneNumberDD(phoneNumberString) {
  try {
    const phoneNumber = parsePhoneNumber(phoneNumberString, 'BR');
    if (phoneNumber && phoneNumber.isValid()) {
      const nationalNumber = phoneNumber.formatNational();

      const cleanedNumber = nationalNumber.replace(/[()\s-]/g, '');

      const ddd = cleanedNumber.substring(0, 2);

      const restOfNumber = cleanedNumber.substring(2);

      return `${ddd}${restOfNumber}`;
    }
  } catch (error) {
    console.error('Erro ao formatar o número:', error);
  }
  return null;
}

export function dadosPDO(lista = []) {
  const aliases = {
    nomerrm: 'nomeRRM',
    nomeRrm: 'nomeRRM',
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
    'codigo',
    'codigoServo',
    'codigoRelac',
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
    'nomeRegional',
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
  const normalizar = (obj) => {
    const result = {};
    for (const [rawKey, value] of Object.entries(obj)) {
      const key = aliases[rawKey] || rawKey;
      if (value != null && value !== '' && result[key] === undefined) {
        result[key] = value;
      }
    }
    return result;
  };

  const normalizados = lista.map(normalizar);

  const usados = new Set(normalizados.flatMap((obj) => Object.keys(obj)));

  const colunas = [
    ...ordem.filter((k) => usados.has(k)),
    ...[...usados].filter((k) => !ordem.includes(k)),
  ].filter((k) =>
    normalizados.some(
      (obj) =>
        obj[k] != null &&
        obj[k] !== '' &&
        !(Array.isArray(obj[k]) && obj[k].length === 0)
    )
  );

  return normalizados
    .map((obj) =>
      Object.fromEntries(
        colunas.map((k) => [
          k,
          obj[k] !== undefined
            ? datas.has(k) && obj[k]
              ? new Date(obj[k])
              : obj[k]
            : padroes[k] ?? (datas.has(k) ? null : ''),
        ])
      )
    )
    .map((e) => {
      if (e.telefoneCasa) {
        e.telefoneCasa = formatPhoneNumberDD(e.telefoneCasa);
      }
      if (e.telefoneCelular) {
        e.telefoneCelular = formatPhoneNumberDD(e.telefoneCelular);
      }
      if (e.telefoneTrabalho) {
        e.telefoneTrabalho = formatPhoneNumberDD(e.telefoneTrabalho);
      }
      if (e.telefoneRecado) {
        e.telefoneRecado = formatPhoneNumberDD(e.telefoneRecado);
      }
      return e;
    });
}

export async function* getMinisterios(token, pag = 100) {
  let paginaAtual = 0;
  let recebidos = 0;
  let continuar = true;
  while (continuar) {
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
    break; // Adicionando break para evitar loop infinito
  }
}

export async function* getAdministradores(token, pag = 100) {
  let paginaAtual = 0;
  let recebidos = 0;
  let continuar = true;
  while (continuar) {
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
    break; // Adicionando break para evitar loop infinito
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
  function coletarValidos(obj, out = {}) {
    for (const [k, v] of Object.entries(obj)) {
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

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGFpbXMuQ29kaWdvRW1wcmVzYSI6IjEyNiIsIkNsYWltcy5Ob21lRXhpYmljYW9FbXByZXNhIjoiR09Jw4JOSUEiLCJDbGFpbXMuQ29kaWdvVXN1YXJpbyI6IjI2NTU5IiwiQ2xhaW1zLkxvZ2luVXN1YXJpbyI6IndhbmRlcmxlaS5mZXJuYW5kZXMiLCJDbGFpbXMuTm9tZVVzdWFyaW8iOiJXQU5ERVJMRUkgRkVSTkFOREVTIFNPVVpBIiwiQ2xhaW1zLkNvZGlnb0VzdGFiZWxlY2ltZW50byI6IjMwMTU0IiwiQ2xhaW1zLk5vbWVFeGliaWNhb0VzdGFiZWxlY2ltZW50byI6IlNFQyAtIEdPScOCTklBIiwiQ2xhaW1zLkNvZGlnb0VzdGFiZWxlY2ltZW50b0Zpc2NhbCI6IjMwMTU0IiwiQ2xhaW1zLkNvZGlnb0FjZXNzbyI6ImFmMWVlN2I3LTU2MzItNDUwNS05OTE4LTNiODlmMzZmZGU2NyIsIkNsYWltcy5Db2RpZ29Db21wZXRlbmNpYSI6Ijk2MTcxYWRmLTY4YjUtNGQwZC1hZTgxLTlkMTE2NTY5NmUyNyIsIkNsYWltcy5Ob21lRXhpYmljYW9Db21wZXRlbmNpYSI6IjA1LzIwMjUiLCJDbGFpbXMuQWNlc3NvR2xvYmFsIjoiRmFsc2UiLCJDbGFpbXMuQ29kaWdvSWRpb21hIjoiMSIsIkNsYWltcy5TaWdsYUlkaW9tYSI6InB0LUJSIiwiQ2xhaW1zLlNpZ2xhSWRpb21hRW1wcmVzYSI6InB0LUJSIiwiQ2xhaW1zLlNpbWJvbG9Nb2VkYSI6IlIkIiwiQ2xhaW1zLkNvZGlnb1BhaXMiOiIxMDU4IiwiQ2xhaW1zLk51bWVyb1JlZ2lzdHJvUG9yUGFnaW5hIjoiMTAwIiwiQ2xhaW1zLkNvZGlnb1RpcG9Fc3RhYmVsZWNpbWVudG8iOiIxMSIsIkNsYWltcy5EYXRhSW5pY2lhbENvbXBldGVuY2lhIjoiMjAyNS0wNS0wMSIsIkNsYWltcy5EYXRhRmluYWxDb21wZXRlbmNpYSI6IjIwMjUtMDUtMzEiLCJDbGFpbXMuQ29kaWdvRXN0YWRvIjoiNTIiLCJDbGFpbXMuQ29kaWdvUGFpc1JlbGF0b3JpbyI6IjEiLCJDbGFpbXMuVGVjbmljbyI6IkZhbHNlIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIkJJMDAyMDEiLCJCSTAwMjAyIiwiQkkwMDIwMyIsIkJJMDAzMDEiLCJCSTAwMzAyIiwiQkkwMDQwMSIsIkJJMDA0MDIiLCJCSTAwNTAxIiwiQkkwMDUwMiIsIkJJMDA1MDMiLCJCSTAwNTA0IiwiQkkwMDYwMSIsIkJJMDA2MDIiLCJCSTAxMDAxIiwiQkkwMTAwMiIsIkJJMDExMDEiLCJCSTAxMTAyIiwiQkkwMTIwMSIsIkJJMDEyMDIiLCJDVEIwMDQwMSIsIkNUQjAwNDAzIiwiQ1RCMDA3MDEiLCJDVEIwMDcwNyIsIkNUQjAwNzA4IiwiQ1RCMDA3MDkiLCJDVEIwMDcxMCIsIkNUQjAwNzExIiwiQ1RCMDA3MTMiLCJDVEIwMDczOCIsIkNUQjAwNzM5IiwiQ1RCMDA3NDAiLCJDVEIwMDc0MSIsIkNUQjAwNzQzIiwiQ1RCMDA3NDQiLCJDVEIwMDc0NSIsIkNUQjAwNzQ5IiwiQ1RCMDA4MDEiLCJDVEIwMDgwMiIsIkNUQjAwOTAxIiwiQ1RCMDA5MDIiLCJDVEIwMDkwMyIsIkNUQjAxMDAxIiwiQ1RCMDEwMDQiLCJDVEIwMTAwNSIsIkNUQjAxMTAxIiwiQ1RCMDExMDIiLCJDVEIwMTIwMSIsIkNUQjAxMjAyIiwiQ1RCMDEzMDEiLCJDVEIwMTMwMiIsIkNUQjAxNDAxIiwiQ1RCMDE0MDIiLCJDVEIwMTcwMSIsIkNUQjAxNzAyIiwiQ1RCMDE4MDEiLCJDVEIwMTgwMiIsIkNUQjAxODAzIiwiQ1RCMDE5MDEiLCJDVEIwMTkwMiIsIkNUQjAyMDAxIiwiQ1RCMDIwMDIiLCJDVEIwMjAwMyIsIkNUQjAyMDA0IiwiQ1RCMDIwMDUiLCJDVEIwMjEwMSIsIkNUQjAyMTAyIiwiQ1RCMDIyMDEiLCJDVEIwMjIwMiIsIkNUQjAzMDAxIiwiRUFEMDAxMDEiLCJFU1QwMDUwMSIsIkVTVDAwNTAzIiwiRVNUMDA1MDQiLCJFU1QwMDgwMSIsIkVTVDAwODAyIiwiRVNUMDA5MDEiLCJFU1QwMDkwMiIsIkVTVDAwOTAzIiwiRVNUMDEyMDEiLCJFU1QwMTIwOCIsIkVTVDAxNTE1IiwiRVNUMDIyMDEiLCJFU1QwMjIwNiIsIkVTVDAyMjA3IiwiRVNUMDIyMDgiLCJFU1QwMjIwOSIsIkVTVDAyMjEzIiwiRVNUMDIyMTkiLCJFU1QwMjIyOSIsIkVTVDAyMjMzIiwiRVNUMDIyMzkiLCJFU1QwMjI0MiIsIkVTVDAyMjQ0IiwiRVNUMDIyNDUiLCJFU1QwMjI0NiIsIkVTVDAyMjQ3IiwiRVNUMDIyNTAiLCJFU1QwMjYwMSIsIkVTVDAyNjAyIiwiRVNUMDI2MDMiLCJFU1QwMjYwNyIsIkVTVDAyNjA5IiwiRVNUMDI2MTMiLCJFU1QwMjYxNSIsIkVTVDAyNjE2IiwiRVNUMDI3MDEiLCJFU1QwMjcxMiIsIkVTVDAyNzE2IiwiRVNUMDI3MjAiLCJFU1QwMjgwMSIsIkVTVDAyODA2IiwiRVNUMDI4MDciLCJFU1QwMjgxMSIsIkVTVDAyODEyIiwiRVNUMDI5MDEiLCJFU1QwMjkwNSIsIkVTVDAyOTA4IiwiRVNUMDI5MDkiLCJFU1QwMjkxMSIsIkVTVDAyOTE1IiwiRVNUMDI5MjAiLCJFU1QwMzAwMSIsIkVTVDAzMDAyIiwiRVNUMDMwMDMiLCJFU1QwMzYwMSIsIkVTVDAzNjAyIiwiRVNUMDQxMDEiLCJFU1QwNDEwMiIsIkVTVDA0MjAxIiwiRVNUMDQyMDIiLCJFU1QwNDQwMSIsIkVTVDA0NDAyIiwiRVNUMDQ0MDYiLCJFU1QwNDQwNyIsIkVTVDA0NDA5IiwiRVNUMDQ0MTYiLCJFU1QwNDQxOSIsIkVTVDA0NDIzIiwiRVNUMDQ2MDEiLCJFU1QwNDYwMiIsIkVTVDA0NjAzIiwiRVNUMDQ2MDQiLCJQVFIwMDcwMSIsIlBUUjAwNzAzIiwiUFRSMDA3MDYiLCJQVFIwMDcwOCIsIlBUUjAwODAxIiwiUFRSMDA4MDUiLCJQVFIwMDgwNiIsIlBUUjAwOTAxIiwiUFRSMDA5MDMiLCJQVFIwMTAwMSIsIlBUUjAxMDA0IiwiUFRSMDExMDEiLCJQVFIwMTIwMSIsIlBUUjAxMjAyIiwiUkVMMDA0MDEiLCJSRUwwMDQwNSIsIlJFTDAwNDExIiwiUkVMMDA0MTUiLCJSRUwwMDQxNiIsIlJFTDAxMDAxIiwiUkVMMDEwMTAiLCJSRUwwMTAxMSIsIlJFTDAxMDEyIiwiUkVMMDEwMTMiLCJSRUwwMTAxNCIsIlJFTDAxMDE3IiwiUkVMMDEwMTgiLCJSRUwwMTAyNiIsIlJFTDAxMDU3IiwiUkVMMDE3MDEiLCJSRUwwMTcwNiIsIlJFTDAxNzA4IiwiUkVMMDI1MDEiLCJSRUwwMjUwMiIsIlJFTDAyNTAzIiwiUkVMMDI1MDQiLCJSRUwwMjUwNSIsIlJFTDAzMTAxIiwiUkVMMDMxMDIiLCJSRUwwMzEwMyIsIlJFTDAzMTA0IiwiUkVMMDMxMDUiLCJSRUwwMzEwNiIsIlJFTDAzMTA3IiwiUkVMMDMxMDgiLCJSRUwwMzEwOSIsIlJFTDAzMTEwIiwiUkVMMDMxMTEiLCJSRUwwMzExMyIsIlJFTDAzMTE3IiwiUkVMMDMxMjEiLCJSRUwwMzEyMiIsIlJFTDAzMjAxIiwiUkVMMDMyMDIiLCJSRUwwMzIwMyIsIlJFTDAzMjA0IiwiUkVMMDMyMDUiLCJSRUwwMzMwMSIsIlJFTDAzMzAyIiwiUkVMMDM0MDEiLCJSRUwwMzQwMiIsIlJFTDAzNDAzIiwiUkVMMDM1MDEiLCJSRUwwMzUwMiIsIlJFTDAzNTAzIiwiUkVMMDM2MDEiLCJSRUwwMzYwMiIsIlJFTDAzNjAzIiwiUkVMMDM3MDEiLCJSRUwwMzcwMiIsIlJFTDAzNzAzIiwiUkVMMDM3MDQiLCJSRUwwMzcwNSIsIlJFTDAzNzA2IiwiUkVMMDM4MDEiLCJSSDAwMjAxIiwiUkgwMDIwMyIsIlJIMDAyMDQiLCJSSDAwMzAxIiwiUkgwMDMwMyIsIlJIMDA0MDEiLCJSSDAwNDAzIiwiUkgwMDQwNiIsIlJIMDA1MDEiLCJSSDAwNTAzIiwiU0lTOTk5MTkiLCJTSVM5OTkyMCIsIlRFUzAwMjAxIiwiVEVTMDA0MDEiLCJURVMwMDQwNCIsIlRFUzAwNTAxIiwiVEVTMDA1MDYiLCJURVMwMDUwNyIsIlRFUzAwNjAxIiwiVEVTMDA2MDQiLCJURVMwMDcwMSIsIlRFUzAwNzAyIiwiVEVTMDA4MDEiLCJURVMwMDgwNCIsIlRFUzAwOTAxIiwiVEVTMDA5MDIiLCJURVMwMDkwMyIsIlRFUzAxMjAxIiwiVEVTMDEyMDIiLCJURVMwMTMwMSIsIlRFUzAxMzA2IiwiVEVTMDEzMDciLCJURVMwMTMwOCIsIlRFUzAxMzEwIiwiVEVTMDEzMTQiLCJURVMwMTMxNSIsIlRFUzAxMzE2IiwiVEVTMDEzMTciLCJURVMwMTMxOSIsIlRFUzAxMzIwIiwiVEVTMDEzMjIiLCJURVMwMTMyMyIsIlRFUzAxNDAxIiwiVEVTMDE0MDMiLCJURVMwMTQwNSIsIlRFUzAxNDA2IiwiVEVTMDE1MDEiLCJURVMwMTUwMyIsIlRFUzAxNTEwIiwiVEVTMDE1MTMiLCJURVMwMTUxNCIsIlRFUzAxNzAxIiwiVEVTMDE3MDgiLCJURVMwMTcwOSIsIlRFUzAxNzEwIiwiVEVTMDE3MTEiLCJURVMwMTcxMiIsIlRFUzAxNzE2IiwiVEVTMDE3MTciLCJURVMwMTcxOCIsIlRFUzAxODAxIiwiVEVTMDE4MDIiLCJURVMwMTkwMSIsIlRFUzAxOTAyIiwiVEVTMDIxMDEiLCJURVMwMjEwMyIsIlRFUzAyMTA1IiwiVEVTMDIxMDYiLCJURVMwMjEwOCIsIlRFUzAyMzAxIiwiVEVTMDIzMDQiLCJURVMwMjMwNSIsIlRFUzAyMzA2IiwiVEVTMDIzMDciLCJURVMwMjMwOCIsIlRFUzAyNDAxIiwiVEVTMDI0MDQiLCJURVMwMjQwNSIsIlRFUzAyNDA2IiwiVEVTMDI0MDciLCJURVMwMjQwOCIsIlRFUzAyNTAxIiwiVEVTMDI1MDQiLCJURVMwMjUwNSIsIlRFUzAyNTA2IiwiVEVTMDI1MDciLCJURVMwMjUwOCIsIlRFUzAyNTEwIiwiVEVTMDI2MDEiLCJURVMwMjYwNCIsIlRFUzAyNjA1IiwiVEVTMDI2MDYiLCJURVMwMjYwNyIsIlRFUzAyNjA4IiwiVEVTMDI3MDEiLCJURVMwMjcwNCIsIlRFUzAyNzA1IiwiVEVTMDI3MDYiLCJURVMwMjcwNyIsIlRFUzAyNzA4IiwiVEVTMDI5MDEiLCJURVMwMjkwMiIsIlRFUzAzMDAxIiwiVEVTMDMwMDIiLCJURVMwMzEwMSIsIlRFUzAzMTAyIiwiVEVTMDMzMDEiLCJURVMwMzMwMiIsIlRFUzAzNTAxIiwiVEVTMDM1MDMiLCJURVMwMzUwNSIsIlRFUzAzNjAxIiwiVEVTMDM2MDIiLCJURVMwMzYwMyIsIlRFUzAzNjA0IiwiVEVTMDM4MDEiLCJURVMwNDAwMSIsIlRFUzA0MDAyIiwiVEVTMDQ1MDEiLCJURVMwNDUwMyIsIlRFUzA1MjAxIiwiVEVTMDUyMDQiLCJURVMwNTMwMSIsIlRFUzA1MzAzIiwiVEVTMDU1MDEiLCJURVMwNTYwMSIsIlRFUzA1NjAzIiwiVkVSMDAxMDEiLCJWRVIwMDIwMSIsIlZFUjAwMjAyIiwiVkVSMDAyMDMiLCJWRVIwMDIwNCIsIlZFUjAwMjA2IiwiVkVSMDAyMDciLCJWRVIwMDIwOCIsIlZFUjAwODAxIiwiVkVSMDA4MDIiLCJWRVIwMDgwMyIsIlZFUjAwODA0IiwiVkVSMDA4MDUiLCJWRVIwMDgwNiIsIlZFUjAwODA3IiwiVkVSMDA4MDgiLCJWRVIwMDgwOSIsIlZFUjAwODEwIiwiVkVSMDA4MTEiLCJWRVIwMDgxMiIsIlZFUjAwODEzIiwiVkVSMDA5MDEiLCJWSUEwMDEwMSIsIlZJQTAwMTAzIiwiVklBMDAxMDYiLCJWSUEwMDEwNyIsIlZJQTAwMTA5IiwiVklBMDAxMTIiLCJWSUEwMDExNCIsIlZJQTAwMTE2IiwiVklBMDAxMTciLCJWSUEwMDExOCIsIlZJQTAwMTE5IiwiVklBMDAxMjEiLCJWSUEwMDEyMiIsIlZJQTAwMTIzIiwiVklBMDAxMjQiLCJWSUEwMDEyNSIsIlZJQTAwMTMwIiwiVklBMDAxMzEiXSwiZXhwIjoxNzUwODgwODM3LCJpc3MiOiJodHRwczovL3NpZ2EtYXBpLmNvbmdyZWdhY2FvLm9yZy5ici8iLCJhdWQiOiJodHRwczovL3NpZ2EtYXBpLmNvbmdyZWdhY2FvLm9yZy5ici8ifQ.Nd1WWbhwOcDKbI8zJK5dhyvwtxKUL0JeuQFsgCbnn9s';
carregarDados({ auth: { token, pag: 1 } })
  .then((e) => {
    console.log('Dados carregados:', e.length);
    console.log(
      'Primeiro mini:',
      e.find((i) => i.grupo === 'Ministério')
    );
    console.log(
      'Segundo adm:',
      e.find((i) => i.grupo === 'Administrador')
    );
  })
  .catch(console.error);

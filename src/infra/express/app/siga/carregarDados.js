import ky from 'ky';
import { TransformStream } from 'node:stream/web';

export function dadosPDO(obj = {}) {
  return {
    codigoServo: obj.codigoServo ?? null,
    codigoRelac: obj.codigoRelac ?? null,
    nome: obj.nome ?? '',
    dataOrdenacaoServo: obj.dataOrdenacaoServo
      ? new Date(obj.dataOrdenacaoServo)
      : null,
    ministerioCargo: obj.ministerioCargo ?? '',
    nomeIgreja: obj.nomeIgreja ?? '',
    codigoAdm: obj.codigoAdm ?? null,
    nomeAdministracao: obj.nomeAdministracao ?? '',
    documento: obj.documento ?? '',
    codigoRrm: obj.codigoRrm ?? null,
    nomeRrm: obj.nomeRrm ?? '',
    pais: obj.pais ?? '',
    estado: obj.estado ?? '',
    cidade: obj.cidade ?? '',
    aprovadorRrm: obj.aprovadorRrm ?? false,
    statusCadastroCompleto: obj.statusCadastroCompleto ?? 0,
    ativo: obj.ativo ?? false,
    indicadorFoto: obj.indicadorFoto ?? false,
    sexo: obj.sexo ?? '',
    fotoUrl: obj.fotoUrl || null,
    regional: obj.regional ?? '',
    dataApresentacao: obj.dataApresentacao
      ? new Date(obj.dataApresentacao)
      : null,
    dataVencimentoMandato: obj.dataVencimentoMandato
      ? new Date(obj.dataVencimentoMandato)
      : null,
    administrador: obj.administrador ?? false,
    nomeRA: obj.nomeRA ?? '',
    cargo: obj.cargo ?? '',
    statusMandato: obj.statusMandato ?? 0,
    qsa: obj.qsa ?? false,
    dataBatismo: obj.dataBatismo ? new Date(obj.dataBatismo) : null,
    dataNascimento: obj.dataNascimento ? new Date(obj.dataNascimento) : null,
    telefoneCasa: obj.telefoneCasa ?? '',
    telefoneCelular: obj.telefoneCelular ?? '',
    telefoneTrabalho: obj.telefoneTrabalho ?? '',
    telefoneRecado: obj.telefoneRecado ?? '',
    endereco: obj.endereco ?? '',
    bairro: obj.bairro ?? '',
    cep: obj.cep ?? '',
    email1: obj.email1 ?? '',
    email2: obj.email2 ?? '',
    eventos: [],
    codigo: obj.codigo ?? null,
    numeroIdentificacao1: obj.numeroIdentificacao1 ?? '',
    codigoSexo: obj.codigoSexo ?? null,
    naoAtuando: obj.naoAtuando ?? false,
    codigoAdministracao: obj.codigoAdministracao ?? null,
    codigoRegional: obj.codigoRegional ?? null,
    nomeRegional: obj.nomeRegional ?? '',
    codigoIgreja: obj.codigoIgreja ?? null,
    codigoMinisterioCargo: obj.codigoMinisterioCargo ?? null,
    nomeMinisterioCargo: obj.nomeMinisterioCargo ?? '',
    comum: obj.comum ?? false,
    codigoServoOrdenacao: obj.codigoServoOrdenacao ?? null,
    dataOrdenacao: obj.dataOrdenacao ? new Date(obj.dataOrdenacao) : null,
    dataAGO: obj.dataAGO ? new Date(obj.dataAGO) : null,
    numeroPosicaoIgreja: obj.numeroPosicaoIgreja ?? null,
    grupo: obj.grupo ?? '',
  };
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
    Object.assign(item, detalhes);
  } catch (e) {
    console.error(`Erro ao obter detalhes (${grupo}):`, e.message);
  }
  return dadosPDO(item);
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
  return dados;
}

// const token = '';
// carregarDados({ auth: { token } })
//   .then(() => {})
//   .catch(console.error);

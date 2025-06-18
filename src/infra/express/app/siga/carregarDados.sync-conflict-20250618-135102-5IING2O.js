import ky from 'ky';
import { TransformStream } from 'node:stream/web';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJDbGFpbXMuQ29kaWdvRW1wcmVzYSI6IjEyNiIsIkNsYWltcy5Ob21lRXhpYmljYW9FbXByZXNhIjoiR09Jw4JOSUEiLCJDbGFpbXMuQ29kaWdvVXN1YXJpbyI6IjI2NTU5IiwiQ2xhaW1zLkxvZ2luVXN1YXJpbyI6IndhbmRlcmxlaS5mZXJuYW5kZXMiLCJDbGFpbXMuTm9tZVVzdWFyaW8iOiJXQU5ERVJMRUkgRkVSTkFOREVTIFNPVVpBIiwiQ2xhaW1zLkNvZGlnb0VzdGFiZWxlY2ltZW50byI6IjMwMTU0IiwiQ2xhaW1zLk5vbWVFeGliaWNhb0VzdGFiZWxlY2ltZW50byI6IlNFQyAtIEdPScOCTklBIiwiQ2xhaW1zLkNvZGlnb0VzdGFiZWxlY2ltZW50b0Zpc2NhbCI6IjMwMTU0IiwiQ2xhaW1zLkNvZGlnb0FjZXNzbyI6ImUwMDRlYjg1LWNjZmMtNDdkMi04OTEwLTZlNGNiM2Q4ZTEyMSIsIkNsYWltcy5Db2RpZ29Db21wZXRlbmNpYSI6Ijc0ZmFiOWRiLTJiNjgtNDQ1Mi05YTFkLTA4ZTM3NjJiYzUzOCIsIkNsYWltcy5Ob21lRXhpYmljYW9Db21wZXRlbmNpYSI6IjA2LzIwMjUiLCJDbGFpbXMuQWNlc3NvR2xvYmFsIjoiRmFsc2UiLCJDbGFpbXMuQ29kaWdvSWRpb21hIjoiMSIsIkNsYWltcy5TaWdsYUlkaW9tYSI6InB0LUJSIiwiQ2xhaW1zLlNpZ2xhSWRpb21hRW1wcmVzYSI6InB0LUJSIiwiQ2xhaW1zLlNpbWJvbG9Nb2VkYSI6IlIkIiwiQ2xhaW1zLkNvZGlnb1BhaXMiOiIxMDU4IiwiQ2xhaW1zLk51bWVyb1JlZ2lzdHJvUG9yUGFnaW5hIjoiMTAwIiwiQ2xhaW1zLkNvZGlnb1RpcG9Fc3RhYmVsZWNpbWVudG8iOiIxMSIsIkNsYWltcy5EYXRhSW5pY2lhbENvbXBldGVuY2lhIjoiMjAyNS0wNi0wMSIsIkNsYWltcy5EYXRhRmluYWxDb21wZXRlbmNpYSI6IjIwMjUtMDYtMzAiLCJDbGFpbXMuQ29kaWdvRXN0YWRvIjoiNTIiLCJDbGFpbXMuQ29kaWdvUGFpc1JlbGF0b3JpbyI6IjEiLCJDbGFpbXMuVGVjbmljbyI6IkZhbHNlIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjpbIkJJMDAyMDEiLCJCSTAwMjAyIiwiQkkwMDIwMyIsIkJJMDAzMDEiLCJCSTAwMzAyIiwiQkkwMDQwMSIsIkJJMDA0MDIiLCJCSTAwNTAxIiwiQkkwMDUwMiIsIkJJMDA1MDMiLCJCSTAwNTA0IiwiQkkwMDYwMSIsIkJJMDA2MDIiLCJCSTAxMDAxIiwiQkkwMTAwMiIsIkJJMDExMDEiLCJCSTAxMTAyIiwiQkkwMTIwMSIsIkJJMDEyMDIiLCJDVEIwMDQwMSIsIkNUQjAwNDAzIiwiQ1RCMDA3MDEiLCJDVEIwMDcwNyIsIkNUQjAwNzA4IiwiQ1RCMDA3MDkiLCJDVEIwMDcxMCIsIkNUQjAwNzExIiwiQ1RCMDA3MTMiLCJDVEIwMDczOCIsIkNUQjAwNzM5IiwiQ1RCMDA3NDAiLCJDVEIwMDc0MSIsIkNUQjAwNzQzIiwiQ1RCMDA3NDQiLCJDVEIwMDc0NSIsIkNUQjAwNzQ5IiwiQ1RCMDA4MDEiLCJDVEIwMDgwMiIsIkNUQjAwOTAxIiwiQ1RCMDA5MDIiLCJDVEIwMDkwMyIsIkNUQjAxMDAxIiwiQ1RCMDEwMDQiLCJDVEIwMTAwNSIsIkNUQjAxMTAxIiwiQ1RCMDExMDIiLCJDVEIwMTIwMSIsIkNUQjAxMjAyIiwiQ1RCMDEzMDEiLCJDVEIwMTMwMiIsIkNUQjAxNDAxIiwiQ1RCMDE0MDIiLCJDVEIwMTcwMSIsIkNUQjAxNzAyIiwiQ1RCMDE4MDEiLCJDVEIwMTgwMiIsIkNUQjAxODAzIiwiQ1RCMDE5MDEiLCJDVEIwMTkwMiIsIkNUQjAyMDAxIiwiQ1RCMDIwMDIiLCJDVEIwMjAwMyIsIkNUQjAyMDA0IiwiQ1RCMDIwMDUiLCJDVEIwMjEwMSIsIkNUQjAyMTAyIiwiQ1RCMDIyMDEiLCJDVEIwMjIwMiIsIkNUQjAzMDAxIiwiRUFEMDAxMDEiLCJFU1QwMDUwMSIsIkVTVDAwNTAzIiwiRVNUMDA1MDQiLCJFU1QwMDgwMSIsIkVTVDAwODAyIiwiRVNUMDA5MDEiLCJFU1QwMDkwMiIsIkVTVDAwOTAzIiwiRVNUMDEyMDEiLCJFU1QwMTIwOCIsIkVTVDAxNTE1IiwiRVNUMDIyMDEiLCJFU1QwMjIwNiIsIkVTVDAyMjA3IiwiRVNUMDIyMDgiLCJFU1QwMjIwOSIsIkVTVDAyMjEzIiwiRVNUMDIyMTkiLCJFU1QwMjIyOSIsIkVTVDAyMjMzIiwiRVNUMDIyMzkiLCJFU1QwMjI0MiIsIkVTVDAyMjQ0IiwiRVNUMDIyNDUiLCJFU1QwMjI0NiIsIkVTVDAyMjQ3IiwiRVNUMDIyNTAiLCJFU1QwMjYwMSIsIkVTVDAyNjAyIiwiRVNUMDI2MDMiLCJFU1QwMjYwNyIsIkVTVDAyNjA5IiwiRVNUMDI2MTMiLCJFU1QwMjYxNSIsIkVTVDAyNjE2IiwiRVNUMDI3MDEiLCJFU1QwMjcxMiIsIkVTVDAyNzE2IiwiRVNUMDI3MjAiLCJFU1QwMjgwMSIsIkVTVDAyODA2IiwiRVNUMDI4MDciLCJFU1QwMjgxMSIsIkVTVDAyODEyIiwiRVNUMDI5MDEiLCJFU1QwMjkwNSIsIkVTVDAyOTA4IiwiRVNUMDI5MDkiLCJFU1QwMjkxMSIsIkVTVDAyOTE1IiwiRVNUMDI5MjAiLCJFU1QwMzAwMSIsIkVTVDAzMDAyIiwiRVNUMDMwMDMiLCJFU1QwMzYwMSIsIkVTVDAzNjAyIiwiRVNUMDQxMDEiLCJFU1QwNDEwMiIsIkVTVDA0MjAxIiwiRVNUMDQyMDIiLCJFU1QwNDQwMSIsIkVTVDA0NDAyIiwiRVNUMDQ0MDYiLCJFU1QwNDQwNyIsIkVTVDA0NDA5IiwiRVNUMDQ0MTYiLCJFU1QwNDQxOSIsIkVTVDA0NDIzIiwiRVNUMDQ2MDEiLCJFU1QwNDYwMiIsIkVTVDA0NjAzIiwiRVNUMDQ2MDQiLCJQVFIwMDcwMSIsIlBUUjAwNzAzIiwiUFRSMDA3MDYiLCJQVFIwMDcwOCIsIlBUUjAwODAxIiwiUFRSMDA4MDUiLCJQVFIwMDgwNiIsIlBUUjAwOTAxIiwiUFRSMDA5MDMiLCJQVFIwMTAwMSIsIlBUUjAxMDA0IiwiUFRSMDExMDEiLCJQVFIwMTIwMSIsIlBUUjAxMjAyIiwiUkVMMDA0MDEiLCJSRUwwMDQwNSIsIlJFTDAwNDExIiwiUkVMMDA0MTUiLCJSRUwwMDQxNiIsIlJFTDAxMDAxIiwiUkVMMDEwMTAiLCJSRUwwMTAxMSIsIlJFTDAxMDEyIiwiUkVMMDEwMTMiLCJSRUwwMTAxNCIsIlJFTDAxMDE3IiwiUkVMMDEwMTgiLCJSRUwwMTAyNiIsIlJFTDAxMDU3IiwiUkVMMDE3MDEiLCJSRUwwMTcwNiIsIlJFTDAxNzA4IiwiUkVMMDI1MDEiLCJSRUwwMjUwMiIsIlJFTDAyNTAzIiwiUkVMMDI1MDQiLCJSRUwwMjUwNSIsIlJFTDAzMTAxIiwiUkVMMDMxMDIiLCJSRUwwMzEwMyIsIlJFTDAzMTA0IiwiUkVMMDMxMDUiLCJSRUwwMzEwNiIsIlJFTDAzMTA3IiwiUkVMMDMxMDgiLCJSRUwwMzEwOSIsIlJFTDAzMTEwIiwiUkVMMDMxMTEiLCJSRUwwMzExMyIsIlJFTDAzMTE3IiwiUkVMMDMxMjEiLCJSRUwwMzEyMiIsIlJFTDAzMjAxIiwiUkVMMDMyMDIiLCJSRUwwMzIwMyIsIlJFTDAzMjA0IiwiUkVMMDMyMDUiLCJSRUwwMzMwMSIsIlJFTDAzMzAyIiwiUkVMMDM0MDEiLCJSRUwwMzQwMiIsIlJFTDAzNDAzIiwiUkVMMDM1MDEiLCJSRUwwMzUwMiIsIlJFTDAzNTAzIiwiUkVMMDM2MDEiLCJSRUwwMzYwMiIsIlJFTDAzNjAzIiwiUkVMMDM3MDEiLCJSRUwwMzcwMiIsIlJFTDAzNzAzIiwiUkVMMDM3MDQiLCJSRUwwMzcwNSIsIlJFTDAzNzA2IiwiUkVMMDM4MDEiLCJSSDAwMjAxIiwiUkgwMDIwMyIsIlJIMDAyMDQiLCJSSDAwMzAxIiwiUkgwMDMwMyIsIlJIMDA0MDEiLCJSSDAwNDAzIiwiUkgwMDQwNiIsIlJIMDA1MDEiLCJSSDAwNTAzIiwiU0lTOTk5MTkiLCJTSVM5OTkyMCIsIlRFUzAwMjAxIiwiVEVTMDA0MDEiLCJURVMwMDQwNCIsIlRFUzAwNTAxIiwiVEVTMDA1MDYiLCJURVMwMDUwNyIsIlRFUzAwNjAxIiwiVEVTMDA2MDQiLCJURVMwMDcwMSIsIlRFUzAwNzAyIiwiVEVTMDA4MDEiLCJURVMwMDgwNCIsIlRFUzAwOTAxIiwiVEVTMDA5MDIiLCJURVMwMDkwMyIsIlRFUzAxMjAxIiwiVEVTMDEyMDIiLCJURVMwMTMwMSIsIlRFUzAxMzA2IiwiVEVTMDEzMDciLCJURVMwMTMwOCIsIlRFUzAxMzEwIiwiVEVTMDEzMTQiLCJURVMwMTMxNSIsIlRFUzAxMzE2IiwiVEVTMDEzMTciLCJURVMwMTMxOSIsIlRFUzAxMzIwIiwiVEVTMDEzMjIiLCJURVMwMTMyMyIsIlRFUzAxNDAxIiwiVEVTMDE0MDMiLCJURVMwMTQwNSIsIlRFUzAxNDA2IiwiVEVTMDE1MDEiLCJURVMwMTUwMyIsIlRFUzAxNTEwIiwiVEVTMDE1MTMiLCJURVMwMTUxNCIsIlRFUzAxNzAxIiwiVEVTMDE3MDgiLCJURVMwMTcwOSIsIlRFUzAxNzEwIiwiVEVTMDE3MTEiLCJURVMwMTcxMiIsIlRFUzAxNzE2IiwiVEVTMDE3MTciLCJURVMwMTcxOCIsIlRFUzAxODAxIiwiVEVTMDE4MDIiLCJURVMwMTkwMSIsIlRFUzAxOTAyIiwiVEVTMDIxMDEiLCJURVMwMjEwMyIsIlRFUzAyMTA1IiwiVEVTMDIxMDYiLCJURVMwMjEwOCIsIlRFUzAyMzAxIiwiVEVTMDIzMDQiLCJURVMwMjMwNSIsIlRFUzAyMzA2IiwiVEVTMDIzMDciLCJURVMwMjMwOCIsIlRFUzAyNDAxIiwiVEVTMDI0MDQiLCJURVMwMjQwNSIsIlRFUzAyNDA2IiwiVEVTMDI0MDciLCJURVMwMjQwOCIsIlRFUzAyNTAxIiwiVEVTMDI1MDQiLCJURVMwMjUwNSIsIlRFUzAyNTA2IiwiVEVTMDI1MDciLCJURVMwMjUwOCIsIlRFUzAyNTEwIiwiVEVTMDI2MDEiLCJURVMwMjYwNCIsIlRFUzAyNjA1IiwiVEVTMDI2MDYiLCJURVMwMjYwNyIsIlRFUzAyNjA4IiwiVEVTMDI3MDEiLCJURVMwMjcwNCIsIlRFUzAyNzA1IiwiVEVTMDI3MDYiLCJURVMwMjcwNyIsIlRFUzAyNzA4IiwiVEVTMDI5MDEiLCJURVMwMjkwMiIsIlRFUzAzMDAxIiwiVEVTMDMwMDIiLCJURVMwMzEwMSIsIlRFUzAzMTAyIiwiVEVTMDMzMDEiLCJURVMwMzMwMiIsIlRFUzAzNTAxIiwiVEVTMDM1MDMiLCJURVMwMzUwNSIsIlRFUzAzNjAxIiwiVEVTMDM2MDIiLCJURVMwMzYwMyIsIlRFUzAzNjA0IiwiVEVTMDM4MDEiLCJURVMwNDAwMSIsIlRFUzA0MDAyIiwiVEVTMDQ1MDEiLCJURVMwNDUwMyIsIlRFUzA1MjAxIiwiVEVTMDUyMDQiLCJURVMwNTMwMSIsIlRFUzA1MzAzIiwiVEVTMDU1MDEiLCJURVMwNTYwMSIsIlRFUzA1NjAzIiwiVkVSMDAxMDEiLCJWRVIwMDIwMSIsIlZFUjAwMjAyIiwiVkVSMDAyMDMiLCJWRVIwMDIwNCIsIlZFUjAwMjA2IiwiVkVSMDAyMDciLCJWRVIwMDIwOCIsIlZFUjAwODAxIiwiVkVSMDA4MDIiLCJWRVIwMDgwMyIsIlZFUjAwODA0IiwiVkVSMDA4MDUiLCJWRVIwMDgwNiIsIlZFUjAwODA3IiwiVkVSMDA4MDgiLCJWRVIwMDgwOSIsIlZFUjAwODEwIiwiVkVSMDA4MTEiLCJWRVIwMDgxMiIsIlZFUjAwODEzIiwiVkVSMDA5MDEiLCJWSUEwMDEwMSIsIlZJQTAwMTAzIiwiVklBMDAxMDYiLCJWSUEwMDEwNyIsIlZJQTAwMTA5IiwiVklBMDAxMTIiLCJWSUEwMDExNCIsIlZJQTAwMTE2IiwiVklBMDAxMTciLCJWSUEwMDExOCIsIlZJQTAwMTE5IiwiVklBMDAxMjEiLCJWSUEwMDEyMiIsIlZJQTAwMTIzIiwiVklBMDAxMjQiLCJWSUEwMDEyNSIsIlZJQTAwMTMwIiwiVklBMDAxMzEiXSwiZXhwIjoxNzUwMzM2Nzc2LCJpc3MiOiJodHRwczovL3NpZ2EtYXBpLmNvbmdyZWdhY2FvLm9yZy5ici8iLCJhdWQiOiJodHRwczovL3NpZ2EtYXBpLmNvbmdyZWdhY2FvLm9yZy5ici8ifQ.2_VhO0AajN_zyL09ZttVNcGkpV7QEfopp8iSQ8mR9iU';

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
      }
    );
    const json = await res.json();
    if (Array.isArray(json.dados)) {
      for (const item of json.dados) {
        process.stdout.write('M');
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
      }
    );
    const json = await res.json();
    if (Array.isArray(json.dados)) {
      for (const item of json.dados) {
        process.stdout.write('A');
        yield item;
        recebidos++;
      }
    }
    paginaAtual++;
    continuar =
      recebidos < (json.totalLinhas || 0) && json.dados.length === pag;
  }
}

function createTransformStream(detalhesFn, token, concorrencia = 4) {
  let active = 0;
  const pending = [];
  return new TransformStream({
    async transform(item, controller) {
      const p = (async () => {
        try {
          active++;
          const result = await detalhesFn(item, token);
          controller.enqueue(result);
        } catch (_) {
        } finally {
          active--;
        }
      })();
      pending.push(p);
    },
    async flush() {
      await Promise.all(pending);
    },
  });
}

async function* streamTransform(source, detalhesFn, token, concorrencia) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  (async () => {
    for await (const item of source) {
      await writer.write(item);
    }
    writer.close();
  })();
  const reader = readable
    .pipeThrough(createTransformStream(detalhesFn, token, concorrencia))
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
    });
    const detalhes = await res.json();
    process.stdout.write(grupo[0].toLowerCase());
    Object.assign(item, detalhes);
  } catch (e) {
    console.error(`Erro ao obter detalhes (${grupo}):`, e.message);
  }
  return dadosPDO(item);
}

export function executarMinisterios(token, pag = 100, concorrencia = 4) {
  return streamTransform(
    getMinisterios(token, pag),
    (item) =>
      detalhesItem(
        item,
        token,
        'Ministério',
        'https://siga-api.congregacao.org.br/api/rel/rel032/servo/visualizar'
      ),
    token,
    concorrencia
  );
}

export function executarAdmin(token, pag = 100, concorrencia = 4) {
  return streamTransform(
    getAdministradores(token, pag),
    (item) =>
      detalhesItem(
        item,
        token,
        'Administrador',
        'https://siga-api.congregacao.org.br/api/rel/rel034/servo/visualizar'
      ),
    token,
    concorrencia
  );
}

export async function carregarDados({ auth, pag = 100, concorrencia = 4 }) {
  const inicio = performance.now();
  const dados = [];
  for await (const item of executarMinisterios(auth.token, pag, concorrencia))
    dados.push(item);
  for await (const item of executarAdmin(auth.token, pag, concorrencia))
    dados.push(item);
  const fim = performance.now();
  console.log(
    `\nTotal: ${dados.length} itens, Tempo: ${((fim - inicio) / 60000).toFixed(
      2
    )} min`
  );
  return dados;
}

// Exemplo de uso
carregarDados({ auth: { token } })
  .then(() => {})
  .catch(console.error);

import { Fluxo } from '../../../../core/Fluxo.js';
import { sheet } from '../../../sheet/index.js';
import ky from 'ky';
import * as cheerio from 'cheerio';
import { betweenDates } from '../../../../util/date.js';
import { executeKyRequest } from '../../../http/executeKyRequest.js';
import { igrejas } from './igrejas.js';

// Utilitário para converter datas do Excel
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

// Função padrão para headers
function getHeaders(auth, contentType = 'application/x-www-form-urlencoded') {
  return {
    'Content-Type': contentType,
    Cookie: auth.cookies,
    __antixsrftoken: auth.antixsrftoken,
  };
}

const request = ky.create({ retry: { limit: 5 }, timeout: 60000 });

export async function getDespesas(
  { cookies },
  { IGREJA_COD = null },
  date1,
  date2
) {
  const despesas = [];
  const processamentos = [];

  const headersBase = {
    Host: 'siga-rpt.congregacao.org.br',
    Cookie: cookies,
    Referer: 'https://siga.congregacao.org.br/',
  };

  try {
    const authPageResponse = await executeKyRequest(() =>
      request.get(
        'https://siga.congregacao.org.br/TES/TES00901.aspx?f_inicio=S&__initPage__=S',
        {
          headers: {
            ...headersBase,
            Host: 'siga.congregacao.org.br',
            Referer: 'https://siga.congregacao.org.br/TES/TES00901.aspx',
          },
        }
      )
    );

    const htmlText = await authPageResponse.text();
    const $ = cheerio.load(htmlText);
    const auth = String($('#auth').val() || '');
    if (!auth)
      throw new Error(
        "Token de autenticação 'auth' não encontrado. Verifique o arquivo 'response.html'."
      );
    const params = {
      auth,
      f_data1: date1.split('-').reverse().join('/'),
      f_data2: date2.split('-').reverse().join('/'),
      f_estabelecimento: IGREJA_COD,
      f_centrocusto: '',
      f_fornecedor: '',
      f_formato: 'https://siga-rpt.congregacao.org.br/TES/TES00902.aspx',
      f_saidapara: 'Excel',
      f_agrupar: 'CentrodeCusto',
      __initPage__: 'S',
    };
    const reportResponse = await executeKyRequest(() =>
      ky.get(
        `https://siga-rpt.congregacao.org.br/TES/TES00902?${new URLSearchParams(
          params
        ).toString()}`,
        { headers: headersBase }
      )
    );
    const contentType = reportResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/vnd.ms-excel')) {
      const buffer = await (await reportResponse.blob()).arrayBuffer();
      const processarXLS = async (buf) => {
        const values = await sheet.blobBytesToArray(buf);
        let Localidade = '',
          setor = '',
          Ref = '';
        for (const row of values) {
          try {
            if (!Array.isArray(row) || !row.length) continue;
            if (/^Mês \d\d\/\d+/.test(`${row[0]}`)) {
              const [mes, ano] = row[0].match(/(\d{2})\/(\d{4})/).slice(1);
              Ref = `${mes}/${ano}`;
            } else if (/^(SET)/.test(`${row[0]}`)) {
              setor = row[0];
            } else if (
              /^([A-Za-z]{2}) \d+-\d+|ADM|PIA|DR|CP/.test(`${row[0]}`)
            ) {
              Localidade = row[0];
            } else if (/^\d+$/.test(`${row[0]}`)) {
              despesas.push(
                Fluxo.create({
                  FLUXO: 'Saída',
                  IGREJA: Localidade,
                  IGREJA_DESC: Localidade,
                  CATEGORIA: row[6],
                  DATA: new Date(
                    new Date(1899, 11, 30).getTime() + row[0] * 86400000
                  ).toISOString(),
                  VALOR: row[30] || 0,
                  OBSERVACOES: `${row[8]}, NF: ${row[4]}; ${row[3]}; Valor: ${row[15]}; Multa: ${row[21]}; Juros: ${row[24]}; Desconto: ${row[27]}`,
                  REF: Ref,
                  ORIGEM: 'SIGA',
                  SETOR: setor,
                })
              );
            }
          } catch {}
        }
        console.log('🎉 Processado XLS de despesas:', Ref);
      };
      processamentos.push(processarXLS(buffer));
      await Promise.allSettled(processamentos);
    } else {
      throw new Error(
        'O servidor não retornou um arquivo Excel. Verifique o conteúdo da resposta.'
      );
    }
  } catch (error) {
    console.error('Erro ao buscar a página de autenticação:', error);
    return [];
  }

  return despesas;
}

export async function getColetas(
  { cookies, antixsrftoken, token },
  igreja,
  date1,
  date2
) {
  try {
    try {
      const getResp = await executeKyRequest(() =>
        request.get('https://siga.congregacao.org.br/TES/TES00501.aspx', {
          headers: {
            Cookie: cookies,
            __antixsrftoken: antixsrftoken,
            Referer:
              'https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S',
          },
          retry: { limit: 5 },
        })
      );

      const $ = cheerio.load(await getResp.text());
      const ListaEstabelecimentos = $('#dropdown_localidades li')
        .map((_, el) => $(el).attr('id'))
        .get()
        .join(', ');

      const dados = {
        DataInicio: date1,
        DataFim: date2,
        Estabelecimento: '',
        ListaEstabelecimentos,
        FormaContribuicao: '0',
        Formato: 'xlsx',
      };

      const resp = await executeKyRequest(() =>
        request.post('https://sigarpt-api.congregacao.org.br/api/tes/tes005', {
          headers: {
            Host: 'sigarpt-api.congregacao.org.br',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Sec-Ch-Ua-Platform': '"Linux"',
          },
          body: JSON.stringify(dados),
          retry: { limit: 3 },
        })
      );

      const contentType = resp.headers.get('content-type');

      if (
        !contentType?.includes(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ) {
        const text = await resp.text();
        console.error('[getColetas] Resposta inesperada:', text.slice(0, 300));
      }

      const buffer = await resp.arrayBuffer();

      function excelToDate(n) {
        return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      }

      const values = (await sheet.blobBytesToArray(buffer))
        .map((row) => {
          try {
            const date = new Date(excelDateToJSDate(row[0]));

            if (!date || isNaN(date.getTime())) {
              return null;
            }
            return Fluxo.create({
              FLUXO: 'Coleta',
              IGREJA: row[4],
              IGREJA_DESC: `${row[4]}`.replace(/^XX/, 'BR'),
              CATEGORIA: `${row[2]}`.replace('CULTO OFICIAL', 'CLT'),
              DATA: date.toISOString(),
              VALOR: row[5],
              OBSERVACOES: row[1],
              REF: `${(date.getMonth() + 1)
                .toString()
                .padStart(2, '0')}/${date.getFullYear()}`,
              ORIGEM: 'SIGA',
              SETOR: '',
            });
          } catch (error) {
            console.error('Erro ao processar linha da coleta: ', error, row);
          }
        })
        .filter(Boolean);
      return values;
    } catch (err) {
      console.error(
        `[getColetas] Erro ao processar coletas ${date1} à ${date2}`,
        err
      );
    }
  } catch (error) {
    console.error('Erros ao processar coletas:: ', error);
    return [];
  }
}

export async function getDepositos(
  { cookies, antixsrftoken },
  { IGREJA_COD },
  date1,
  date2
) {
  const fluxos = [];
  const processamentos = [];

  try {
    const refs = betweenDates(date1, date2).map((e) => e.ref);

    const result = await executeKyRequest(() =>
      request.get(
        'https://siga.congregacao.org.br/TES/TES00701.aspx?f_inicio=S&__initPage__=S',
        { headers: getHeaders({ cookies, antixsrftoken }) }
      )
    );

    const html = await result.text();
    const $ = cheerio.load(html);
    const auth = String($('#auth').val() || '');

    const competencias = [];
    const select = $('#f_competencia');
    if (select.length) {
      select.find('option').each((_, option) => {
        const value = $(option).attr('value');
        const desc = $(option).text();
        if (!desc.includes('Todos') && refs.includes(desc))
          competencias.push({ value, description: desc });
      });
    }

    const processarXLS = async (buffer, ref) => {
      const values = await sheet.blobBytesToArray(buffer);
      let igrejaNome = '';
      for (const row of values) {
        if (/^(SET|ADM|BR|XX|PIA)/.test(`${row[0]}`)) igrejaNome = row[0];
        else if (/^\d\d\/\d{4}/.test(row[2])) {
          ref = row[2];
          fluxos.push(
            Fluxo.create({
              FLUXO: 'Deposito',
              IGREJA: igrejaNome,
              IGREJA_DESC: igrejaNome,
              DATA: new Date(excelDateToJSDate(row[3])).toISOString(),
              VALOR: row[18],
              OBSERVACOES: `Conta: ${row[7]}; Documento: ${row[16]}`,
              REF: ref,
              ORIGEM: 'SIGA',
            })
          );
        }
      }
      console.log('Processado XLS de depósito:', ref);
    };

    for (const { value: competencia, description: ref } of competencias) {
      try {
        const resp = await executeKyRequest(() =>
          request.get(
            `https://siga-rpt.congregacao.org.br/TES/TES00702.aspx?${new URLSearchParams(
              {
                auth,
                f_competencia: competencia,
                f_data1: '',
                f_data2: '',
                f_estabelecimento: IGREJA_COD,
                f_saidapara: 'Excel',
                f_ordenacao: 'alfabetica',
                __initPage__: 'S',
              }
            ).toString()}`,
            {
              headers: {
                ...getHeaders({ cookies, antixsrftoken }),
                Host: 'siga-rpt.congregacao.org.br',
                Referer: 'https://siga.congregacao.org.br/',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              },
            }
          )
        );

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/vnd.ms-excel')) {
          console.warn(`[getDepositos] Ignorado XLS inválido para: ${ref}`);
          continue;
        }

        const buffer = await (await resp.blob()).arrayBuffer();
        processamentos.push(processarXLS(buffer, ref));
      } catch (err) {
        console.error(
          `[getDepositos] Erro na competência ${competencia}:`,
          err
        );
      }
    }

    await Promise.allSettled(processamentos);
    console.log('Fluxos de depósitos carregados:', fluxos.length);
  } catch (err) {
    console.error('[getDepositos] Erro geral:', err);
    return [];
  }

  return fluxos;
}

export async function getOfertas(
  { cookies, antixsrftoken },
  igreja,
  date1,
  date2
) {
  const fluxos = [];
  const processamentos = [];

  const headersBase = {
    Cookie: cookies,
    __antixsrftoken: antixsrftoken,
  };

  const data1BR = date1.split('-').reverse().join('/');
  const data2BR = date2.split('-').reverse().join('/');

  const getResp = await executeKyRequest(() =>
    request.get(
      'https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S&__initPage__=S',
      {
        headers: {
          ...headersBase,
          Host: 'siga.congregacao.org.br',
          Referer:
            'https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S',
        },
        retry: { limit: 5 },
        redirect: 'follow',
      }
    )
  );

  const html = await getResp.text();

  const $ = cheerio.load(html);

  const auth = String($('#auth').val() || '');
  if (!auth)
    throw new Error(
      "Token de autenticação 'auth' não encontrado. Verifique o arquivo 'response.html'."
    );

  const options = $('#f_estabelecimento option');
  const estabelecimentos = [];
  options.each((index, element) => {
    const value = $(element).attr('value');
    const description = $(element).text().replace(/\s+/g, ' ').trim();
    if (value) {
      estabelecimentos.push({ value, description });
    }
  });
  const filtro_relatorio = estabelecimentos.map((e) => e.value).join(', ');
  const processarXLS = async (buffer, igrejaNome) => {
    const values = await sheet.blobBytesToArray(buffer);
    let categoria = '',
      observacoes = [],
      ref = '',
      setor = '';

    for (const row of values) {
      if (/^(CLT|RJM)/.test(row[0])) categoria = row[0];
      else if (/^Título/.test(row[0])) observacoes = row;

      if (/^\d{2}\/\d{2}\/\d{4}/.test(row[4])) {
        const [dia, mes, ano] = row[4].split('/');
        const data = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${
          categoria === 'CLT' ? '19:30:00' : '09:30:00'
        }-03:00`;
        ref = `${mes}/${ano}`;

        for (let i = 5; i < row.length; i++) {
          if (typeof row[i] !== 'number') continue;
          if (observacoes[i]?.startsWith('Total')) continue;

          fluxos.push(
            Fluxo.create({
              FLUXO: 'Oferta',
              IGREJA: igrejaNome,
              IGREJA_DESC: igrejaNome,
              CATEGORIA: categoria,
              DATA: data,
              VALOR: row[i],
              OBSERVACOES: `Tipo: ${observacoes[i] || ''};`,
              REF: ref,
              ORIGEM: 'SIGA',
              SETOR: setor,
            })
          );
        }
      }
    }

    console.log(`✔️ Processado XLS de ${igrejaNome}`);
  };

  for (const { value: estId, description: igrejaNome } of estabelecimentos) {
    try {
      console.log(`🔁 Iniciando coleta para: ${igrejaNome}`);

      const form = new FormData();
      const dados = {
        f_consultar: 'S',
        f_data1: data1BR,
        f_data2: data2BR,
        f_estabelecimento: estId,
        f_filtro_relatorio: filtro_relatorio,
        f_formacontribuicao: '0',
        f_opcao2: 'culto',
        f_exibir: 'comvalor',
        f_detalhar: 'true',
        f_saidapara: 'Excel',
        f_ordenacao: 'alfabetica',
        __initPage__: 'S',
        __jqSubmit__: 'S',
      };

      Object.entries(dados).forEach(([k, v]) => form.append(k, v));

      await executeKyRequest(() =>
        request.post('https://siga.congregacao.org.br/TES/TES00501.aspx', {
          headers: headersBase,
          body: form,
          retry: { limit: 5 },
          timeout: 60000,
        })
      );

      const excelResp = await executeKyRequest(() =>
        request.get(
          `https://siga-rpt.congregacao.org.br/TES/TES00507?${new URLSearchParams(
            {
              f_saidapara: 'Excel',
              auth,
              __initPage__: 'S',
            }
          ).toString()}`,
          {
            headers: {
              ...headersBase,
              Host: 'siga-rpt.congregacao.org.br',
              Referer: 'https://siga.congregacao.org.br/',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            },
            redirect: 'follow',
          }
        )
      );

      const contentType = excelResp.headers.get('content-type');
      if (!contentType?.includes('application/vnd.ms-excel')) {
        const text = await excelResp.text();
        console.warn(
          `⚠️ XLS inválido de ${igrejaNome}:\n${text.slice(0, 300)}`
        );
        continue;
      }

      const buffer = await excelResp.arrayBuffer();
      // ⏱️ Processamento não bloqueia a próxima requisição
      processamentos.push(processarXLS(buffer, igrejaNome));
    } catch (err) {
      console.error(`❌ Erro em ${igrejaNome} (${estId}):`, err);
    }
  }

  await Promise.allSettled(processamentos);
  console.log(`✅ Total de fluxos carregados: ${fluxos.length}`);
  return fluxos;
}
export async function carregarFluxo(payload) {
  const { auth, empresa, date1, date2 } = payload;

  const [despesas, depositos, coletas] = await Promise.all([
    getDespesas(auth, empresa, date1, date2),
    // getDepositos(auth, empresa, date1, date2),
    // getColetas(auth, empresa, date1, date2),
    [],[]
  ]);

  return [...despesas, ...depositos, ...coletas].map((e) => {
    e.IGREJA = e.IGREJA?.replace(/^(BR|XX|YY|TT)\s\d{2}-\d{4}\s-\s/, '').trim();
    e.IGREJA_ADM = empresa.IGREJA_ADM;
    e.IGREJA_COD = empresa.IGREJA_COD;
    e.IGREJA_TIPO = empresa.IGREJA_TIPO;
    e.REGIONAL = empresa.REGIONAL;
    return e;
  });
}

// Carretar Fluxo e Ofertas em paralelo pode gerar erro
export async function carregarOfertas(payload) {
  const { auth, empresa, date1, date2 } = payload;
  const fluxos = [];
  const ofertas = await getOfertas(auth, empresa, date1, date2);
  fluxos.push(...ofertas);
  return fluxos.map((e) => {
    e.IGREJA = e.IGREJA?.replace(
      /^((BR|XX|YY|TT) \d{2}-\d{4}) - (.*)$/,
      '$3'
    ).trim();
    e.IGREJA_ADM = empresa.IGREJA_ADM;
    e.IGREJA_COD = empresa.IGREJA_COD;
    e.IGREJA_TIPO = empresa.IGREJA_TIPO;
    e.REGIONAL = empresa.REGIONAL;
    return e;
  });
}

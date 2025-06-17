// import { Igreja } from '../../../../core/Igreja';

import { Fluxo } from '../../../../core/Fluxo.js';
import { sheet } from '../../../sheet/index.js';
import ky from 'ky';
import * as cheerio from 'cheerio';
import { betweenDates } from '../../../../util/date.js';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function getDespesas(auth, igreja, date1, date2) {
  const despesas = [];
  const processamentos = [];

  const headersBase = {
    Cookie: auth.cookies,
    __antixsrftoken: auth.antixsrftoken,
  };

  try {
    const params = {
      f_data1: date1.split('-').reverse().join('/'),
      f_data2: date2.split('-').reverse().join('/'),
      f_estabelecimento: igreja.IGREJA_COD,
      f_centrocusto: '',
      f_fornecedor: '',
      f_formato: 'TES00902.aspx',
      f_saidapara: 'Excel',
      f_agrupar: 'CentrodeCustoSetor',
      __initPage__: 'S',
    };

    const response = await request.post(
      'https://siga.congregacao.org.br/TES/TES00902.aspx',
      {
        headers: {
          ...headersBase,
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer:
            'https://siga.congregacao.org.br/TES/TES00901.aspx?f_inicio=S',
        },
        body: new URLSearchParams(params).toString(),
        retry: { limit: 5 },
        timeout: 50000,
      }
    );

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/vnd.ms-excel')) return [];

    const buffer = await (await response.blob()).arrayBuffer();

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
          } else if (/^(BR \d+-\d+|ADM|PIA|DR|CP)/.test(`${row[0]}`)) {
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
      console.log('Processado XLS de despesas:', Ref);
    };

    processamentos.push(processarXLS(buffer));
    await Promise.allSettled(processamentos);
    console.log('Fluxos de despesas carregados:', despesas.length);
  } catch (err) {
    console.error('[getDespesas] Erro:', err);
  }

  return despesas;
}

async function getColetas(auth, igreja, date1, date2) {
  const fluxos = [];
  const processamentos = [];

  const headersBase = {
    Cookie: auth.cookies,
    __antixsrftoken: auth.antixsrftoken,
  };

  const processarXLS = async (buffer, ref, end) => {
    const values = await sheet.blobBytesToArray(buffer);
    let nomeIgreja = '',
      setor = '',
      headersRow = '',
      tipo = '';

    for (const row of values) {
      if (/^Total/.test(row[0])) nomeIgreja = '';
      else if (/^Todos/.test(row[0])) break;
      else if (/^Casa de Oração/.test(row[0])) headersRow = row;
      else if (/^(SET)/.test(row[0])) {
        setor = row[0];
        continue;
      } else if (/^(BR|ADM)/.test(row[0])) nomeIgreja = row[0];

      if (/^Tipo/.test(row[6])) continue;

      if (/[a-z]/i.test(row[6])) {
        tipo = row[6];
        for (let i = 7; i < headersRow.length; i++) {
          if (headersRow[i] === 'Total') break;
          if (!headersRow[i] || typeof row[i] !== 'number') continue;

          fluxos.push(
            Fluxo.create({
              FLUXO: 'Coleta',
              IGREJA: nomeIgreja,
              IGREJA_DESC: nomeIgreja,
              CATEGORIA: tipo,
              DATA: end,
              VALOR: row[i],
              OBSERVACOES: `Tipo: ${headersRow[i]}`,
              REF: ref,
              ORIGEM: 'SIGA',
              SETOR: setor,
            })
          );
        }
      }
    }
    console.log('Terminou processamento de XLS para:', ref);
  };

  for (const { start, end, ref } of betweenDates(date1, date2)) {
    try {
      const getResp = await request.get(
        'https://siga.congregacao.org.br/TES/TES00501.aspx',
        {
          headers: {
            ...headersBase,
            Referer:
              'https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S',
          },
          retry: { limit: 5 },
        }
      );

      const $ = cheerio.load(await getResp.text());
      const filtro_relatorio = $('#dropdown_localidades li')
        .map((_, el) => $(el).attr('id'))
        .get()
        .join(', ');

      const data1BR = start.split('-').reverse().join('/');
      const data2BR = end.split('-').reverse().join('/');

      const form = new FormData();
      const dados = {
        f_consultar: 'S',
        f_data1: data1BR,
        f_data2: data2BR,
        f_estabelecimento: '',
        f_filtro_relatorio: filtro_relatorio,
        f_formacontribuicao: '0',
        f_opcao2: 'casaoracao',
        f_exibir: 'comvalor',
        f_detalhar: 'true',
        f_saidapara: 'Excel',
        f_ordenacao: 'alfabetica',
        __initPage__: 'S',
        __jqSubmit__: 'S',
      };
      Object.entries(dados).forEach(([k, v]) => form.append(k, v));

      await ky.post('https://siga.congregacao.org.br/TES/TES00501.aspx', {
        headers: headersBase,
        body: form,
        retry: { limit: 5 },
      });

      const excelResp = await ky.post(
        'https://siga.congregacao.org.br/TES/TES00507.aspx',
        {
          headers: {
            ...headersBase,
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: 'https://siga.congregacao.org.br',
            Accept:
              'application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
          },
          body: new URLSearchParams({
            f_saidapara: 'Excel',
            __initPage__: 'S',
          }).toString(),
          retry: { limit: 5 },
          timeout: 60000,
          redirect: 'follow',
        }
      );

      const contentType = excelResp.headers.get('content-type');
      if (!contentType?.includes('application/vnd.ms-excel')) {
        const text = await excelResp.text();
        const $body = cheerio.load(text)('body');
        let plainText = $body.text().replace(/\s+/g, ' ').trim();
        if (!plainText)
          plainText = text
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        console.error(
          `[getColetas] Resposta inválida (${ref}):`,
          plainText.slice(0, 300)
        );
        continue;
      }

      const buffer = await excelResp.arrayBuffer();
      processamentos.push(processarXLS(buffer, ref, end));
    } catch (err) {
      console.error(`[getColetas] Erro no período ${start} a ${end}:`, err);
    }
  }

  await Promise.allSettled(processamentos);
  console.log('Fluxos carregados:', fluxos.length);
  return fluxos;
}

async function getDepositos(auth, igreja, date1, date2) {
  const fluxos = [];
  const processamentos = [];

  try {
    const refs = betweenDates(date1, date2).map((e) => e.ref);

    const result = await request.get(
      'https://siga.congregacao.org.br/TES/TES00701.aspx?f_inicio=S&__initPage__=S',
      { headers: getHeaders(auth) }
    );

    const html = await result.text();
    const selectMatch =
      /<select[^>]*id="f_competencia"[^>]*>([\s\S]*?)<\/select>/i.exec(html);

    const competencias = [];
    if (selectMatch) {
      const optionsHtml = selectMatch[1];
      const regex = /<option[^>]*value="([^"]*)".*?>(.*?)<\/option>/gi;
      let match;
      while ((match = regex.exec(optionsHtml)) !== null) {
        const value = match[1],
          desc = match[2];
        if (!desc.includes('Todos') && refs.includes(desc))
          competencias.push({ value, description: desc });
      }
    }

    const processarXLS = async (buffer, ref) => {
      const values = await sheet.blobBytesToArray(buffer);
      let igrejaNome = '';
      for (const row of values) {
        if (/^(SET|ADM|BR|PIA)/.test(`${row[0]}`)) igrejaNome = row[0];
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
        const resp = await request.post(
          'https://siga.congregacao.org.br/TES/TES00702.aspx',
          {
            headers: getHeaders(auth),
            body: new URLSearchParams({
              f_competencia: competencia,
              f_data1: '',
              f_data2: '',
              f_estabelecimento: igreja.IGREJA_COD,
              f_saidapara: 'Excel',
              f_ordenacao: 'alfabetica',
              __initPage__: 'S',
            }).toString(),
          }
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
  }

  return fluxos;
}

async function getOfertas(auth, igreja, date1, date2) {
  const fluxos = [];
  const processamentos = [];

  const headersBase = {
    Cookie: auth.cookies,
    __antixsrftoken: auth.antixsrftoken,
  };

  const data1BR = date1.split('-').reverse().join('/');
  const data2BR = date2.split('-').reverse().join('/');

  const getResp = await request.get(
    'https://siga.congregacao.org.br/TES/TES00501.aspx',
    {
      headers: {
        ...headersBase,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S',
      },
      retry: { limit: 5 },
    }
  );

  const $ = cheerio.load(await getResp.text());

  const estabelecimentos = $('#dropdown_localidades li')
    .map((_, el) => {
      const value = ($(el).attr('id') || '').trim();
      const description = ($(el).find('a').text() || '')
        .replace(/^[\s\u00A0]+/, '')
        .trim();
      return { value, description };
    })
    .get()
    .filter((e) => e.value && e.description && !/^&/.test(e.description));

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

      await ky.post('https://siga.congregacao.org.br/TES/TES00501.aspx', {
        headers: headersBase,
        body: form,
        retry: { limit: 5 },
      });

      const excelResp = await request.post(
        'https://siga.congregacao.org.br/TES/TES00507.aspx',
        {
          headers: {
            ...headersBase,
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: 'https://siga.congregacao.org.br',
            Accept:
              'application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
          },
          body: new URLSearchParams({
            f_saidapara: 'Excel',
            __initPage__: 'S',
          }).toString(),
          retry: { limit: 5 },
          timeout: 60000,
          redirect: 'follow',
        }
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
    getDepositos(auth, empresa, date1, date2),
    getColetas(auth, empresa, date1, date2),
  ]);

  return [...despesas, ...depositos, ...coletas];
}

// Carretar Fluxo e Ofertas em paralelo pode gerar erro
export async function carregarOfertas(payload) {
  const { auth, empresa, date1, date2 } = payload;
  const fluxos = [];
  const ofertas = await getOfertas(auth, empresa, date1, date2);
  fluxos.push(...ofertas);
  return fluxos;
}

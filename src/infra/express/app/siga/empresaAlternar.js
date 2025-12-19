import ky from 'ky';
import * as cheerio from 'cheerio';
import { executeKyRequest } from '../../../http/executeKyRequest.js';

export async function empresaAlterar(values) {
  try {
    // Buscar HTML da página
    const $ = cheerio.load(values.auth.page);
    const usuario = String($('input[id^="f_usuario_"]').val()) || '';
    // Buscar competências
    const competencias = await ky
      .post(
        'https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetenciasAsync',
        {
          json: { codigoEmpresa: String(values.igreja.UNIDADE_COD) },
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            Cookie: values.auth.cookies,
            __antixsrftoken: values.auth.antixsrftoken,
          },
          retry: { limit: 5 },
          timeout: 60000,
        },
      )
      .json();

    const competencia = competencias?.d?.Result[0]?.Codigo;

    if(!competencia) {
      throw new Error('Nenhuma competência encontrada para a empresa.');
    }

    // Enviar alteração de empresa
    const formData = new URLSearchParams();
    formData.append('gravar', 'S');
    formData.append('f_usuario', usuario);
    formData.append('f_empresa', String(values.igreja.UNIDADE_COD));
    formData.append('f_estabelecimento', values.igreja.IGREJA_COD);
    formData.append('f_competencia', competencia);
    formData.append('__jqSubmit__', 'S');

    await executeKyRequest(() => ky.post('https://siga.congregacao.org.br/SIS/SIS99906.aspx', {
      body: formData,
      headers: {
        Cookie: values.auth.cookies,
        __antixsrftoken: values.auth.antixsrftoken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://siga.congregacao.org.br',
        Referer: 'https://siga.congregacao.org.br/SIS/SIS99908.aspx?f_inicio=S',
      },
      retry: { limit: 10 },
      timeout: 60000,
    }));
  } catch (error) {
    console.error('Erro ao alterar empresa:', error);
    throw new Error(`Erro ao alterar empresa: ${error.message}`);
  }

  return {
    status: true,
    igreja: values.igreja,
    message: 'Empresa alterada com sucesso.',
  };
}

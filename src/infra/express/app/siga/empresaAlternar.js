import ky from 'ky';
import * as cheerio from 'cheerio';

export async function empresaAlterar(values) {
  try {
    // Buscar HTML da página
    const $ = cheerio.load(values.auth.page);
    const usuario = String($('input[id^="f_usuario_"]').val());

    // Buscar competências
    const competencias = await ky
      .post(
        'https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias',
        {
          retry: 5,
          json: { codigoEmpresa: String(values.igreja.UNIDADE_COD) },
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            Cookie: values.auth.cookies,
            __antixsrftoken: values.auth.antixsrftoken,
          },
        }
      )
      .json();

    const competencia = competencias?.d[0]?.Codigo;

    // Enviar alteração de empresa
    const formData = new URLSearchParams();
    formData.append('gravar', 'S');
    formData.append('f_usuario', usuario);
    formData.append('f_empresa', String(values.igreja.UNIDADE_COD));
    formData.append('f_estabelecimento', values.igreja.IGREJA_COD);
    formData.append('f_competencia', competencia);
    formData.append('__jqSubmit__', 'S');

    await ky.post('https://siga.congregacao.org.br/SIS/SIS99906.aspx', {
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: values.auth.cookies,
        __antixsrftoken: values.auth.antixsrftoken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://siga.congregacao.org.br',
        Referer: 'https://siga.congregacao.org.br/SIS/SIS99908.aspx?f_inicio=S',
      },
    });
  } catch (error) {
    console.error('Erro ao alterar empresa:', error);
    return {
      status: false,
      data: {},
      message: `Erro ao alterar empresa: ${error.message}`,
    };
  }

  return {
    status: true,
    igreja: values.igreja,
    message: 'Empresa alterada com sucesso.',
  };
}

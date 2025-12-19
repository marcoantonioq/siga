import ky from 'ky';
import { Igreja } from '../../../../core/Igreja.js';

export async function igrejas({ empresas = [], auth = null }) {
  let igrejas = [];

  const empresasAtivas = empresas.filter((e) => e.active);

  if (empresasAtivas.length === 0) return [];

  try {
    const results = await Promise.allSettled(
      empresasAtivas.map(async (e) => {
        try {
          const response = await ky
            .post(
              'https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso',
              {
                retry: 5,
                json: { codigoEmpresa: `${e.id}` },
                headers: {
                  'Content-Type': 'application/json; charset=UTF-8',
                  Accept: 'application/json, text/javascript, */*; q=0.01',
                  Cookie: auth.cookies,
                  __antixsrftoken: auth.antixsrftoken,
                },
              }
            )
            .json();

          // Garante que response.d existe e é um array
          if (!response.d || !Array.isArray(response.d)) return [];

          const igrejas =  response.d.map((i) =>
            Igreja.create({
              IGREJA_COD: i['Codigo'],
              IGREJA: i['Nome'],
              IGREJA_DESC: i['NomeExibicao'],
              IGREJA_TIPO: i['CodigoTipoEstabelecimento'],
              IGREJA_ADM: e.description,
              REGIONAL: e.regional,
              UNIDADE_COD: i['CodigoEmpresa'],
              MEMBROS: 0,
            })
          );

          console.log("Igrejas carregadas: ", igrejas);
          return igrejas
        } catch (error) {
          console.log('Erro:: ', error);
          return [];
        }
      })
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  } catch (error) {
    console.error('Erro ao consultar igrejas:', error);
    throw new Error('Erro ao consultar igrejas');
  }

  return igrejas;
}

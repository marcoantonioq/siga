import ky from 'ky';

import { Evento } from '../../../../core/Evento.js';

export async function carregarEventosSecretaria(values) {
  const { auth, igreja, date1, date2 } = values;
  console.log('Solicitação carregarEvento:', igreja, date1, date2);
  const eventos = [];
  try {
    const response = await ky.post(
      'https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW',
      {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          Cookie: auth.cookies,
          __antixsrftoken: auth.antixsrftoken,
        },
        json: {
          codigoTipoEvento: null,
          codigoEmpresa: String(igreja.UNIDADE_COD),
          codigoEstabelecimento: null,
          data1: date1.split('-').reverse().join('/'),
          data2: date2.split('-').reverse().join('/'),
          listaStatus: '4,3',
          config: {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 100,
            sSearch: '',
            iSortCol: 0,
            sSortDir: 'asc',
          },
        },
      }
    );
    const code = response.status;
    const data = await response.text();
    const result = JSON.parse(data);
    if (result?.d?.aaData && code == 200) {
      result.d.aaData
        .map(([DATA, SEMANA, HORA, GRUPO, IGREJA, , STATUS, ID]) => {
          return Evento.create({
            EVENTO: 'Secretaria',
            GRUPO,
            DATA: new Date(
              `${DATA.split('/').reverse().join('-')} ${HORA.split(
                '-'
              )[0].trim()}`
            ),
            IGREJA,
            OBSERVACOES: `${SEMANA}: ${HORA}`,
            STATUS: STATUS.replace(/<\/?[^>]+>/gi, ''),
            ID,
            IGREJA_DESC: IGREJA,
          });
        })
        .forEach((e) => eventos.push(e));
    }
  } catch (erro) {
    console.warn('Erro ao obter Eventos: ', erro);
  }
  return eventos;
}

import ky from 'ky';

import { Evento } from '../../../../core/Evento.js';

export async function carregarEventosSecretaria(values) {
  const { auth, igreja, date1, date2 } = values;
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
          codigoEmpresa: igreja.UNIDADE_COD,
          codigoEstabelecimento: null,
          data1: date1.split('-').reverse().join('/'),
          data2: date2.split('-').reverse().join('/'),
          listaStatus: '3,4',
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
    const data = await response.json();

    if (data?.d?.aaData && code == 200) {
      data.d.aaData
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

// carregarEventosSecretaria({
//   auth: {
//     cookies:
//       '',
//     antixsrftoken: '',
//   },
//   igreja: { UNIDADE_COD: '126' },
//   date1: '2025-04-01',
//   date2: '2025-06-01',
// })
//   .then((eventos) => {
//     console.log('Eventos carregados:', eventos);
//   })
//   .catch((error) => {
//     console.error('Erro ao carregar eventos:', error);
//   });

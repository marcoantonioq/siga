import ky from 'ky';
import { executeKyRequest } from '../../../http/executeKyRequest.js';

const url = 'https://siga.congregacao.org.br/RH/RH00201.asmx/SelecionarAnonimizado';

const headers = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Referer': 'https://siga.congregacao.org.br/RH/RH00201.aspx?f_inicio=S',
  '__antixsrftoken': '76a4356e18d447eba7643872055fb4ff',
  'Cookie': 'ASP.NET_SessionId=x2leaoqe0ztci5patccfdes0; __AntiXsrfToken=76a4356e18d447eba7643872055fb4ff; sigaTrustedDevice=94129; ai_user=0MOOarSXk2RsO9jqjqVAYX|2025-06-18T21:50:00.064Z; remember=true; user=nayara.queiroz; ai_session=9/3hto2852/9ONSjeR6Gxo|1750765217431|1750765217431; _ga=GA1.3.2094685653.1750204142; sigaTrustedDevice=94129; ai_user=MhjCrhXAN6eHPIAqlaYq9L|2025-06-17T23:50:01.729Z; _gid=GA1.3.1111693259.1750692213; ai_session=GhVU8yP64XaoLdU6CGZeQh|1750765352025|1750765859266'
};

const jsonBody = {
  codigoCasaOracaoComum: null,
  codigoEstabelecimento: null,
  listaLivro: '',
  status: true,
  data1: '',
  data2: '',
  listaFuncaoExercida: '',
  trabalhoEmAltura: null,
  config: {
    sEcho: 1,
    iDisplayStart: 0,
    iDisplayLength: 10,
    sSearch: '',
    iSortCol: 1,
    sSortDir: 'asc'
  }
};

(async () => {
  try {
    const response = await executeKyRequest(() => ky.post(url, {
      headers,
      json: jsonBody,
      timeout: 600000
    }));

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
})();

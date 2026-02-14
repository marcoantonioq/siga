import { empresas } from '../infra/express/app/siga/empresas.js';
import { getColetas } from '../infra/express/app/siga/fluxos.js';
import { igrejas } from '../infra/express/app/siga/igrejas.js';
import { login } from '../infra/express/app/siga/login.js';

const auth = {
  cookies: '',
  antixsrftoken: '',
};

const test = async () => {
  const result = await login(auth.cookies);
  const resultEmpresas = await empresas(result.data);
  const igrejasData = await igrejas({ auth, empresas: resultEmpresas });

  

    const coletas = await getColetas(
      {
        cookies: auth.cookies,
        antixsrftoken: auth.antixsrftoken,
        token: result.data.token,
      },
      { IGREJA_COD: '345' },
      '2025-12-01',
      '2025-12-31'
    );
    console.log("Dados coletados:", coletas.length, coletas[0]);
};
test();

import { HTTPClient }  from "../infra/http/index.js";
import { EventosRepo }  from "../repo/EventosRepo.js";

async function start() {
    const client = new HTTPClient({
    cookie: 'ASP.NET_SessionId=nyjayser03veobs4fmdxul3k; lang=pt-BR; __AntiXsrfToken=739d20a734004756a6e6ac0439bfbfb5; ai_user=A1GUm8io/8dEc33cX7FXf9|2025-07-28T11:34:21.017Z; sigaTrustedDevice=26559; ai_session=KljJ3GVaCXQpXtUzvOHGgi|1755515443954|1755522733636',
  });

  const app = {
    eventos: new EventosRepo([], client),
  };

  app.eventos.getEventosSecretaria("2025-07-01", null, 126).then((eventos) => {
    console.log('Eventos encontrados:', eventos.length);
  }).catch((error) => {
    console.error('Erro ao buscar eventos:', error);
  });
}

start();

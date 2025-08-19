import { HTTPClient }  from "../infra/http/index.js";
import { EventosRepo }  from "../repo/EventosRepo.js";

async function start() {
    const client = new HTTPClient({
    cookie: 'ASP.NET_SessionId=emffrpqwjw0j5ywm4bdg13x2; __AntiXsrfToken=3fc960ad6df6491591783841345ec04e; sigaTrustedDevice=94129; ai_user=GkECQJ26JJtLJ3XlT/EI0g|2025-08-09T18:04:24.254Z; user=nayara.queiroz; remember=true; ai_session=cAExM7lbLMOoUK3fYYZ9Hx|1755604907361|1755604907361',
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

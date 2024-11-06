import { HTTPClient } from "./infra/http/index.js";
import { EventosRepo } from "./repo/EventosRepo.js";
import { FluxosRepo } from "./repo/FluxosRepo.js";
import { IgrejasRepo } from "./repo/IgrejasRepo.js";

const client = new HTTPClient({
  cookie:
    "ApplicationGatewayAffinityCORS=15c6cdc3c6fb5853e4e82094c05f447b; ApplicationGatewayAffinity=15c6cdc3c6fb5853e4e82094c05f447b; ASP.NET_SessionId=2cs1v4ywakctrs5mpwz4dlhu; remember=true; __AntiXsrfToken=99b2093cf5e94287a1b46c18f016e07a; ai_user=1KHpHCtFyN+lNzQnstGQK3|2024-08-08T23:41:27.031Z; sigaTrustedDevice=94129; user=marco.queiroz; ai_session=jmEparfF4klGvlHsZmxKsa|1730843672548|1730855639312",
});

const app = {
  fluxos: new FluxosRepo([], client),
  igrejas: new IgrejasRepo([], client),
  eventos: new EventosRepo([], client),
};

async function teste() {
  const igrejas = [];
  const fluxos = [];
  const eventos = [];

  // await app.igrejas.getRegionais().map(e => igreja.push(e));
  (await app.igrejas.getIgrejas()).map((e) => igrejas.push(e));
  // console.log("Igrejas: ", igrejas.length);

  (await app.fluxos.getDespesas("2024-08-01", "2024-08-31", 345)).map((e) =>
    fluxos.push(e)
  );

  // (await app.fluxos.getDepositos("2024-06-01", "2024-07-01", 345)).map((e) =>
  //   fluxos.push(e)
  // );
  // (
  //   await app.fluxos.getColetas(
  //     "2024-07-01",
  //     "2024-09-01",
  //     "345, 21329, 30670, 3836, 36426, 3837, 3960, 3782, 3982, 3838, 4376, 22888, 4090, 3824, 4373, 4252, 4466, 25197, 26389, 4164, 3983"
  //   )
  // ).map((e) => fluxos.push(e));

  // console.log("Fluxos: ", fluxos.length);

  // (await app.eventos.getEventosSecretaria("2024-09-01", "2024-09-30", 135)).map(
  //   (e) => eventos.push(e)
  // );

  // console.log("Eventos: ", eventos.length);
}

teste();

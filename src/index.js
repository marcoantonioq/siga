import { HTTPClient } from './infra/http/index.js'
import { EventosRepo } from './repo/EventosRepo.js'
import { FluxosRepo } from './repo/FluxosRepo.js'
import { IgrejasRepo } from './repo/IgrejasRepo.js'

const client = new HTTPClient({
  cookie:
    'ApplicationGatewayAffinityCORS=4dd1d364ce909cf37f548230aedaf0d0; ApplicationGatewayAffinity=4dd1d364ce909cf37f548230aedaf0d0; ASP.NET_SessionId=jv5inczr5vtymeolyjrlqjpp; __AntiXsrfToken=b500c485e5e34b2da6b2fb06a952a640; ai_user=joNUicwtJK1pgjZBZMKQnk|2024-08-05T22:27:35.773Z; remember=true; user=marco.queiroz; sigaTrustedDevice=94129; ai_session=ykRxiWHQAuSvM+i/Ou7gEY|1730902531871|1730905512188',
})

const app = {
  fluxos: new FluxosRepo([], client),
  igrejas: new IgrejasRepo([], client),
  eventos: new EventosRepo([], client),
}

async function teste() {
  const igrejas = []
  const fluxos = []
  const eventos = []

  ;(await app.igrejas.getIgrejas()).map((e) => igrejas.push(e))

  const filterRegex = new RegExp('Itaberaí', 'i')
  const adms = igrejas.filter(
    (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
  )
  for (const adm of adms) {
    console.log('ADM: ', adm)
    await app.igrejas.alterarIgreja(adm.UNIDADE_COD, adm.IGREJA_COD)
  }

  // ;(await app.fluxos.getDespesas('2024-08-01', '2024-08-31', 345)).map((e) =>
  //   fluxos.push(e)
  // )

  // ;(await app.fluxos.getDespesas('2024-08-01', '2024-08-31', 345)).map((e) =>
  //   fluxos.push(e)
  // )
  // ;(await app.fluxos.getDepositos('2024-06-01', '2024-07-01', 345)).map((e) =>
  //   fluxos.push(e)
  // )
  // ;(await app.fluxos.getColetas('2024-07-01', '2024-09-01')).map((e) =>
  //   fluxos.push(e)
  // )
  // ;(
  //   await app.eventos.getEventosSecretaria('2024-09-01', '2024-12-30', 135)
  // ).map((e) => eventos.push(e))
}

teste()

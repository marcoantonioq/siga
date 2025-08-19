import { getOfertas, } from "../infra/express/app/siga/fluxos.js";

async function start() {
  const values = await getOfertas({
    cookies: "",
    antixsrftoken: ""
  }, {
    IGREJA_COD: 345,
  }, "2025-07-01", "2025-08-18");
  console.log("Valores:", values);

}

start();

import { preventiva } from "../infra/express/app/siga/preventiva.js";
import { token } from "../infra/express/app/siga/token.js";

async function start() {
  const values = await token({
    cookies: ""
  });
}

start();

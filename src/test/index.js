import { carregarDados } from "../infra/express/app/siga/carregarDados.js";

async function start() {
  const token = ""
  const values = await carregarDados({
    auth: {
      token
    },
  });
  console.log("Valores ministério:", values.filter(e => e.grupo === "Ministério").length);
  console.log("Valores administração:", values.filter(e => e.grupo === "Administrador").length);
}

start();

import { betweenDates } from "../util/betweenDates.js";
import { agenda } from "./Eventos.js";
import { coletas } from "./Fluxos/coleta.js";
import { depositos } from "./Fluxos/depositos.js";
import { despesas } from "./Fluxos/despesas.js";
import Fluxo from "./Fluxos/Fluxo.js";
import { alterarIgreja, getEmpresas, getIgrejas } from "./Igrejas.js";

export const searchSiga = async (msg) => {
  try {
    msg.settings.betweenDates = betweenDates(
      msg.settings.date1,
      msg.settings.date2
    );

    await getEmpresas(msg);
    await getIgrejas(msg);

    const filterRegex = new RegExp(msg.settings.filter, "i");
    const adms = msg.tables.igrejas.filter(
      (e) => e.IGREJA_TIPO === 3 && filterRegex.test(e.IGREJA_DESC)
    );

    for (const adm of adms) {
      try {
        console.log("Acessando adm ", adm.IGREJA_DESC);
        await alterarIgreja(msg, adm);
        await depositos(msg, adm);
        await coletas(msg, adm);
        await despesas(msg, adm);
        await agenda(msg, adm);
      } catch (error) {
        console.log("Erro ao processar adm: ", adm, error);
      }
    }

    msg.tables.fluxos = msg.tables.fluxos.map((e) => {
      const igreja = msg.tables.igrejas.find(
        (ig) => ig?.IGREJA_DESC === e.IGREJA_DESC
      );
      return Fluxo.create({
        ...e,
        REGIONAL: igreja?.REGIONAL,
        IGREJA_ADM: igreja?.IGREJA_DESC,
        IGREJA_COD: igreja?.IGREJA_COD,
        IGREJA_TIPO: igreja?.IGREJA_TIPO,
      });
    });

    // save("msg.json", JSON.stringify(msg, null, 2));
    return msg;
  } catch (error) {
    throw new Error("Erro ao processo SIGA: " + error.message);
  }
};

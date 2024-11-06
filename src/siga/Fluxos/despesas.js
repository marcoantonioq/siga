import PuppeteerManager from "../PuppeteerManager.js";
import Fluxo from "./Fluxo.js";

export const despesas = async (msg = {}) => {
  try {
    for (const { start, end, ref } of msg.settings.betweenDates) {
      const page = await PuppeteerManager.createPage({
        cookies: msg.settings.cookies,
        domain: "siga.congregacao.org.br",
      });
      console.log("Despensa: ", start, end, ref);
      await page.goto("https://siga.congregacao.org.br/TES/TES00901.aspx", {
        waitUntil: "networkidle0",
      });
      const onValues = PuppeteerManager.listenerDownload({ page });

      try {
        await Promise.all([
          page.evaluate(
            (start, end) => {
              document.querySelector("#f_data1").value = start
                .split("-")
                .reverse()
                .join("/");
              document.querySelector("#f_data2").value = end
                .split("-")
                .reverse()
                .join("/");
            },
            start,
            end
          ),
          page.select("#f_saidapara", "Excel"),
          page.select("#f_agrupar", "CentrodeCustoSetor"),
          page.click('form[action="TES00902.aspx"] button[type="submit"]'),
        ]);

        const values = await onValues;
        if (!values) return;
        let Localidade = "",
          Ref = "";
        values.forEach((row) => {
          try {
            if (Array.isArray(row) && row.length) {
              if (/^Mês \d\d\/\d+/.test(`${row[0]}`)) {
                const [, mm, yyyy] = row[0].match(/(\d{2})\/(\d{4})/);
                Ref = `${mm}/${yyyy}`;
              } else if (
                /^(BR \d+-\d+|^ADM|^PIA|^SET)/.test(`${row[0]}`) ||
                row.length === 1
              ) {
                Localidade = row[0];
              } else if (/^\d+$/.test(`${row[0]}`)) {
                msg.tables.fluxos.push(
                  Fluxo.create({
                    FLUXO: "Saída",
                    IGREJA: Localidade,
                    IGREJA_DESC: Localidade,
                    CATEGORIA: row[6],
                    DATA: new Date(
                      new Date(1899, 11, 30).getTime() + row[0] * 86400000
                    ),
                    VALOR: row[30] || 0,
                    OBSERVACOES: `${row[8]}, NF: ${row[4]}; ${row[3]}; Valor: ${row[15]}; Multa: ${row[21]}; Juros: ${row[24]}; Desconto: ${row[27]}`,
                    REF: ref,
                    ORIGEM: "SIGA",
                  })
                );
              }
            }
          } catch (error) {
            console.warn("Falha ao procurar em linhas de despesas: ", error);
          }
        });
      } catch (error) {
        console.error("Erro ao navegar por despesas: ", error);
      } finally {
        page.close();
      }
    }
  } catch (error) {
    console.log("Erro ao processar despesas: ", error);
  }
};

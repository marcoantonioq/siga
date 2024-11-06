import PuppeteerManager from "../PuppeteerManager.js";
import Fluxo from "./Fluxo.js";

export const coletas = async (msg = {}, adm) => {
  try {
    for (const { start, end, ref } of msg.settings.betweenDates) {
      const page = await PuppeteerManager.createPage({
        cookies: msg.settings.cookies,
        domain: "siga.congregacao.org.br",
      });

      await page.goto("https://siga.congregacao.org.br/TES/TES00501.aspx", {
        waitUntil: "networkidle0",
      });
      console.log("Coletas: ", start, end, ref);

      try {
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
            page.select("#f_detalhar", "true"),
            page.select("#f_saidapara_original", "Excel"),
          ]);

          await page.waitForSelector(
            'form[action="TES00501.aspx"] button[type="submit"]',
            { visible: true }
          );
          await page.click(
            'form[action="TES00501.aspx"] button[type="submit"]'
          );

          const values = await onValues;
          if (!values) return;
          var nomeIgreja = "",
            headers = "",
            tipo = "";

          for (var i = 0; i < values.length; i++) {
            if (/^Total/.test(values[i][0])) {
              nomeIgreja = "";
              continue;
            } else if (/^Todos/.test(values[i][0])) {
              break;
            } else if (/^Casa de Oração/.test(`${values[i][0]}`)) {
              headers = values[i];
            } else if (/^(SET|BR|ADM)/.test(values[i][0])) {
              nomeIgreja = values[i][0];
            }

            if (/^Tipo/.test(values[i][6])) {
              continue;
            } else if (/[a-z]/i.test(values[i][6])) {
              tipo = values[i][6];

              for (let x = 7; x < headers.length; x++) {
                if (headers[x] === "Total") break;
                if (!headers[x] || !/^[1-9]/.test(values[i][x])) continue;

                msg.tables.fluxos.push(
                  Fluxo.create({
                    FLUXO: "Coleta",
                    IGREJA: nomeIgreja,
                    IGREJA_DESC: nomeIgreja,
                    CATEGORIA: tipo,
                    DATA: end,
                    VALOR: values[i][x],
                    OBSERVACOES: headers[x],
                    REF: ref,
                    ORIGEM: "SIGA",
                  })
                );
              }
            }
          }
        } catch (error) {
          console.error("Erro ao navegar por coletas: ", error);
        }
      } catch (error) {
        console.warn("Erro ao processar arquivo de coleta: ", error);
      } finally {
        page.close();
      }
    }
  } catch (error) {
    console.log("Erro ao processar coletas: ", error);
  }
};

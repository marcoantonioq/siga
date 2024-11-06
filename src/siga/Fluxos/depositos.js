import { excelDateToJSDate } from "../../util/sheet.js";
import PuppeteerManager from "../PuppeteerManager.js";
import Fluxo from "./Fluxo.js";

export const depositos = async (msg = {}, adm) => {
  try {
    const pageComp = await PuppeteerManager.createPage({
      cookies: msg.settings.cookies,
      domain: "siga.congregacao.org.br",
    });
    await pageComp.goto("https://siga.congregacao.org.br/TES/TES00701.aspx", {
      waitUntil: "networkidle0",
    });
    const competencias = await pageComp.evaluate(() => {
      return [...document.querySelector('select[id="f_competencia"]')]
        .map((option) => ({
          label: option.innerText,
          value: option.value,
        }))
        .filter((e) => e.value);
    });
    pageComp.close();

    for (const { ref } of msg.settings.betweenDates) {
      console.log("Depositos: ", ref);
      const page = await PuppeteerManager.createPage({
        cookies: msg.settings.cookies,
        domain: "siga.congregacao.org.br",
      });
      try {
        const competencia = competencias.find((e) => ref === e.label);
        await page.goto("https://siga.congregacao.org.br/TES/TES00701.aspx", {
          waitUntil: "networkidle0",
        });
        if (competencia) {
          await Promise.all([
            page.select('select[id="f_competencia"]', competencia.value),
            page.select("#f_saidapara", "Excel"),
          ]);

          await page.click(
            'form[action="TES00702.aspx"] button[type="submit"]'
          );

          const requestBody = new URLSearchParams({
            f_competencia: competencia.value,
            f_data1: "",
            f_data2: "",
            f_estabelecimento: adm.IGREJA_COD,
            f_saidapara: "Excel",
            f_ordenacao: "alfabetica",
            __initPage__: "S",
          }).toString();

          await page.addScriptTag({
            url: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
          });

          const values = await page.evaluate(
            async (body, msg) => {
              const res = await fetch(
                "https://siga.congregacao.org.br/TES/TES00702.aspx",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: msg.settings.cookies,
                  },
                  body,
                }
              );
              const buffer = await res.arrayBuffer();
              const workbook = XLSX.read(new Uint8Array(buffer), {
                type: "array",
              });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

              return data;
            },
            requestBody,
            msg
          );

          if (!values) return;
          var igrejaNome = "";

          for (var i = 0; i < values.length; i++) {
            try {
              if (/^(SET|ADM|BR|PIA)/.test(`${values[i][0]}`)) {
                igrejaNome = values[i][0];
              } else if (/^\d\d\/\d{4}/.test(values[i][2])) {
                msg.tables.fluxos.push(
                  Fluxo.create({
                    FLUXO: "Deposito",
                    IGREJA: igrejaNome,
                    IGREJA_DESC: igrejaNome,
                    DATA: new Date(excelDateToJSDate(values[i][3])),
                    VALOR: values[i][18],
                    OBSERVACOES:
                      "Conta: " +
                      values[i][7] +
                      "; Documento: " +
                      values[i][16],
                    REF: ref,
                    ORIGEM: "SIGA",
                  })
                );
              }
            } catch (error) {
              console.log("Erro ao processar despesa: ", error);
            }
          }
        }
      } catch (error) {
        console.log("Erro ao coletar deposito: ", error);
      } finally {
        page.close();
      }
    }
  } catch (error) {
    console.error("Erro ao navegar por depositos: ", error);
  }
};

import PuppeteerManager from "./PuppeteerManager.js";
import { sleep } from "../util/sleep.js";

export class Igreja {
  constructor(options = {}) {
    Object.assign(this, {
      IGREJA: "",
      IGREJA_COD: 0,
      IGREJA_DESC: "",
      IGREJA_TIPO: 0,
      IGREJA_ADM: "",
      REGIONAL: "",
      CATEGORIA: "",
      UNIDADE_COD: 0,
      MEMBROS: 0,
      CREATED: new Date(),
      UPDATED: new Date(),
      ...options,
    });
  }

  static create(options) {
    return new Igreja(options);
  }
}

export const getEmpresas = async (msg = {}) => {
  const page = await PuppeteerManager.createPage({
    cookies: msg.settings.cookies,
    domain: "siga.congregacao.org.br",
  });

  try {
    await page.goto("https://siga.congregacao.org.br/SIS/SIS99908.aspx", {
      waitUntil: "networkidle0",
    });

    if (
      await page.evaluate(() =>
        document
          .querySelector(".col-md-10")
          ?.innerText.includes("temporariamente em manutenção.")
      )
    )
      throw new Error("O sistema está em manutenção.");

    msg.username = await page.evaluate(() =>
      document.getElementById("f_autoid_001")?.value?.trim()
    );
    if (!msg.username) throw new Error(`Usuário não identificado.`);

    await page.evaluate(() =>
      [...document.querySelectorAll("a.showModal")]
        .find((el) => el.textContent.includes("Mudar Local"))
        ?.click()
    );

    await page.waitForSelector(
      'form[action="../SIS/SIS99906.aspx"] select[name="f_empresa"]',
      { timeout: 5000 }
    );

    const options = await page.evaluate(() =>
      [...document.querySelectorAll("optgroup")].flatMap((optgroup) =>
        [...optgroup.querySelectorAll("option")].map((option) => ({
          id: option.closest("select").id.replace(/f_([a-z]+)_?.*/gi, "$1"),
          cod: option.value,
          text: option.textContent.trim(),
          regional: optgroup.label,
        }))
      )
    );

    const empresas = options
      .filter((e) => e.id === "empresa" && e.cod)
      .map((e) =>
        Igreja.create({
          IGREJA: e.text,
          IGREJA_COD: 0,
          IGREJA_DESC: e.text,
          IGREJA_TIPO: 3,
          IGREJA_ADM: e.text,
          REGIONAL: e.regional,
          UNIDADE_COD: e.cod,
        })
      );
    msg.tables.empresas = empresas;
    return empresas;
  } catch (error) {
    throw new Error(error.message);
  } finally {
    await page.close();
  }
};

export const getCompetencias = async (codigoEmpresa, antixsrftoken, Cookie) => {
  const { d: competencias } = await (
    await fetch(
      "https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json",
          __antixsrftoken: antixsrftoken,
          Cookie,
        },
        body: JSON.stringify({ codigoEmpresa }),
      }
    )
  ).json();
  const COMPETENCIA = competencias.find((e) => e.Ativo).Codigo;
  console.log("Competencias: ", COMPETENCIA);
};

export const getIgrejas = async (msg = {}) => {
  try {
    const antiXsrfToken =
      msg.settings.cookies.match(/__AntiXsrfToken=([^;]+)/i)?.[1] || "";
    const cookie = msg.settings.cookies;

    const results = await Promise.all(
      msg.tables.empresas.map(async (empresa) => {
        try {
          const { d: dadosIgrejas } = await (
            await fetch(
              "https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  Accept: "application/json",
                  __antixsrftoken: antiXsrfToken,
                  Cookie: cookie,
                },
                body: JSON.stringify({ codigoEmpresa: empresa.UNIDADE_COD }),
              }
            )
          ).json();

          return dadosIgrejas.map((e) => ({
            IGREJA: e.Nome,
            IGREJA_COD: e.Codigo,
            IGREJA_DESC: e.NomeExibicao,
            IGREJA_TIPO: e.CodigoTipoEstabelecimento,
            IGREJA_ADM: empresa.IGREJA_ADM,
            REGIONAL: empresa.REGIONAL,
            UNIDADE_COD: e.CodigoEmpresa,
          }));
        } catch (error) {
          console.error("Erro ao SelecionarParaAcesso", error);
        }
      })
    );

    const igrejas = results.flatMap((e) => e).map((e) => Igreja.create(e));
    msg.tables.igrejas = igrejas;
    return igrejas;
  } catch (error) {
    console.log("Erro ao obter igrejas: ", error);
  }
  return [];
};

export const alterarIgreja = async (msg = {}, adm) => {
  const page = await PuppeteerManager.createPage({
    cookies: msg.settings.cookies,
    domain: "siga.congregacao.org.br",
  });

  try {
    await page.goto("https://siga.congregacao.org.br/SIS/SIS99908.aspx", {
      waitUntil: "networkidle0",
    });

    await page.evaluate(() =>
      [...document.querySelectorAll("a.showModal")]
        .find((el) => el.textContent.includes("Mudar Local"))
        ?.click()
    );

    await page.waitForSelector(
      'form[action="../SIS/SIS99906.aspx"] select[name="f_empresa"]',
      { timeout: 5000 }
    );

    const pressTab = async (count, delay = 20) => {
      for (let i = 0; i < count; i++) {
        await page.keyboard.press("Tab", { delay });
      }
    };

    await sleep(1000);
    await pressTab(3);
    await page.keyboard.type(adm.IGREJA_ADM, { delay: 10 });
    await page.keyboard.press("Enter", { delay: 50 });
    await sleep(500);
    await pressTab(1);
    await sleep(500);
    await page.keyboard.type(adm.IGREJA_DESC, { delay: 10 });
    await page.keyboard.press("Enter", { delay: 50 });
    await page.click(
      'form[action="../SIS/SIS99906.aspx"] button[type="submit"]'
    );
    return true;
  } catch (error) {
    console.error("Erro durante a execução: " + error);
    throw error;
  } finally {
    await page.close();
  }
};

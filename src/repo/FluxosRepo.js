import { Fluxo } from "../core/Fluxo.js";
import { HTTPClient } from "../infra/http/index.js";
import { sheet } from "../infra/sheet/index.js";
import { betweenDates } from "../util/date.js";
import { sleep } from "../util/sleep.js";

const requests = {
  despesas: {
    url: "https://siga.congregacao.org.br/TES/TES00902.aspx",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: {
      f_data1: "",
      f_data2: "",
      f_estabelecimento: "",
      f_centrocusto: "",
      f_fornecedor: "",
      f_formato: "TES00902.aspx",
      f_saidapara: "Excel",
      f_agrupar: "CentrodeCustoSetor",
      __initPage__: "S",
    },
  },
  coletas: {
    method: "post",
    url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
    data: {
      f_consultar: "S",
      f_data1: "",
      f_data2: "",
      f_estabelecimento: "",
      f_filtro_relatorio: "",
      f_formacontribuicao: "0",
      f_opcao2: "casaoracao",
      f_detalhar: "true",
      f_exibir: "comvalor",
      f_agrupar: "",
      f_detalhar: "true",
      f_saidapara: "Excel",
      f_ordenacao: "alfabetica",
      __initPage__: "S",
      __jqSubmit__: "S",
    },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  },
};

/**
 * Classe para gerenciar um repositório de objetos Fluxo.
 */
export class FluxosRepo {
  #client;
  /**
   * Construtor da classe FluxoRepo.
   * @param {Fluxo[]} [fluxos=[]] - Um array opcional de objetos Fluxo
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(fluxos = [], client) {
    this.fluxos = fluxos;
    this.#client = client;
  }

  /**
   * Obtém as despesas em um intervalo de datas específico para um estabelecimento.
   *
   * @async
   * @param {string} startDate - A data de início no formato 'YYYY-MM-DD'.
   * @param {string} endDate - A data de término no formato 'YYYY-MM-DD'.
   * @param {string} estabelecimento - O identificador ou nome do estabelecimento para o qual as despesas serão obtidas.
   *
   * @returns {Promise<Fluxo[]>} Uma Promise que resolve para um array de objetos `FluxoData`, representando as despesas obtidas.
   */
  async getDespesas(startDate, endDate, estabelecimento) {
    const despesas = [];
    try {
      const data = requests.despesas.data;
      data.f_data1 = startDate.split("-").reverse().join("/");
      data.f_data2 = endDate.split("-").reverse().join("/");
      data.f_estabelecimento = estabelecimento;
      const result = await this.#client.fetch(requests.despesas);
      const values = await sheet.blobBytesToArray(result.data);
      let Localidade = "",
        Ref = "";

      console.log("Resultados:::: ", values);

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
              despesas.push(
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
                  REF: Ref,
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
      console.error(
        "!!!! Erro ao coletar despesa: Permissão de acesso!",
        error
      );
    }
    return despesas;
  }

  async getColetas(startDate, endDate, filtro_relatorio) {
    const fluxos = [];
    for (const { start, end, ref } of betweenDates(startDate, endDate)) {
      var result = [];
      try {
        await this.#client.fetch({
          method: "get",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S",
        });

        await this.#client.validaPeriodo(start, end);

        result = await this.#client.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
          data: {
            f_consultar: "S",
            f_data1: start.split("-").reverse().join("/"),
            f_data2: end.split("-").reverse().join("/"),
            f_estabelecimento: "",
            f_filtro_relatorio: filtro_relatorio,
            f_formacontribuicao: "0",
            f_opcao2: "casaoracao",
            f_detalhar: "true",
            f_exibir: "comvalor",
            f_agrupar: "",
            f_detalhar: "true",
            f_saidapara: "Excel",
            f_ordenacao: "alfabetica",
            __initPage__: "S",
            __jqSubmit__: "S",
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        result = await this.#client.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
          data: {
            f_consultar: "S",
            f_data1: start.split("-").reverse().join("/"),
            f_data2: end.split("-").reverse().join("/"),
            f_estabelecimento: "",
            f_filtro_relatorio: filtro_relatorio,
            f_formacontribuicao: "0",
            f_opcao2: "casaoracao",
            f_exibir: "comvalor",
            f_detalhar: "true",
            f_saidapara: "Excel",
            f_ordenacao: "alfabetica",
            __initPage__: "S",
            __jqSubmit__: "S",
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        await sleep(3000);

        result = await this.#client.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00507.aspx",
          data: "f_saidapara=Excel&__initPage__=S",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!result.blobBytes) {
          console.error("Falha ao gerar o relatório!");
          continue;
        }

        const values = await sheet.blobBytesToArray(result.blobBytes);

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

              fluxos.push(
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
        console.error(
          "!!! Erro ao baixar fluxo de Mapa Coletas: Permissão de acesso!",
          error
        );
      }
    }
    return fluxos;
  }

  async getDepositos(startDate, endDate, estabelecimento) {
    const fluxos = [];
    try {
      const refs = betweenDates(startDate, endDate).map((e) => e.ref);

      var result = await this.#client.fetch({
        url: "https://siga.congregacao.org.br/TES/TES00701.aspx?f_inicio=S&__initPage__=S",
      });

      const selectMatch =
        /<select[^>]*id="f_competencia"[^>]*>([\s\S]*?)<\/select>/i.exec(
          result.data
        );
      var competencias = [];
      if (selectMatch) {
        const optionsHtml = selectMatch[1];
        const optionRegex = /<option[^>]*value="([^"]*)".*?>(.*?)<\/option>/gi;
        var match;
        while ((match = optionRegex.exec(optionsHtml)) !== null) {
          if (!match[2].includes("Todos") && refs.includes(match[2])) {
            competencias.push({
              value: match[1],
              description: match[2],
            });
          }
        }
      }
      for (const { value: competencia } of competencias) {
        try {
          try {
            result = await this.#client.fetch({
              url: "https://siga.congregacao.org.br/TES/TES00702.aspx",
              method: "post",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              data:
                "f_competencia=" +
                competencia +
                "&f_data1=&f_data2=&f_estabelecimento=" +
                estabelecimento +
                "&f_saidapara=Excel&f_ordenacao=alfabetica&__initPage__=S",
            });
          } catch (error) {
            console.warn("Erro baixar depositos: ", competencia);
            continue;
          }

          if (result.type.includes("text/html")) {
            console.error("Erro ao baixar deposito: ", competencia);
            continue;
          }

          const values = await sheet.blobBytesToArray(result.blobBytes);

          var igrejaNome = "";
          var ref = values[9][14];

          for (var i = 0; i < values.length; i++) {
            if (/^(SET|ADM|BR|PIA)/.test(`${values[i][0]}`)) {
              igrejaNome = values[i][0];
            } else if (/^\d\d\/\d{4}/.test(values[i][2])) {
              ref = values[i][2];
              fluxos.push(
                Fluxo.create({
                  FLUXO: "Deposito",
                  IGREJA: igrejaNome,
                  IGREJA_DESC: igrejaNome,
                  DATA: values[i][3],
                  VALOR: values[i][18],
                  OBSERVAÇÕES: values[i][7],
                  REF: ref,
                  ORIGEM: "SIGA",
                })
              );
            }
          }
        } catch (error) {
          console.warn("Erro ao processar deposito: ", competencia, error);
        }
      }
    } catch (erro) {
      console.warn("FluxoDepositos: ", erro);
    }
    return fluxos;
  }
}

const SIGA = {
  username: "",
  currentIgreja: null,
  cookie: "",
  loading: false,
  error: null,
  igrejas: [],
  fluxos: [],
  eventos: [],
  competencias: [],

  async fetch(options) {
    this.error = null;
    this.loading = true;
    try {
      if (!Array.isArray(options)) {
        options = [options];
      }

      const requests = options.map((option) => {
        const optionsDefault = {
          headers: {},
          muteHttpExceptions: true,
          ...option,
        };
        optionsDefault.headers.Cookie = this.cookie;
        optionsDefault.headers["__AntiXsrfToken"] = this.cookie.match(
          /__AntiXsrfToken=([^;]+)/
        )[1];
        return optionsDefault;
      });

      const responses = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .fetch(requests);
      });

      return responses.length === 1 ? responses[0] : responses;
    } catch (error) {
      console.error(`Erro ao realizar consulta fetch: ${error}`);
      this.error = error;
    } finally {
      this.loading = false;
    }
  },

  betweenDates(dataInicial, dataFinal) {
    const resultado = [];
    const start = new Date(dataInicial);
    const end = new Date(dataFinal);

    let yyyy = start.getUTCFullYear();
    let mm = start.getUTCMonth();

    let data = new Date(Date.UTC(yyyy, mm, 1));

    while (data <= end) {
      const primeiroDia = new Date(
        Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1)
      );
      const ultimoDia = new Date(
        Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)
      );
      resultado.push({
        start: primeiroDia.toISOString().split("T")[0],
        end: ultimoDia.toISOString().split("T")[0],
        ref: primeiroDia
          .toISOString()
          .replace(/(\d\d\d\d)-(\d\d)-\d\d.*/, "$2/$1"),
      });
      mm += 1;
      if (mm > 11) {
        mm = 0;
        yyyy += 1;
      }
      data = new Date(Date.UTC(yyyy, mm, 1));
    }
    return resultado;
  },

  async login(cookie = "") {
    if (cookie) {
      this.cookie = cookie;
    } else {
      throw new Error("Por favor, informe o cookie");
    }

    var { body } = await this.fetch({
      url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S",
    });

    if (
      body &&
      /(Lembrar meu email\/usuário|acesso ao SIGA para enviarmos um e-mail com uma senha provisória|..\/index.aspx)/gi.test(
        body
      )
    ) {
      throw new Error(
        "Você não está logado! Acesse o portal administrativo para enviar o cookie de autenticação..."
      );
    }

    var { body } = await this.fetch({
      url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx",
    });

    const usuarioMatch = body.match(
      /<input[^>]*name="f_usuario"[^>]*value="([^"]*)"/
    );

    if (!usuarioMatch) {
      throw new Error("Não foi possível encontrar o valor do usuário.");
    }
    this.username = usuarioMatch[1];

    console.info(`>>> ### Bem vindo(a) ${this.username}`);

    return body;
  },

  async obterIgrejas() {
    try {
      const empresas = [];
      const igrejas = [];
      const body = await loggedIn();
      const optgroupRegex = /<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g;
      let optgroupMatch;

      while ((optgroupMatch = optgroupRegex.exec(body)) !== null) {
        const label = optgroupMatch[1];
        const options = optgroupMatch[2];
        const optionRegex =
          /<option value="(\d+)"[^>]*>\s*([^<]+)\s*<\/option>/gs;
        let optionMatch;

        while ((optionMatch = optionRegex.exec(options)) !== null) {
          empresas.push({
            retional: label,
            type: "EMPRESA",
            id: Number(optionMatch[1]),
            description: optionMatch[2].trim(),
          });
        }
      }

      (
        await this.fetch(
          empresas.map((e) => ({
            url: "https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso",
            method: "post",
            payload: `{ "codigoEmpresa": ${e.id} }`,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
            },
          }))
        )
      ).map(({ body }) => {
        JSON.parse(body).d.map((e) => {
          const emp = empresas.find((emp) => emp.id === e["CodigoEmpresa"]);
          igrejas.push({
            cod: e["Codigo"],
            adm: emp.description,
            codUnidade: e["CodigoEmpresa"],
            reg: emp.retional,
            type: e["CodigoTipoEstabelecimento"],
            nome: e["Nome"],
            desc: e["NomeExibicao"],
            membros: 0,
          });
        });
      });
    } catch (error) {
      console.error("!!! Erro ao obter igrejas: ", error);
    }
    return igrejas;
  },

  async alterarIgreja(igreja = { cod: 0, codUnidade: 0 }) {
    try {
      if (!this.username) throw new Error("Usuário não identificado!!!");

      const { body: htmlComp } = await this.fetch({
        url: "https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias",
        method: "post",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        payload: JSON.stringify({ codigoEmpresa: igreja.codUnidade }),
      });

      const dataComp = JSON.parse(htmlComp).d[0];

      const result = await this.fetch({
        url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx",
        method: "post",
        payload: {
          gravar: "S",
          f_usuario: this.username.replace(/\r?\n|\r/g, "").trim(),
          f_empresa: igreja.codUnidade,
          f_estabelecimento: igreja.cod,
          f_competencia: dataComp["Codigo"].replace(/\r?\n|\r/g, "").trim(),
          __jqSubmit__: "S",
        },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.currentIgreja = igreja;
      console.info(">>> Igreja alterada para: ", igreja);
      return result.body;
    } catch (error) {
      console.error("!!! Erro ao alterar a igreja:", error);
    }
  },

  async obterFluxoDespesas(startDate, endDate) {
    const despesas = [];

    try {
      const requestData = {
        f_data1: startDate.replace("-").reverse().join("/"),
        f_data2: endDate.replace("-").reverse().join("/"),
        f_estabelecimento: this.currentIgreja.cod,
        f_centrocusto: "",
        f_fornecedor: "",
        f_formato: "TES00902.aspx",
        f_saidapara: "Excel",
        f_agrupar: "CentrodeCustoSetor",
        __initPage__: "S",
      };

      const params = Object.keys(requestData)
        .map((key) => `${key}=${encodeURIComponent(requestData[key])}`)
        .join("&");

      const { blobBytes, type } = await this.fetch({
        url: `https://siga.congregacao.org.br/TES/TES00902.aspx?${params}`,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!["application/vnd.ms-excel"].includes(type)) return [];

      //  {
      //   FLUXO: "Saída",
      //   REGIONAL: igreja.reg,
      //   IGREJA: e.Localidade.replace(/BR \d+-\d+ - /gi, "").trim(),
      //   IGREJA_ADM: igreja.adm,
      //   IGREJA_COD: igreja.cod,
      //   IGREJA_TIPO: igreja.type,
      //   IGREJA_DESC: e.Localidade,
      //   CATEGORIA: e.Despesa,
      //   DATA: e.Data,
      //   VALOR:
      //     Number(e.Total.replace(".", "").replace(",", ".")) || 0,
      //   OBSERVAÇÕES: `${e.Fornecedor}, NF: ${e.NumeroDoc}`,
      //   REF: e.Ref,
      //   ORIGEM: "SIGA",
      //   CREATED: new Date(),
      //   UPDATED: new Date(),
      // };
    } catch (error) {
      console.warn(
        `!!!! Erro ao coletar despesa: ${JSON.stringify(igreja, null, 2)}: `,
        error
      );
      return [];
    }
    return despesas;
  },

  async obterFluxoMapaColeta(startDate, endDate) {
    const coletas = [];

    try {
      const requestData = {
        f_data1: startDate.replace("-").reverse().join("/"),
        f_data2: endDate.replace("-").reverse().join("/"),
        f_estabelecimento: igreja.cod,
        f_centrocusto: "",
        f_fornecedor: "",
        f_formato: "TES00902.aspx",
        f_saidapara: "Excel",
        f_agrupar: "CentrodeCustoSetor",
        __initPage__: "S",
      };

      const params = Object.keys(requestData)
        .map((key) => `${key}=${encodeURIComponent(requestData[key])}`)
        .join("&");

      const { blobBytes } = await this.fetch({
        url: `https://siga.congregacao.org.br/TES/TES00501.aspx?${params}`,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!["application/vnd.ms-excel"].includes(blobBytes.getContentType()))
        return [];

      console.log(">>> Lidar com relatório XLS", blobBytes);
      // {
      //   FLUXO: "Saída",
      //   REGIONAL: igreja.reg,
      //   IGREJA: e.Localidade.replace(/BR \d+-\d+ - /gi, "").trim(),
      //   IGREJA_ADM: igreja.adm,
      //   IGREJA_COD: igreja.cod,
      //   IGREJA_TIPO: igreja.type,
      //   IGREJA_DESC: e.Localidade,
      //   CATEGORIA: e.Despesa,
      //   DATA: e.Data,
      //   VALOR: Number(e.Total.replace(".", "").replace(",", ".")) || 0,
      //   OBSERVAÇÕES: `${e.Fornecedor}, NF: ${e.NumeroDoc}`,
      //   REF: e.Ref,
      //   ORIGEM: "SIGA",
      //   CREATED: new Date(),
      //   UPDATED: new Date(),
      // }
    } catch (error) {
      console.warn("!!! Erro ao coletar despesa: ".igreja.desc);
    }
    return coletas;
  },

  async obterFluxoColetas(startDate, endDate) {
    const ofertas = [];
    try {
      for (const { start, end } of this.betweenDates(startDate, endDate)) {
        var { code: codeCof, body: bodyConf } = await this.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
          payload: {
            f_consultar: "S",
            f_data1: start.replace("-").reverse().join("/"),
            f_data2: end.replace("-").reverse().join("/"),
            f_filtro_relatorio: this.igrejas
              .filter(
                (e) =>
                  e.adm === this.currentIgreja.desc ||
                  e.desc === this.currentIgreja.desc
              )
              .map((e) => e.cod)
              .join(", "),
            f_formacontribuicao: "0",
            f_opcao2: "casaoracao",
            f_exibir: "todos",
            f_detalhar: "true",
            f_saidapara: "Excel",
            __initPage__: "S",
            __jqSubmit__: "S",
          },
          headers: {
            "Content-Type": `multipart/form-data`,
          },
        });
        if (codeCof === 500) {
          throw `!!! Falha ao gerar relatório: ${bodyConf}`;
        }

        const {
          code: codeDow,
          body: bodyDow,
          blobBytes,
          type: typeContent,
        } = await this.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00507.aspx",
          payload: "f_saidapara=Excel&__initPage__=S",
          headers: {
            "Content-Type": `multipart/form-data`,
          },
        });

        if (codeDow !== 200) {
          throw `Falha ao gerar relatório de coletas: ${bodyDow}`;
        }

        if (!["application/vnd.ms-excel"].includes(typeContent)) return [];

        console.info(">>> Gerar dados do arquivo XLS.....", blobBytes);
      }
    } catch (error) {
      console.error("!!! Erro ao baixar fluxo de coletas: ", error);
    }
    return ofertas;
  },

  async obterFluxoDepositos(startDate, endDate) {
    const fluxos = [];

    /**
     * Obter copetencias
     */
    const refs = this.betweenDates(startDate, endDate).map((e) =>
      e.start.replace(/\d{2}\/(\d{2}\/\d{4})/gi, "$1")
    );

    // Executa a requisição
    var { body } = await this.fetch({
      url: "https://siga.congregacao.org.br/TES/TES00701.aspx?f_inicio=S&__initPage__=S",
    });

    const selectRegex =
      /<select[^>]*id="f_competencia"[^>]*>([\s\S]*?)<\/select>/i;
    const selectMatch = selectRegex.exec(body);

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

    /**
     * Obter dados
     */
    for (const { value: competencia, description } of competencias) {
      const {
        code: status,
        body,
        blobBytes,
      } = await this.fetch({
        url: "https://siga.congregacao.org.br/TES/TES00702.aspx",
        method: "post",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        payload: `f_competencia=${competencia}&f_data1=&f_data2=&f_estabelecimento=${this.currentIgreja.cod}&f_saidapara=Excel&f_ordenacao=alfabetica&__initPage__=S`,
      });

      if (status !== 200) {
        console.error(
          `Falha (${status}) ao gerar relatório de deposito ${description}: ${body}`
        );
      }

      if (!["application/vnd.ms-excel"].includes(blobBytes.getContentType()))
        return [];

      console.log("Lidar com o blobBytes XLS: ", blobBytes);
      //   {
      //     FLUXO: "Deposito",
      //   REGIONAL: undefined,
      //   IGREJA: igrejaNome,
      //   IGREJA_ADM: undefined,
      //   IGREJA_COD: undefined,
      //   IGREJA_TIPO: undefined,
      //   IGREJA_DESC: igrejaNome,
      //   CATEGORIA: "",
      //   DATA: values[i][3],
      //   VALOR: values[i][18].replace("R$ ", "").trim(),
      //   OBSERVAÇÕES: values[i][7],
      //   REF: ref,
      //   ORIGEM: "SIGA",
      //   CREATED: new Date(),
      //   UPDATED: new Date(),
      // }
    }

    return fluxos;
  },

  async obterEventosSecretaria(startDate, endDate) {
    const eventos = [];
    try {
      const { code, body } = await this.fetch({
        url: "https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        payload: JSON.stringify({
          codigoTipoEvento: null,
          codigoEmpresa: igreja.codUnidade,
          codigoEstabelecimento: null,
          data1: startDate.replace("-").reverse().join("/"),
          data2: endDate.replace("-").reverse().join("/"),
          listaStatus: "4,3",
          config: {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 1000,
            sSearch: "",
            iSortCol: 0,
            sSortDir: "asc",
          },
        }),
      });
      const data = JSON.parse(body);
      if (data.d.aaData && code == 200) {
        data.d.aaData
          .map(([DATA, SEMANA, HORA, GRUPO, IGREJA, , STATUS, ID]) => {
            return {
              EVENTO: "Secretaria",
              GRUPO,
              DATA: new Date(`${DATA} ${HORA.split("-")[0].trim()}`),
              IGREJA,
              OBSERVAÇÕES: `${SEMANA}: ${HORA}`,
              STATUS: STATUS.replace(/<\/?[^>]+>/gi, ""),
              ID,
            };
          })
          .forEach((e) => eventos.push(e));
      }
    } catch (erro) {
      console.warn("Erro ao obter Eventos: ", erro);
    }
    console.log("Eventos obtidos: ", eventos);
    return eventos;
  },

  async obterEventosContabilidadeCompetencias() {
    if (this.currentIgreja.type !== 3) return;

    const eventos = [];
    try {
      const { body } = await this.fetch({
        url: "https://siga.congregacao.org.br/CTB/CTB00701.aspx?f_inicio=S&__initPage__=S",
      });

      var regex =
        /<tr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<\/tr>/g;

      var matches;
      var results = [];

      while ((matches = regex.exec(body)) !== null) {
        var events = {
          "Casa de Oração": matches[2].includes("open") ? "Aberto" : "Fechado",
          Piedade: matches[3].includes("open") ? "Aberto" : "Fechado",
          Administração: matches[4].includes("open") ? "Aberto" : "Fechado",
          "Conselho Fiscal": matches[5].includes("open") ? "Aberto" : "Fechado",
          Contabiliade: matches[6].includes("open") ? "Aberto" : "Fechado",
        };

        const competencia = matches[1].trim().replace(/&nbsp;/g, "");

        Object.keys(events).forEach((grupo) => {
          results.push({
            EVENTO: "Contabilidade Competências",
            GRUPO: "Casa de Oração",
            DATA: competencia,
            IGREJA: this.currentIgreja.desc,
            OBSERVAÇÕES: `${SEMANA}`,
            STATUS: events.casaOracao,
            ID,
          });
        });
      }
    } catch (error) {}

    return eventos;
  },

  async loadAll(startDate, endDate) {
    const igrejas = await coletarIgrejas();
    const fluxos = [];
    const eventos = [];
    try {
      for (const igreja of siga.igrejas.filter((i) => i.type === 3)) {
        console.log("Igreja: ", igreja);
        await this.alterarIgreja(igreja);
        await this.obterFluxoColetas(startDate, endDate).forEach((e) =>
          fluxos.push(e)
        );
        await this.obterFluxoDespesas().forEach((e) => fluxos.push(e));
        await this.obterFluxoMapaColeta().forEach((e) => fluxos.push(e));
        await this.obterFluxoDepositos().forEach((e) => fluxos.push(e));
        await this.obterEventosSecretaria().forEach((e) => eventos.push(e));
        await this.obterEventosContabilidadeCompetencias().forEach((e) =>
          eventos.push(e)
        );
        break;
      }
    } catch (err) {
      console.log("Erro ", err);
      app.error = err.message;
    } finally {
      app.loading = false;
    }
    return {
      igrejas,
      fluxos,
      eventos,
    };
  },
};

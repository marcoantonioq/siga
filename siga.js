export var SIGA = {
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
      const body = await this.login();
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

      const paramsURL = Object.keys(requestData)
        .map((key) => `${key}=${encodeURIComponent(requestData[key])}`)
        .join("&");

      const { blobBytes, type } = await this.fetch({
        url: 'https://siga.congregacao.org.br/TES/TES00902.aspx?' + paramsURL,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!["application/vnd.ms-excel"].includes(type)) return [];

      console.info(">>> Gerar dados do arquivo XLS.....", blobBytes);
    } catch (error) {
      console.warn(
        `!!!! Erro ao coletar despesa: ${JSON.stringify(this.currentIgreja, null, 2)}: `,
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

      const { blobBytes } = await this.fetch({
        url: `https://siga.congregacao.org.br/TES/TES00902.aspx?${params}`,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!["application/vnd.ms-excel"].includes(type)) return [];

      console.info(">>> Gerar dados do arquivo XLS.....", blobBytes);
    } catch (error) {
      console.warn(
        `!!!! Erro ao coletar fluxo: ${JSON.stringify(this.currentIgreja, null, 2)}: `,
        error
      );
      return [];
    }
    return coletas;
  },

  async obterCompetencias() {
    try {
      const result = await this.fetch({
        url: "https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias",
        method: "post",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        payload: JSON.stringify({
          codigoEmpresa: this.currentIgreja.codUnidade,
        }),
      });

      const competencias = JSON.parse(result.body).d.map(
        ({ Codigo, Descricao }) => ({
          cod: Codigo,
          desc: Descricao,
        })
      );

      this.competencias = competencias;
      return competencias;
    } catch (error) {
      console.error(
        "!!! Erro ao carregar as competências da igreja selecionada:",
        error
      );
    }
    return [];
  },
};
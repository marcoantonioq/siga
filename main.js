function doGet() {
  return HtmlService.createHtmlOutputFromFile('page');
}

function run() {
  try {
    // sheet.running = false
    if (sheet.running) {
      const msg = "Script já está em execução!!!"
      console.error(msg)
      SpreadsheetApp.getUi().alert(msg);
      throw msg
    } else {
      sheet.running = true
    }

    const fluxo = []
    var igrejasFiltered = []
    const eventos = []
    const competencia = []

    try {

      const igrejas = siga.fetchIgrejas() || []

      // /** Filter */
      if (settings.filtrar) {
        const regex = new RegExp(settings?.filtrar.split(',').map(e => e.trim()).join("|"), "gi")
        igrejasFiltered = igrejas.filter(e => e.type !== 3 && regex.test(e.desc))
        igrejasFiltered = igrejasFiltered.concat(igrejas.filter(e => e.type === 3 && igrejasFiltered.some(i => i.adm === e.desc)))
      } else {
        igrejasFiltered = igrejas
      }

      if (!igrejas.length) return

      if (!settings.data_inicial || !settings.data_final) {
        const msg = "Informe um período válido nas configurações!"
        console.error(msg)
        SpreadsheetApp.getUi().alert(msg);
      }

      if (!settings.cookie) {
        const msg = "Informe o cookie nas configurações!"
        console.error(msg)
        SpreadsheetApp.getUi().alert(msg);
      }

      // Filtrar por administrações
      for (const igreja of igrejasFiltered.filter(e => e.type === 3)) {
        try {

          siga.alterarIgreja(igreja);

          siga.reportColetas(igrejas.filter(e => e.adm === igreja.desc)).forEach(e => fluxo.push(e))
          siga.reportDespesas(igreja).forEach(e => fluxo.push(e))
          siga.reportDepositos(igreja).forEach(e => fluxo.push(e))
          siga.reportEventos().forEach(e => eventos.push(e))
          siga.contabilidadeCompetencias(igreja).forEach(e => competencia.push(e))

          // timeout maior que 300s => // siga.reportOfertas(igreja).forEach(e => fluxo.push(e))

          fluxo.map(e => {
            const report = igrejas.find(ig => ig?.desc.includes(e.IGREJA_DESC))
            if (report) {
              e.IGREJA = report.nome
              e.IGREJA_COD = report.cod
              e.IGREJA_TIPO = report.type
              e.COD_REG = report.codUnidade
              e.REGIONAL = report.reg
              e.IGREJA_ADM = report.adm
              e.IGREJA_TIPO = report.type
              e.IGREJA_DESC = report.desc
            }
          })

        } catch (error) {
          console.log(`Erro ao acessar igreja ${igreja.desc}: `, error)
        }
      }

      // Salvar Sheet
      sheet.igrejas = igrejas
      sheet.eventos = eventos
      sheet.fluxo = fluxo
      sheet.competencia = competencia
    } catch (erro) {
      console.log("Erro ao coletar dados! ", erro)
    } finally {
      sheet.running = false
    }
  } catch (e) {
    console.log("Erro geral: ", e)
  }
  const sucess = "Script executado com sucesso!"
  console.info(sucess)
  // Browser.msgBox(sucess);
}


const util = {
  /**
 * Envia uma requisição HTTP para o URL especificado com opções configuráveis.
 *
 * @param {Object} options - Objeto de configuração para a requisição.
 * @param {string} options.url - URL para a requisição. (Obrigatório)
 * @param {string} [options.method='post'] - Método HTTP a ser utilizado (ex: 'post', 'get'). (Opcional, padrão é 'post')
 * @param {Object} [options.headers] - Cabeçalhos HTTP a serem enviados com a requisição. (Opcional)
 * @param {Object} [options.payload] - Dados a serem enviados no corpo da requisição. (Opcional)
 * @returns {string} - Resposta da requisição.
 */
  fetch(options) {

    if (!options.url) {
      throw new Error('A URL é obrigatória.');
    }

    const defaultOptions = {
      method: 'get',
      headers: {
        'Cookie': settings.cookie,
        '__AntiXsrfToken': settings.antiXsrfToken,
      },
      muteHttpExceptions: true
    };

    const finalOptions = {
      ...defaultOptions,
      method: options.method || defaultOptions.method,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      },
      payload: options.payload
    };

    return UrlFetchApp.fetch(options.url, finalOptions);

  },

  /**
   * Construa o corpo da requisição em formato multipart/form-data.
   * @param {Object} data - Objeto contendo os pares chave-valor para o payload.
   * @param {string} boundary - Boundary usado para separar as partes do corpo.
   * @return {string} - Corpo da requisição formatado.
   */
  buildMultipartPayload(data, boundary) {
    var payload = [];

    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        payload.push(`--${boundary}`);
        payload.push(`Content-Disposition: form-data; name="${key}"`);
        payload.push("");
        payload.push(data[key]);
      }
    }

    payload.push(`--${boundary}--`);
    return payload.join("\r\n");
  }
}

const settings = {
  updateSettings() {

    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Configurações")

    if (!sheet) {
      sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .insertSheet("Configurações")
      const data = [["data_inicial"], ["data_final"], ["cookie"], ["filtrar"]]
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data)
    }

    sheet.getDataRange().getValues().forEach(([key, value]) => {
      if (/^\d\d\d\d-\d\d-\d\d/.test(value)) {
        this[key] = new Date(value)
      } else {
        this[key] = value
      }
    })

    if (this.cookie) {
      try {
        this.antiXsrfToken = this.cookie.match(/__AntiXsrfToken=([^;]+)/)[1]
      } catch (e) {
        console.info("AntiXsrfToken não informado!")
      }
    }

  },
  save() {
    var sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Configurações")

    const values = Object.entries(JSON.parse(JSON.stringify(this))).filter(([key]) => key)
    sheet.clear();
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  },
  betweenDates() {

    let periodos = [];

    if (settings.data_inicial && settings.data_final) {

      let start = new Date(settings.data_inicial)
      let end = new Date(settings.data_final)

      end = new Date(end.getFullYear(), end.getMonth() + 1, 0);

      while (start <= end) {
        let firstDayOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        let lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);

        periodos.push({
          start: firstDayOfMonth.toLocaleDateString('pt-BR'),
          end: lastDayOfMonth.toLocaleDateString('pt-BR')
        })

        start = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      }
    }
    return periodos
  },
  getFirstDayOfMonth() {
    const date = this.data_inicial
    return new Date(date.getFullYear(), date.getMonth(), 1)
  },
  getLastDayOfMonth() {
    const date = this.data_final
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  }
}
settings.updateSettings()

/**
 * Aplicação SIGA
 * By: Marco Antônio Queiroz
 */
const siga = {
  fetchIgrejas() {
    const igrejas = []
    const htmlString = util.fetch({ url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S" }).getContentText();

    if (/(Lembrar meu email\/usuário|acesso ao SIGA para enviarmos um e-mail com uma senha provisória|..\/index.aspx)/gi.test(htmlString)) {
      console.error("Você não está logado!\nAcesse o portal administrativo para enviar o cookie de autenticação...")
      settings.cookie = gui.input("Cookie válido: ");
      settings.save()
      return []
    }

    const optgroupRegex = /<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g;
    const empresas = [];

    var optgroupMatch;
    while ((optgroupMatch = optgroupRegex.exec(htmlString)) !== null) {
      const label = optgroupMatch[1];
      const options = optgroupMatch[2];
      const optionRegex = /<option value="(\d+)"[^>]*>\s*([^<]+)\s*<\/option>/gs;
      var optionMatch;
      while ((optionMatch = optionRegex.exec(options)) !== null) {
        empresas.push({
          retional: label,
          type: 'EMPRESA',
          id: Number(optionMatch[1]),
          description: optionMatch[2].trim()
        });
      }
    }

    for (const empresa of empresas) {
      JSON.parse(
        util.fetch({
          url: "https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso",
          method: 'post',
          payload: JSON.stringify({ "codigoEmpresa": empresa.id }),
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
          }
        }).getContentText()
      )?.d.map(e => {
        igrejas.push({
          cod: e["Codigo"],
          adm: empresa.description,
          codUnidade: empresa.id,
          reg: empresa.retional,
          type: e["CodigoTipoEstabelecimento"],
          nome: e["Nome"],
          desc: e["NomeExibicao"],
          membros: 0,
        })
      });
    }
    return igrejas;
  },

  alterarIgreja(igreja = { cod: 0, codUnidade: 0 }) {
    /**
      * Selecionar Igreja
      ****/
    try {
      var response = util.fetch({
        url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx",
      });
      let status = response.getResponseCode();
      if (status === 200) {
        const html = response.getContentText();

        console.log("Igreja >>> ", igreja.desc || igreja.cod)
        var usuario = html.match(/<input[^>]*name="f_usuario"[^>]*value="([^"]*)"/)[1];
        var competencia = util.fetch({
          url: "https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias",
          method: "post",
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
          },
          payload: JSON.stringify({
            "codigoEmpresa": igreja.codUnidade
          })
        }).getContentText()

        const data = JSON.parse(competencia).d[0]

        const payloadData = {
          "gravar": "S",
          "f_usuario": usuario,
          "f_empresa": igreja.codUnidade,
          "f_estabelecimento": igreja.cod,
          "f_competencia": data.Codigo,
          "__jqSubmit__": "S"
        };

        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substr(2)}`

        var response = util.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx",
          payload: util.buildMultipartPayload(payloadData, boundary),
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`
          },
        });

        if (response.getResponseCode() === 500) {
          var result = response.getContentText()
          throw `Falha ao alterar de igreja: ${result}`
        }

      } else {
        throw `Falha ao selecionar igreja ${igreja.desc || igreja.cod}`;
      }
    } catch (erro) {
      Logger.log("Erro ao selecionar igreja: " + erro);
    }

  },

  reportOfertas(igreja = { cod: 0, desc: '', membros: 0 }) {

    var ofertas = [];
    /**
     * Buscar ofertas
     ****/

    try {
      var response = util.fetch({
        url: "https://siga.congregacao.org.br/TES/TES00401.asmx/Selecionar",
        method: 'post',
        payload: JSON.stringify({
          data1: new Date(siga.firstTime).toISOString().split("T")[0],
          data2: new Date(siga.lastTime).toISOString().split("T")[0],
          config: {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 100,
            sSearch: "",
            iSortCol: 0,
            sSortDir: "asc",
          },
        }),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        }
      });
      var data = JSON.parse(response.getContentText());

      for (e of data.d.aaData) {
        try {


          var dateParts = e.sData.split("/");
          var data = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);

          if (e.NomeTipoCulto.includes("RJM")) {
            data.setHours(9, 30);
          } else {
            data.setHours(19, 30);
          }
          ofertas.push({
            FLUXO: "Ofertas",
            REGIONAL: igreja.reg,
            IGREJA: igreja.nome,
            IGREJA_ADM: igreja.adm,
            IGREJA_COD: igreja.cod,
            IGREJA_TIPO: igreja.type,
            IGREJA_DESC: igreja.desc,
            CATEGORIA: String(e.NomeTipoCulto || ""),
            DATA: data,
            VALOR: Number(e.ValorTotal),
            OBSERVAÇÕES: "",
            REF: dateParts[1] + "/" + dateParts[2],
            ORIGEM: "SIGA",
            CREATED: new Date(),
            UPDATED: new Date(),
          });
        } catch (error) {
          console.log("Erro ao gerar entrada: ", e, error)
        }
      }
    } catch (erro) {
      Logger.log("Erro ao gerar Ofertas: " + erro);
    }
    return ofertas;
  },

  reportMapaColeta(igreja = { cod: 0, desc: '', membros: 0 }) {
    const coletas = [];

    try {
      const requestData = {
        f_data1: new Date(siga.firstTime).toISOString().split("T")[0].split("-").reverse().join("/") || "",
        f_data2: new Date(siga.lastTime).toISOString().split("T")[0].split("-").reverse().join("/") || "",
        f_estabelecimento: igreja.cod,
        f_centrocusto: "",
        f_fornecedor: "",
        f_formato: "TES00902.aspx",
        f_saidapara: "Excel",
        f_agrupar: "CentrodeCustoSetor",
        __initPage__: "S",
      };

      const params = Object.keys(requestData).map(key => `${key}=${encodeURIComponent(requestData[key])}`).join('&');

      const excelResponse = util.fetch({
        url: `https://siga.congregacao.org.br/TES/TES00501.aspx?${params}`,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      })

      const blob = excelResponse.getBlob();
      if (!["application/vnd.ms-excel"].includes(blob.getContentType()))
        return []
      const file = DriveApp.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      const data = util.fetch({ url: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv` })
        .getBlob().getDataAsString()
      const dataValues = Utilities.parseCsv(data)
      console.log("Relátorio de despesa coletado: ", `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`)
      DriveApp.getFileById(fileId).setTrashed(true);

      let Localidade = "", Ref = "";

      dataValues.forEach((row) => {
        if (Array.isArray(row) && row.length) {
          if (/^Mês \d\d\/\d+/.test(`${row[0]}`)) {
            const [, mm, yyyy] = row[0].match(/(\d{2})\/(\d{4})/);
            Ref = `${mm}/${yyyy}`;
          } else if (/^(BR \d+-\d+|^ADM|^PIA)/.test(`${row[0]}`)) {
            Localidade = row[0];
          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(`${row[0]}`)) {
            const despesa = {
              Ref,
              Localidade,
              Data: row[0],
              Tipo: row[3],
              NumeroDoc: row[4],
              Despesa: row[6],
              Fornecedor: row[8],
              Valor: row[15],
              Multa: row[21],
              Juros: row[24],
              Desconto: row[27],
              Total: row[30],
            };
            coletas.push(despesa);
          }
        }
      });
    } catch (error) {
      console.log("Erro ao coletar despesa: ".igreja.desc)
    }
    const formatColetas = coletas.map((e) => {
      return {
        FLUXO: "Saída",
        REGIONAL: igreja.reg,
        IGREJA: e.Localidade.replace(/BR \d+-\d+ - /gi, "").trim(),
        IGREJA_ADM: igreja.adm,
        IGREJA_COD: igreja.cod,
        IGREJA_TIPO: igreja.type,
        IGREJA_DESC: e.Localidade,
        CATEGORIA: e.Despesa,
        DATA: e.Data,
        VALOR: Number(e.Total.replace('.', '').replace(',', '.')) || 0,
        OBSERVAÇÕES: `${e.Fornecedor}, NF: ${e.NumeroDoc}`,
        REF: e.Ref,
        ORIGEM: "SIGA",
        CREATED: new Date(),
        UPDATED: new Date()
      };
    });
    return formatColetas

  },

  reportDespesas(igreja = { cod: 0, desc: '', membros: 0 }) {

    const despesas = [];

    try {
      const requestData = {
        f_data1: new Date(settings.getFirstDayOfMonth()).toISOString().split("T")[0].split("-").reverse().join("/") || "",
        f_data2: new Date(settings.getLastDayOfMonth()).toISOString().split("T")[0].split("-").reverse().join("/") || "",
        f_estabelecimento: igreja.cod,
        f_centrocusto: "",
        f_fornecedor: "",
        f_formato: "TES00902.aspx",
        f_saidapara: "Excel",
        f_agrupar: "CentrodeCustoSetor",
        __initPage__: "S",
      };

      const params = Object.keys(requestData).map(key => `${key}=${encodeURIComponent(requestData[key])}`).join('&');

      const excelResponse = util.fetch({
        url: `https://siga.congregacao.org.br/TES/TES00902.aspx?${params}`,
        headers: {
          "Content-Type": "application/octet-stream",
        }
      })

      const blob = excelResponse.getBlob();
      if (!["application/vnd.ms-excel"].includes(blob.getContentType()))
        return []
      const file = DriveApp.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      const data = util.fetch({ url: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv` })
        .getBlob().getDataAsString()
      const dataValues = Utilities.parseCsv(data)
      DriveApp.getFileById(fileId).setTrashed(true);

      console.log("Relátorio de despesa coletado: ", `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`)

      let Localidade = "", Ref = "";

      dataValues.forEach((row) => {
        if (Array.isArray(row) && row.length) {
          if (/^Mês \d\d\/\d+/.test(`${row[0]}`)) {
            const [, mm, yyyy] = row[0].match(/(\d{2})\/(\d{4})/);
            Ref = `${mm}/${yyyy}`;
          } else if (/^(BR \d+-\d+|^ADM|^PIA)/.test(`${row[0]}`)) {
            Localidade = row[0];
          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(`${row[0]}`)) {
            const despesa = {
              Ref,
              Localidade,
              Data: row[0],
              Tipo: row[3],
              NumeroDoc: row[4],
              Despesa: row[6],
              Fornecedor: row[8],
              Valor: row[15],
              Multa: row[21],
              Juros: row[24],
              Desconto: row[27],
              Total: row[30],
            };
            despesas.push(despesa);
          }
        }
      });

      const formatDespesas = despesas.map((e) => {
        return {
          FLUXO: "Saída",
          REGIONAL: igreja.reg,
          IGREJA: e.Localidade.replace(/BR \d+-\d+ - /gi, "").trim(),
          IGREJA_ADM: igreja.adm,
          IGREJA_COD: igreja.cod,
          IGREJA_TIPO: igreja.type,
          IGREJA_DESC: e.Localidade,
          CATEGORIA: e.Despesa,
          DATA: e.Data,
          VALOR: Number(e.Total.replace('.', '').replace(',', '.')) || 0,
          OBSERVAÇÕES: `${e.Fornecedor}, NF: ${e.NumeroDoc}`,
          REF: e.Ref,
          ORIGEM: "SIGA",
          CREATED: new Date(),
          UPDATED: new Date()
        };
      });
      return formatDespesas
    } catch (error) {
      console.warn(`Erro ao coletar despesa: ${JSON.stringify(igreja, null, 2)}: `, error)
      return []
    }
  },

  reportColetas(igrejas = [{ cod: 345 }]) {

    // APP.alterarIgreja({ cod: 345 })

    const fluxos = []

    try {
      for (const { start, end } of settings.betweenDates()) {

        var payloadData = {
          "f_consultar": "S",
          "f_data1": start,
          "f_data2": end,
          "f_filtro_relatorio": igrejas.map(e => e.cod).join(', '),
          "f_formacontribuicao": "0",
          "f_opcao2": "casaoracao",
          "f_exibir": "todos",
          "f_detalhar": "true",
          "f_saidapara": "Excel",
          "__initPage__": "S",
          "__jqSubmit__": "S"
        };

        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substr(2)}`

        var response = util.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
          payload: util.buildMultipartPayload(payloadData, boundary),
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`
          },
        });
        var result = response.getContentText()
        var status = response.getResponseCode()
        if (status === 500) {
          throw `Falha ao gerar relatório: ${result}`
        }

        response = util.fetch({
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00507.aspx",
          payload: "f_saidapara=Excel&__initPage__=S",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`
          },
        });
        var status = response.getResponseCode()

        if (status !== 200) {
          throw `Falha ao gerar relatório de coletas: ${status}`
        }

        const blob = response.getBlob();
        if (!["application/vnd.ms-excel"].includes(blob.getContentType()))
          return []
        const file = DriveApp.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        const fileId = file.getId();
        const data = util.fetch({ url: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv` })
          .getBlob().getDataAsString()
        const values = Utilities.parseCsv(data)
        DriveApp.getFileById(fileId).setTrashed(true);

        var nomeIgreja = "", headers = "", tipo = "", ref = end.replace(/\d{2}\/(\d{2}\/\d{4})/gi, "$1")

        console.log(`Relátorio Mapa de Coleta (${ref}): https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`)

        for (var i = 0; i < values.length; i++) {
          if (/^Total/.test(values[i][0])) {
            nomeIgreja = ""
            continue
          } else if (/^Todos/.test(values[i][0])) {
            break
          } else if (/^Casa de Oração/.test(`${values[i][0]}`)) {

            headers = values[i]

          } else if (/^(SET|BR|ADM)/.test(values[i][0])) {

            nomeIgreja = values[i][0]

          }

          if (/^Tipo/.test(values[i][6])) {
            continue
          } else if (/[a-z]/i.test(values[i][6])) {

            tipo = values[i][6]

            for (let x = 7; x < headers.length; x++) {

              if (headers[x] === "Total") break
              if (!headers[x] || !/^[1-9]/.test(values[i][x])) continue

              fluxos.push({
                FLUXO: "Coleta",
                REGIONAL: undefined,
                IGREJA: nomeIgreja,
                IGREJA_ADM: undefined,
                IGREJA_COD: undefined,
                IGREJA_TIPO: undefined,
                IGREJA_DESC: nomeIgreja,
                CATEGORIA: tipo,
                DATA: end,
                VALOR: values[i][x],
                OBSERVAÇÕES: headers[x],
                REF: ref,
                ORIGEM: "SIGA",
                CREATED: new Date(),
                UPDATED: new Date(),
              })
            }
          }
        }
      }
    } catch (erro) {
      console.log("Erro ao obter coleta! ", erro)
    }
    return fluxos
  },
  reportDepositos(igreja = { cod: 345, type: 3 }) {

    const fluxos = []

    /**
     * Obter copetencias
     */
    const refs = settings.betweenDates().map(e => e.start.replace(/\d{2}\/(\d{2}\/\d{4})/gi, "$1"))

    // Executa a requisição
    var response = util.fetch({ url: 'https://siga.congregacao.org.br/TES/TES00701.aspx?f_inicio=S&__initPage__=S' });

    const content = response.getContentText();

    const selectRegex = /<select[^>]*id="f_competencia"[^>]*>([\s\S]*?)<\/select>/i;
    const selectMatch = selectRegex.exec(content);

    var competencias = [];

    if (selectMatch) {
      const optionsHtml = selectMatch[1];
      const optionRegex = /<option[^>]*value="([^"]*)".*?>(.*?)<\/option>/gi;
      var match;
      while ((match = optionRegex.exec(optionsHtml)) !== null) {
        if (!match[2].includes("Todos") && refs.includes(match[2])) {
          competencias.push({
            value: match[1],
            description: match[2]
          });
        }
      }
    }

    /**
     * Obter dados
     */
    for (const { value: competencia, description } of competencias) {

      response = util.fetch({
        url: 'https://siga.congregacao.org.br/TES/TES00702.aspx',
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        payload: `f_competencia=${competencia}&f_data1=&f_data2=&f_estabelecimento=${igreja.cod}&f_saidapara=Excel&f_ordenacao=alfabetica&__initPage__=S`
      })

      var status = response.getResponseCode()
      if (status !== 200) {
        const error = response.getContentText()
        console.error(`Falha (${status}) ao gerar relatório de deposito ${description}: ${error}`)
      }

      const blob = response.getBlob();
      if (!["application/vnd.ms-excel"].includes(blob.getContentType()))
        return []
      const file = DriveApp.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      const data = util.fetch({ url: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv` })
        .getBlob().getDataAsString()
      const values = Utilities.parseCsv(data)
      DriveApp.getFileById(fileId).setTrashed(true);

      console.log(`Relátorio de depositos (${description}): https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`)

      var igrejaNome = "";
      var ref = values[9][14]
      for (var i = 0; i < values.length; i++) {
        if (/^(SET|ADM|BR)/.test(`${values[i][0]}`)) {
          igrejaNome = values[i][0]
        } else if (/^\d\d\/\d{4}/.test(values[i][2])) {
          ref = values[i][2];
          fluxos.push({
            FLUXO: "Deposito",
            REGIONAL: undefined,
            IGREJA: igrejaNome,
            IGREJA_ADM: undefined,
            IGREJA_COD: undefined,
            IGREJA_TIPO: undefined,
            IGREJA_DESC: igrejaNome,
            CATEGORIA: "",
            DATA: values[i][3],
            VALOR: values[i][18].replace("R$ ", "").trim(),
            OBSERVAÇÕES: values[i][7],
            REF: ref,
            ORIGEM: "SIGA",
            CREATED: new Date(),
            UPDATED: new Date(),
          })
        }
      }

    }

    return fluxos;
  },

  reportEventos(igreja = { cod: 0, codUnidade: 0 }) {

    const eventos = []
    try {
      const response = util.fetch({
        url: "https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW",
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        payload: JSON.stringify({
          "codigoTipoEvento": null,
          "codigoEmpresa": igreja.codUnidade,
          "codigoEstabelecimento": null,
          "data1": settings.data_inicial,
          "data2": settings.data_final,
          "listaStatus": "4,3",
          "config": {
            sEcho: 1,
            "iDisplayStart": 0,
            "iDisplayLength": 1000,
            "sSearch": "",
            "iSortCol": 0,
            "sSortDir": "asc"
          }
        })
      })
      const data = JSON.parse(response.getContentText())
      if (data.d.aaData && response.getResponseCode() == 200) {
        data.d.aaData.map(([DATA, SEMANA, HORA, GRUPO, IGREJA, , STATUS, ID]) => {
          return {
            DATA,
            SEMANA,
            HORA,
            GRUPO,
            IGREJA,
            STATUS: STATUS.replace(/<\/?[^>]+>/gi, ''),
            ID,
          }
        }).forEach(e => eventos.push(e))
      }
    } catch (erro) {
      console.info("Erro ao obter Eventos: ", erro)
    }
    return eventos
  },

  /**
   * Contabilidade
   */
  contabilidadeCompetencias(igreja = { cod: 345, type: 3 }) {

    if (igreja.type !== 3) return

    const html = util.fetch({
      url: "https://siga.congregacao.org.br/CTB/CTB00701.aspx?f_inicio=S&__initPage__=S"
    }).getContentText()

    var regex = /<tr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<\/tr>/g;

    var matches;
    var results = [];

    while ((matches = regex.exec(html)) !== null) {
      var row = {
        competencia: matches[1].trim().replace(/&nbsp;/g, ''),
        casaOracao: matches[2].includes("open") ? "Aberto" : "Fechado",
        piedade: matches[3].includes("open") ? "Aberto" : "Fechado",
        administracao: matches[4].includes("open") ? "Aberto" : "Fechado",
        conselhoFiscal: matches[5].includes("open") ? "Aberto" : "Fechado",
        contabilidade: matches[6].includes("open") ? "Aberto" : "Fechado"
      };
      results.push(row);
    }

    return results

  }

};

const sheet = {
  set igrejas(igrejas = []) {
    const sheet = this.getSheet("Igrejas");
    const values = igrejas.map(e => Object.values(e))
    if (values.length && values[0].length) {
      sheet.clear();
      values.unshift(["Codigo", "ADM", "Cod. Unidade", "Regional", "Tipo", "Nome", "Descrição", "Membros"])
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  },
  get igrejas() {
    const sheet = this.getSheet("Igrejas");
    const values = sheet.getDataRange().getValues()
    const headers = values.shift()
    return values.map(e => {
      return headers.reduce((acc, header, id) => {
        acc[header] = e[id]
        return acc
      }, {})
    })
  },
  set fluxo(fluxos = []) {
    try {
      const sheet = this.getSheet("Fluxos");
      const values = fluxos.map(e => Object.values(e))
      if (values.length && values[0].length) {
        sheet.clear();
        values.unshift(["FLUXO", "REGIONAL", "IGREJA", "IGREJA_ADM", "IGREJA_COD", "IGREJA_TIPO", "IGREJA_DESC", "CATEGORIA", "DATA", "VALOR", "OBSERVAÇÕES", "REF", "ORIGEM", "CREATED", "UPDATED", ""])
        sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
      }
    } catch (erro) {
      console.warn("Erro ao salvar fluxo: ", erro)
    }
  },
  get fluxo() {
    return []
  },
  set eventos(eventos = []) {
    const values = eventos.map(e => Object.values(e))
    if (values.length) {
      values.unshift(Object.keys(eventos[0]))
      const sheet = this.getSheet("Eventos")
      sheet.clear();
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values)
    }

  },
  get eventos() {
    return []
  },
  getSheet(name = "") {
    return SpreadsheetApp
      .getActiveSpreadsheet().getSheetByName(name) ||
      SpreadsheetApp
        .getActiveSpreadsheet().insertSheet(name)
  },
  set running(status = false) {
    settings.running = status;
    settings.save()
    settings.updateSettings()
  },
  get running() {
    settings.updateSettings();
    return settings.running
  },
  set competencia(eventos = []) {
    const values = eventos.map(e => Object.values(e))
    if (values.length) {
      values.unshift(Object.keys(eventos[0]))
      const sheet = this.getSheet("Eventos")
      sheet.clear();
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values)
    }
  },
  get competencia() {
    return []
  }
}

const gui = {
  input(label = "") {
    const ui = SpreadsheetApp.getUi();
    const resposta = ui.prompt('Informe', label, ui.ButtonSet.OK_CANCEL);
    if (resposta.getSelectedButton() == ui.Button.OK) {
      return resposta.getResponseText();
    } else {
      return undefined;
    }
  },
}

function openConfiguracoes() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Configurações');

  if (sheet) {
    SpreadsheetApp.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert('A planilha "Configurações" não foi encontrada.');
  }
}

function openGuiCookie() {
  settings.cookie = gui.input("Cookie: ");
  if (settings.cookie) {
    settings.save()
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CCB")
    .addItem("⚙️ 1. Configurações", "openConfiguracoes")
    .addItem("🔄 2. Sincronizar", "run")
    .addItem("🍪 Salvar Cookie", "openGuiCookie")
    .addToUi();
}
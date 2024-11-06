export class Evento {
  constructor({
    EVENTO = "",
    GRUPO = "",
    DATA = "",
    IGREJA = "",
    OBSERVACOES = "",
    STATUS = "",
    ID = "",
  }) {
    Object.assign(this, {
      EVENTO,
      GRUPO,
      DATA,
      IGREJA,
      OBSERVACOES,
      STATUS,
      ID,
    });
    this.CREATED = this.UPDATED = new Date();
  }

  static create(options) {
    return new Evento(options);
  }
}

export const agenda = async (msg = {}, adm) => {
  try {
    const eventos = [];

    try {
      const url =
        "https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW";

      const headers = {
        Cookie: msg.settings.cookies,
        __antixsrftoken:
          msg.settings.cookies.match(/__AntiXsrfToken=([^;]+)/i)?.[1] || "",
        Accept: "application/json",
        "Content-Type": "application/json; charset=UTF-8",
      };

      const body = JSON.stringify({
        codigoTipoEvento: null,
        codigoEmpresa: adm.UNIDADE_COD,
        codigoEstabelecimento: null,
        data1: "01/10/2024",
        data2: "30/12/2024",
        listaStatus: "3,4",
        config: {
          sEcho: 1,
          iDisplayStart: 0,
          iDisplayLength: 100,
          sSearch: "",
          iSortCol: 0,
          sSortDir: "asc",
        },
      });

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data?.d?.aaData && response.ok) {
        data.d.aaData.forEach(
          ([DATA, SEMANA, HORA, GRUPO, IGREJA, , STATUS, ID]) => {
            eventos.push({
              EVENTO: "Secretaria",
              GRUPO,
              DATA: new Date(
                `${DATA.split("/").reverse().join("-")} ${HORA.split(
                  "-"
                )[0].trim()}:00-03:00`
              ).toISOString(),
              IGREJA,
              OBSERVACOES: `${SEMANA}: ${HORA}`,
              STATUS: STATUS.replace(/<\/?[^>]+>/gi, ""),
              ID,
            });
          }
        );
      }
    } catch (erro) {
      console.warn("Erro ao obter Eventos: ", erro);
    }

    eventos.forEach((e) => {
      msg.tables.eventos.push(Evento.create(e));
    });
    return eventos;
  } catch (error) {
    console.log("Erro ao processar coletas: ", error);
    throw new Error(error.message);
  }
};

async function fetchData() {
  const url = "https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW";
  const cookies =
    "ASP.NET_SessionId=elh0y4dmkmja0mszwsqe0kku; __AntiXsrfToken=99c7b5fab1eb4ae497991833e55b1f63";
  const antiXsrfToken = "99c7b5fab1eb4ae497991833e55b1f63";

  const headers = {
    Cookie: cookies,
    __antixsrftoken: antiXsrfToken,
    Accept: "application/json",
    "Content-Type": "application/json; charset=UTF-8",
  };

  const body = JSON.stringify({
    codigoTipoEvento: null,
    codigoEmpresa: 125,
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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData();

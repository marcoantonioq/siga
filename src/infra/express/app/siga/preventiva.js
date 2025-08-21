import ky from "ky";

const request = ky.create({ retry: { limit: 5 }, timeout: 60000 });

export async function preventiva({ auth, date1, date2 }) {
  console.log("Dados para processar: ", auth.token.length, date1, date2);
  
  try {
    const response = await request.post(
      "https://siga-api.congregacao.org.br/api/mnt/mnt003/dados/tabela",
      {
        json: {
          filtro: {
            codigoTipoChecklist: null,
            codigoEstabelecimento: null,
            dataIni: date1,
            dataFim: date2,
            status: [0, 3],
            pesquisaRapida: "",
          },
          paginacao: null,
        },
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
      }
    ).json();
    const todos = response.dados || [];
    console.log(`\nTotal preventiva coletado: ${todos.length} registros\n`);
    return todos;
  } catch (error) {
    console.error("Erro na requisição preventiva:", error.message);
    return [];
  }
}
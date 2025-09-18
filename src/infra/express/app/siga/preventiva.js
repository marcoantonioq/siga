import ky from "ky";
import { executeKyRequest } from "../../../http/executeKyRequest.js";

const request = ky.create({ retry: { limit: 5 }, timeout: 60000 });

export async function preventiva({ auth, date1, date2 }) {
  try {
    const response = await executeKyRequest(() => request.post(
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
        },
      }
    ).json());
    const todos = response.dados || [];
    return todos;
  } catch (error) {
    console.error("Erro na requisição preventiva:", error.message);
    return [];
  }
}
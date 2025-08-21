import ky from "ky";

const request = ky.create({ retry: { limit: 5 }, timeout: 60000 });

export async function preventiva({auth, _igreja, date1, date2}) {
  try {
    let pagina = 0;
    const tamanho = 100; 
    const todos = [];

    while (true) {
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
            paginacao: {
              paginaAtual: pagina,
              quantidadePorPagina: tamanho,
              ordenarPor: null,
              ordenarDirecao: null,
            },
          },
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
          },
        }
      ).json();

      const registros = response.dados || [];

      if (!registros.length) break; 
      todos.push(...registros);

      console.log(
        `Página ${pagina} carregada com ${registros.length} registros`
      );

      if (registros.length < tamanho) break; 
      pagina++;
    }
    console.log(`\nTotal preventiva coletado: ${todos.length} registros\n`);
    return todos;
  } catch (error) {
    console.error("Erro na requisição preventiva:", error.message);
    return [];
  }
}
export function betweenDates(dataInicial, dataFinal) {
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
}

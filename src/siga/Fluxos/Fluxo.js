export class Fluxo {
  constructor({
    FLUXO = "Saída",
    REGIONAL = "",
    IGREJA = "",
    IGREJA_ADM = "",
    IGREJA_COD = "",
    IGREJA_TIPO = "",
    IGREJA_DESC = "",
    CATEGORIA = "",
    DATA = "",
    VALOR = 0,
    OBSERVACOES = "",
    ORIGEM = "Siga",
    REF = "",
    CREATED = new Date(),
  }) {
    Object.assign(this, {
      FLUXO,
      REGIONAL,
      IGREJA,
      IGREJA_ADM,
      IGREJA_COD,
      IGREJA_TIPO,
      IGREJA_DESC,
      CATEGORIA,
      DATA,
      VALOR,
      OBSERVACOES,
      ORIGEM,
      REF,
      CREATED,
      UPDATED: new Date(),
    });
  }

  static create(options) {
    return new Fluxo(options);
  }
}

export default Fluxo;

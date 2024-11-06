/**
 * @typedef {'Saída' | 'Entrada' | 'Oferta'} FluxoTipo
 */

/**
 * @typedef {Object} FluxoData
 * @property {FluxoTipo} FLUXO
 * @property {string} REGIONAL
 * @property {string} IGREJA
 * @property {string} IGREJA_ADM
 * @property {string} IGREJA_COD
 * @property {string} IGREJA_TIPO
 * @property {string} IGREJA_DESC
 * @property {string} CATEGORIA
 * @property {string} DATA
 * @property {number} VALOR
 * @property {string} OBSERVACOES
 * @property {string} ORIGEM
 * @property {string} REF
 */

export class Fluxo {
  /**
   * Cria uma instância de Fluxo.
   * @param {FluxoData} options - As opções para configurar o fluxo.
   */
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
    this.FLUXO = FLUXO;
    this.REGIONAL = REGIONAL;
    this.IGREJA = IGREJA;
    this.IGREJA_ADM = IGREJA_ADM;
    this.IGREJA_COD = IGREJA_COD;
    this.IGREJA_TIPO = IGREJA_TIPO;
    this.IGREJA_DESC = IGREJA_DESC;
    this.CATEGORIA = CATEGORIA;
    this.DATA = DATA;
    this.VALOR = VALOR;
    this.OBSERVACOES = OBSERVACOES;
    this.ORIGEM = ORIGEM;
    this.REF = REF;
    this.CREATED = CREATED;
    this.UPDATED = new Date();
  }

  /**
   * Cria uma nova instância de Fluxo com as opções fornecidas.
   * @param {FluxoData} options - As opções para configurar o fluxo.
   * @returns {Fluxo} Uma nova instância de Fluxo.
   */
  static create(options) {
    return new Fluxo(options);
  }
}

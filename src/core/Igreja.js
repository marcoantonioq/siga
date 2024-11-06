/**
 * @typedef {Object} IgrejaData
 * @property {string} IGREJA - Código da igreja
 * @property {number} IGREJA_COD - Código da igreja
 * @property {string} IGREJA_DESC - Descrição da igreja
 * @property {number} IGREJA_TIPO - Tipo da igreja
 * @property {string} IGREJA_ADM - Igreja administradora
 * @property {string} REGIONAL - Regional a que a igreja pertence
 * @property {string} CATEGORIA - Categoria da igreja
 * @property {number} UNIDADE_COD - Código da unidade
 * @property {number} MEMBROS - Membros
 */

export class Igreja {
  /**
   * Cria uma instância de Igreja.
   * @param {IgrejaData} options - As opções para configurar a igreja.
   */

  constructor({
    IGREJA = '',
    IGREJA_COD = 0,
    IGREJA_DESC = '',
    IGREJA_TIPO = 0,
    IGREJA_ADM = '',
    REGIONAL = '',
    CATEGORIA = '',
    UNIDADE_COD = 0,
    MEMBROS = 0,
    CREATED = new Date(),
  } = {}) {
    Object.assign(this, {
      IGREJA,
      IGREJA_COD,
      IGREJA_DESC,
      IGREJA_TIPO,
      IGREJA_ADM,
      REGIONAL,
      CATEGORIA,
      UNIDADE_COD,
      MEMBROS,
      CREATED,
      UPDATED: new Date(),
    })
  }

  /**
   * Cria uma nova instância de Igreja.
   * @param {IgrejaData} options - As opções para configurar a igreja.
   * @returns {Igreja} Uma nova instância de Igreja.
   */
  static create(options) {
    return new Igreja(options)
  }
}

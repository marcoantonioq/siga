/**
 * @typedef {'Secretaria' | 'Contabilidade Competências' | 'Fechamentos'} EventoTipo
 */

/**
 * @typedef {Object} EventoData
 * @property {EventoTipo} EVENTO - O tipo de evento, ex: "Secretaria".
 * @property {string} GRUPO - O grupo relacionado ao evento.
 * @property {Date} DATA - Data e hora do evento.
 * @property {string} IGREJA - Nome da igreja.
 * @property {string} OBSERVACOES - Observações sobre o evento.
 * @property {string} STATUS - O status do evento.
 * @property {string} ID - Identificador do evento.
 * @property {string} IGREJA_DESC - Descrição adicional da igreja.
 */

export class Evento {
  /**
   * Cria uma instância de Evento.
   * @param {EventoData} options - As opções para configurar o evento.
   */
  constructor({
    EVENTO,
    GRUPO = '',
    DATA = new Date(),
    IGREJA = '',
    IGREJA_DESC = '',
    OBSERVACOES = '',
    STATUS = '',
    ID = '',
  }) {
    this.EVENTO = EVENTO;
    this.GRUPO = GRUPO;
    this.DATA = DATA;
    this.IGREJA = IGREJA;
    this.IGREJA_DESC = IGREJA_DESC;
    this.OBSERVACOES = OBSERVACOES;
    this.STATUS = STATUS;
    this.ID = ID;
    this.CREATED = new Date();
    this.UPDATED = new Date();
  }

  /**
   * Cria uma nova instância de Evento com as opções fornecidas.
   * @param {EventoData} options - As opções para configurar o evento.
   * @returns {Evento} Uma nova instância de Evento.
   */
  static create(options) {
    return new Evento(options);
  }
}

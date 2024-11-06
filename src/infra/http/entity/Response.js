/**
 * @typedef {Object} ResponseHeaders
 * @property {string} [Content-Type] - Tipo de conteúdo da resposta, ex: 'application/json'.
 * @property {string} [Content-Length] - Tamanho do conteúdo em bytes.
 * @property {string} [Cache-Control] - Diretrizes de cache.
 * @property {string} [Authorization] - Cabeçalho de autenticação.
 * @property {string} [X-Custom-Header] - Cabeçalho personalizado.
 */

/**
 * @typedef {Object} ResponseData
 * @property {number} [code] - Código de status da resposta HTTP, ex: 200, 404, 500.
 * @property {any} [data] - O corpo da resposta, pode ser qualquer tipo de dado.
 * @property {string} [type] - Tipo da resposta, ex: 'json', 'text', 'blob'.
 * @property {Uint8Array} [blobBytes] - Dados em forma de bytes para respostas de blob.
 * @property {ResponseHeaders} [headers={}] - Cabeçalhos da resposta.
 */

export class Response {
  /**
   * Cria uma instância de Response.
   * @param {ResponseData} options - As opções para configurar a resposta.
   */
  constructor({
    code = null,
    data = null,
    type = null,
    blobBytes = null,
    headers = {},
  } = {}) {
    this.code = code;
    this.data = data;
    this.type = type;
    this.blobBytes = blobBytes;
    this.headers = headers;
  }

  /**
   * Cria uma nova instância de Response com as opções fornecidas.
   * @param {ResponseData} options - As opções para configurar a resposta.
   * @returns {Response} Uma nova instância de Response.
   */
  static create(options) {
    return new Response(options);
  }
}
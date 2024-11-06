/**
 * @typedef {Object} RequestData
 * @property {string} url - A URL para a requisição.
 * @property {RequestHeaders} [headers={}] - Cabeçalhos opcionais para a requisição.
 * @property {'get' | 'post'} [method='GET'] - O método HTTP da requisição.
 * @property {any} [data=null] - O corpo da requisição.
 * @property {number} [timeout=5000] - O tempo limite para a requisição em milissegundos.
 */

/**
 * @typedef {Object} RequestHeaders
 * @property {string} [Authorization] - Cabeçalho de autenticação, ex: 'Bearer token'.
 * @property {string} [Content-Type] - Tipo de conteúdo, ex: 'application/json'.
 * @property {string} [Accept] - Tipos de resposta aceitos, ex: 'application/json'.
 * @property {string} [User-Agent] - Informações do cliente, ex: 'Mozilla/5.0'.
 * @property {string} [Cache-Control] - Diretrizes de cache, ex: 'no-cache'.
 * @property {string} [X-Custom-Header] - Cabeçalho personalizado.
 */

export class Request {
  /**
   * Cria uma instância de Request.
   * @param {RequestData} options - As opções para configurar a requisição.
   */
  constructor({
    url,
    headers = {
      "Content-Type": "application/json",
    },
    method = "get",
    data = null,
    timeout = 5000,
  }) {
    if (method !== "get" && method !== "post") {
      throw new Error('Método inválido. Use "GET" ou "POST".');
    }

    this.url = url;
    this.headers = headers;
    this.method = method;
    this.data = data;
    this.timeout = timeout;
  }

  /**
   * Cria um novo objeto Request com as opções fornecidas.
   * @param {RequestData} options - As opções para configurar a requisição.
   * @returns {Request} Uma nova instância de Request.
   */
  static create(options) {
    return new Request(options);
  }
}

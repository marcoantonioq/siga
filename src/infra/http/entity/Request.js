/**
 * @typedef {Object} RequestData
 * @property {string} url - A URL para a requisição.
 * @property {RequestHeaders} [headers={}] - Cabeçalhos opcionais para a requisição.
 * @property {'get' | 'post'} [method='get'] - O método HTTP da requisição.
 * @property {any} [data=null] - O corpo da requisição.
 * @property {number} [timeout=5000] - O tempo limite para a requisição em milissegundos.
 */

/**
 * @typedef {Object} RequestHeaders
 * @property {string} [Authorization] - Cabeçalho de autenticação, ex: 'Bearer token'.
 * @property {string} [Cookie] - Cookie de navegação
 * @property {string} [__antixsrftoken] - Siga antiToken
 * @property {string} [Content-Type] - Tipo de conteúdo, ex: 'application/json'.
 * @property {string} [Accept] - Tipos de resposta aceitos, ex: 'application/json'.
 * @property {string} [User-Agent] - Informações do cliente, ex: 'Mozilla/5.0'.
 * @property {string} [Cache-Control] - Diretrizes de cache, ex: 'no-cache'.
 * @property {string} [X-Custom-Header] - Cabeçalho personalizado.
 */

export class Request {
  /**
   * Cria uma instância de Request.
   * @param {Partial<RequestData>} options - As opções para configurar a requisição.
   */
  constructor({
    url,
    headers = {},
    method = 'get',
    data = null,
    timeout = 5000,
  }) {
    if (!url) {
      throw new Error('A URL é obrigatória.');
    }

    if (method !== 'get' && method !== 'post') {
      throw new Error('Método inválido. Use "get" ou "post".');
    }

    // Inicializando os valores
    this.url = url;
    this.headers = headers;
    this.method = method;
    this.data = data;
    this.timeout = timeout;
  }

  /**
   * Cria um novo objeto Request com as opções fornecidas.
   * @param {Partial<Request>} options - As opções para configurar a requisição.
   * @returns {Request} Uma nova instância de Request.
   */
  static create(options) {
    return new Request(options);
  }

  /**
   * Método para validar se a URL é válida.
   * @returns {boolean} True se a URL for válida, caso contrário, false.
   */
  isValidUrl() {
    try {
      new URL(this.url); // Tentando criar um novo objeto URL.
      return true;
    } catch (e) {
      return false;
    }
  }
}

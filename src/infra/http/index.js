import * as Cheerio from 'cheerio';
import { ClientHttpServer } from './drivers/ClientHttpServer.js';
import { Request } from './entity/Request.js';
import { Response } from './entity/Response.js';

export class HTTPClient {
  #server;
  #pageLogin;
  #username;
  constructor({ cookie }) {
    this.#server = new ClientHttpServer({ cookie });
  }

  get username() {
    return this.#username;
  }

  async login() {
    if (this.#pageLogin) {
      return this.#pageLogin;
    }

    var result = await this.#server.fetch({
      url: 'https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S',
    });

    const $ = Cheerio.load(result.data);

    const dialogManutencao = $('body .modal-dialog')
      .filter((_, e) => $(e).text().includes('em manutenção'))
      .text()
      .trim();

    if (dialogManutencao) {
      throw new Error(dialogManutencao);
    }

    if (
      result.data &&
      /(Lembrar meu email\/usuário|acesso ao SIGA para enviarmos um e-mail com uma senha provisória|..\/index.aspx)/gi.test(
        result.data
      )
    ) {
      throw new Error(
        'Você não está logado! Acesse o portal administrativo para enviar o cookie de autenticação...'
      );
    }

    const usuarioMatch = result.data.match(
      /<input[^>]*name="f_usuario"[^>]*value="([^"]*)"/
    );

    if (!usuarioMatch) {
      throw new Error('Não foi possível encontrar o valor do usuário.');
    }

    console.info('>>> ### Bem vindo(a) ' + usuarioMatch[1]);
    this.#pageLogin = result.data;
    this.#username = usuarioMatch[1];

    return this.#pageLogin;
  }

  async validaPeriodo(data1, data2) {
    try {
      const request = {
        url: 'https://siga.congregacao.org.br/UTIL/UtilWS.asmx/ValidaPeriodo',
        method: 'post',
        'Content-Type': 'application/json',
        data: {
          f_data1: data1.split('T')[0].split('-').reverse().join('/'),
          f_data2: data2.split('T')[0].split('-').reverse().join('/'),
          l_data1: 'Data Inicial',
          l_data2: 'Data Final',
        },
      };
      await this.#server.fetch(request);
      return true;
    } catch (error) {
      console.warn('Erro ao validar data: ', data1, data2, error);
      return false;
    }
  }

  /**
   * Realiza uma ou mais requisições HTTP.
   * @param {Request} request - Instância ou array de instâncias de Request.
   * @returns {Promise<Response>} - Array de respostas.
   */
  async fetch(request) {
    return await this.#server.fetch(Request.create(request));
  }
}

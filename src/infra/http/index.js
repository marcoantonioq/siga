import * as Cheerio from 'cheerio';
import { ClientHttpServer } from './drivers/ClientHttpServer.js';
import { Request } from './entity/Request.js';
import { Response } from './entity/Response.js';
import PuppeteerManager from '../puppeteer/index.js';

export class HTTPClient {
  #server;
  #pageLogin;
  #username;
  #token;
  #cookie;
  constructor({ cookie }) {
    this.#server = new ClientHttpServer({ cookie });
    this.#cookie = cookie;
  }

  get username() {
    return this.#username;
  }

  get token() {
    return this.#token;
  }

  get cookie() {
    return this.#cookie;
  }

  async login() {
    if (this.#pageLogin) {
      return this.#pageLogin;
    }

    /**
     * Gerar token de acesso
     */
    const page = await PuppeteerManager.createPage({
      cookies: this.#cookie,
      domain: 'siga.congregacao.org.br',
    });

    await page.goto(
      'https://siga.congregacao.org.br/page.aspx?loadPage=/SIS/SIS99908.aspx',
      {
        waitUntil: 'networkidle0',
      }
    );
    await page.goto(
      'https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S',
      {
        waitUntil: 'networkidle0',
      }
    );
    this.#token = await page.evaluate(() =>
      window.localStorage.getItem('ccbsiga-token-api')
    );

    // console.log('Token gerado: ', this.#token);
    page.close();

    /**
     * Acessar pagina inicial
     */
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
        'Você não está logado no SIGA. Acesse sua conta e insira um cookie de autenticação válido neste formulário para continuar...'
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
      await this.#server.fetch({
        url: 'https://siga.congregacao.org.br/UTIL/UtilWS.asmx/ValidaPeriodo',
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          f_data1: data1.split('T')[0].split('-').reverse().join('/'),
          f_data2: data2.split('T')[0].split('-').reverse().join('/'),
          l_data1: 'Data Inicial',
          l_data2: 'Data Final',
        },
      });
      return true;
    } catch (error) {
      console.warn('Erro ao validar data: ', data1, data2, error);
      return false;
    }
  }

  /**
   * Realiza uma ou mais requisições HTTP.
   * @param {Partial<Request>} request - Instância ou array de instâncias de Request.
   * @returns {Promise<Response>} - Array de respostas.
   */
  async fetch(request) {
    if (request.url) {
      return await this.#server.fetch(Request.create(request));
    }
  }
}

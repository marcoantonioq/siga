import * as cheerio from 'cheerio';
import { Igreja } from '../core/Igreja.js';
import { HTTPClient } from '../infra/http/index.js';

/**
 * Classe para gerenciar um repositório de objetos Fluxo.
 */
export class IgrejasRepo {
  #client;
  /**
   * Construtor da classe FluxoRepo.
   * @param {Igreja[]} [igreja=[]] - Um array opcional de objetos Fluxo
   * @param {HTTPClient} client - Um objeto HTTPClient para realizar requisições.
   */
  constructor(igreja = [], client) {
    this.igrejas = igreja;
    this.#client = client;
  }

  async getIgrejas() {
    const empresas = [];
    const igrejas = [];
    const optgroupRegex = /<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g;
    let optgroupMatch;

    const data = await this.#client.login(this.cookie);

    while ((optgroupMatch = optgroupRegex.exec(data)) !== null) {
      const label = optgroupMatch[1];
      const options = optgroupMatch[2];
      const optionRegex =
        /<option value="(\d+)"[^>]*>\s*([^<]+)\s*<\/option>/gs;
      let optionMatch;

      while ((optionMatch = optionRegex.exec(options)) !== null) {
        empresas.push({
          regional: label,
          type: 'EMPRESA',
          id: Number(optionMatch[1]),
          description: optionMatch[2].trim(),
        });
      }
    }

    const results = await Promise.all(
      empresas.map(async (e) => {
        try {
          return this.#client.fetch({
            url: 'https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso',
            method: 'post',
            data: { codigoEmpresa: e.id },
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
            },
          });
        } catch (error) {
          console.log('Erro:: ', error);
        }
      })
    );
    results.map(({ data }) => {
      const values = JSON.parse(data);
      values.d.map((e) => {
        const emp = empresas.find((emp) => emp.id === e['CodigoEmpresa']);
        igrejas.push(
          Igreja.create({
            IGREJA_COD: e['Codigo'],
            IGREJA: e['Nome'],
            IGREJA_DESC: e['NomeExibicao'],
            IGREJA_TIPO: e['CodigoTipoEstabelecimento'],
            IGREJA_ADM: emp.description,
            REGIONAL: emp.regional,
            UNIDADE_COD: e['CodigoEmpresa'],
            MEMBROS: 0,
          })
        );
      });
    });

    return igrejas;
  }

  async getRegionais() {
    const result = await this.#client.fetch({
      url: 'https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarRegionaisEAdministracoes',
    });
    console.log('Result::', JSON.stringify(JSON.parse(result.data), null, 2));
  }

  async alterarIgreja(unidade, estabelecimento) {
    const { data: htmlAlterar } = await this.#client.fetch({
      url: 'https://siga.congregacao.org.br/SIS/SIS99906.aspx',
    });
    const $ = cheerio.load(htmlAlterar);
    const usuario = $('input[id^="f_usuario_"]').val();

    const { data: competencias } = await this.#client.fetch({
      url: 'https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias',
      method: 'post',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      data: { codigoEmpresa: unidade },
    });

    const competencia = JSON.parse(competencias)?.d[0]?.Codigo;

    await this.#client.fetch({
      url: 'https://siga.congregacao.org.br/SIS/SIS99906.aspx',
      method: 'post',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      data: {
        gravar: 'S',
        f_usuario: usuario,
        f_empresa: String(unidade),
        f_estabelecimento: String(estabelecimento),
        f_competencia: competencia,
        __jqSubmit__: 'S',
      },
    });
  }
}

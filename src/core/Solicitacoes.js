
/**
 * @typedef {Object} SolicitacoesData
 * @property {number} codigo - Código da solicitação.
 * @property {string} dataSolicitacao - Data da solicitação.
 * @property {number} codigoAdministracao - Código da administração.
 * @property {string} administracao - Nome da administração.
 * @property {string} nomeExibicao - Nome para exibição.
 * @property {number} codigoTipoSolicitacaoAlteracao - Código do tipo de solicitação de alteração.
 * @property {number} codigoMotivoSolicitacaoAlteracao - Código do motivo da solicitação de alteração.
 * @property {string} motivoSolicitacaoAlteracao - Motivo da solicitação de alteração.
 * @property {string} nomeMinisterioCargo - Nome do ministério/cargo.
 * @property {string} statusCadastro - Status do cadastro.
 * @property {number} codigoStatusSolicitacao - Código do status da solicitação.
 * @property {number} codigoStatusSolicitacaoAlteracao - Código do status da solicitação de alteração.
 * @property {boolean} liberaBotaoAprovar - Libera botão aprovar.
 * @property {boolean} liberaBotaoProcessar - Libera botão processar.
 */

export class Solicitacoes {
  /**
   * Cria uma instância de Solicitacoes.
   * @param {SolicitacoesData} options - As opções para configurar a solicitação.
   */
  constructor({
    codigo,
    dataSolicitacao,
    codigoAdministracao,
    administracao,
    nomeExibicao,
    codigoTipoSolicitacaoAlteracao,
    codigoMotivoSolicitacaoAlteracao,
    motivoSolicitacaoAlteracao,
    nomeMinisterioCargo,
    statusCadastro,
    codigoStatusSolicitacao,
    codigoStatusSolicitacaoAlteracao,
    liberaBotaoAprovar,
    liberaBotaoProcessar,
  }) {
    this.codigo = codigo;
    this.dataSolicitacao = new Date(dataSolicitacao);
    this.codigoAdministracao = codigoAdministracao;
    this.administracao = administracao;
    this.nomeExibicao = nomeExibicao;
    this.codigoTipoSolicitacaoAlteracao = codigoTipoSolicitacaoAlteracao;
    this.codigoMotivoSolicitacaoAlteracao = codigoMotivoSolicitacaoAlteracao;
    this.motivoSolicitacaoAlteracao = motivoSolicitacaoAlteracao;
    this.nomeMinisterioCargo = nomeMinisterioCargo;
    this.statusCadastro = statusCadastro;
    this.codigoStatusSolicitacao = codigoStatusSolicitacao;
    this.codigoStatusSolicitacaoAlteracao = codigoStatusSolicitacaoAlteracao;
    this.liberaBotaoAprovar = liberaBotaoAprovar;
    this.liberaBotaoProcessar = liberaBotaoProcessar;
  }

  /**
   * Cria uma nova instância de Solicitacoes com as opções fornecidas.
   * @param {SolicitacoesData} options - As opções para configurar a solicitação.
   * @returns {Solicitacoes} Uma nova instância de Solicitacoes.
   */
  static create(options) {
    return new Solicitacoes(options);
  }
}
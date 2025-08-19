/**
 * @typedef {Object} DadosData
 * @property {number} codigoServo - Código do servo.
 * @property {number} codigoRelac - Código de relação do servo.
 * @property {string} nome - Nome do servo.
 * @property {string} dataOrdenacaoServo - Data de ordenação do servo.
 * @property {string} ministerioCargo - Cargo do ministério.
 * @property {string} nomeIgreja - Nome da igreja.
 * @property {string} codigoAdm - Código da administração.
 * @property {string} nomeAdministracao - Nome da administração.
 * @property {string} documento - Documento do servo (ex: CPF).
 * @property {string} codigoRrm - Código da regional.
 * @property {string} nomeRrm - Nome da regional.
 * @property {string} pais - País do servo.
 * @property {string} estado - Estado do servo.
 * @property {string} cidade - Cidade do servo.
 * @property {boolean} aprovadorRrm - Indica se é aprovador RRM.
 * @property {number} statusCadastroCompleto - Status do cadastro.
 * @property {boolean} ativo - Indica se o servo está ativo.
 * @property {boolean} indicadorFoto - Indica se possui foto.
 * @property {string} sexo - Sexo do servo.
 * @property {string|null} fotoUrl - URL da foto.
 * @property {string} regional - Regional do servo.
 * @property {string} dataApresentacao - Data de apresentação do servo.
 * @property {string|null} dataVencimentoMandato - Data de vencimento do mandato.
 * @property {boolean} administrador - Indica se é administrador.
 * @property {string} nomeRA - Nome da Região Administrativa (RA).
 * @property {string} cargo - Cargo do servo.
 * @property {number} statusMandato - Status do mandato do servo.
 * @property {boolean} qsa - Indica se pertence ao quadro societário administrativo.
 * @property {string} dataBatismo - Data de batismo do servo.
 * @property {string} dataNascimento - Data de nascimento do servo.
 * @property {string} telefoneCasa - Número de telefone da casa.
 * @property {string} telefoneCelular - Número de telefone celular.
 * @property {string} telefoneTrabalho - Número de telefone do trabalho.
 * @property {string} telefoneRecado - Número de telefone para recados.
 * @property {string} endereco - Endereço do servo.
 * @property {string} bairro - Bairro do servo.
 * @property {string} cidade - Cidade do servo.
 * @property {string} cep - CEP do servo.
 * @property {string} email1 - E-mail 1 do servo.
 * @property {string} email2 - E-mail 2 do servo.
 */

export class Dados {
  /**
   * Cria uma instância de Dados.
   * @param {DadosData} options - As opções para configurar o servo.
   */
  constructor({
    codigoServo,
    codigoRelac,
    nome,
    dataOrdenacaoServo,
    ministerioCargo,
    nomeIgreja,
    codigoAdm,
    nomeAdministracao,
    documento,
    codigoRrm,
    nomeRrm,
    pais,
    estado,
    cidade,
    aprovadorRrm,
    statusCadastroCompleto,
    ativo,
    indicadorFoto,
    sexo,
    fotoUrl = null,
    regional = '',
    dataApresentacao,
    dataVencimentoMandato = null,
    administrador = false,
    nomeRA,
    cargo,
    statusMandato = 0,
    qsa = false,
    dataBatismo = '',
    dataNascimento = '',
    telefoneCasa = '',
    telefoneCelular = '',
    telefoneTrabalho = '',
    telefoneRecado = '',
    endereco = '',
    bairro = '',
    cep = '',
    email1 = '',
    email2 = '',
  }) {
    this.codigoServo = codigoServo;
    this.codigoRelac = codigoRelac;
    this.nome = nome;
    this.dataOrdenacaoServo = new Date(dataOrdenacaoServo);
    this.ministerioCargo = ministerioCargo;
    this.nomeIgreja = nomeIgreja;
    this.codigoAdm = codigoAdm;
    this.nomeAdministracao = nomeAdministracao;
    this.documento = documento;
    this.codigoRrm = codigoRrm;
    this.nomeRrm = nomeRrm;
    this.pais = pais;
    this.estado = estado;
    this.cidade = cidade;
    this.aprovadorRrm = aprovadorRrm;
    this.statusCadastroCompleto = statusCadastroCompleto;
    this.ativo = ativo;
    this.indicadorFoto = indicadorFoto;
    this.sexo = sexo;
    this.fotoUrl = fotoUrl;
    this.regional = regional;
    this.dataApresentacao = new Date(dataApresentacao);
    this.dataVencimentoMandato = dataVencimentoMandato
      ? new Date(dataVencimentoMandato)
      : null;
    this.administrador = administrador;
    this.nomeRA = nomeRA;
    this.cargo = cargo;
    this.statusMandato = statusMandato;
    this.qsa = qsa;
    this.dataBatismo = dataBatismo ? new Date(dataBatismo) : '';
    this.dataNascimento = dataNascimento ? new Date(dataNascimento) : '';
    this.telefoneCasa = telefoneCasa;
    this.telefoneCelular = telefoneCelular;
    this.telefoneTrabalho = telefoneTrabalho;
    this.telefoneRecado = telefoneRecado;
    this.endereco = endereco;
    this.bairro = bairro;
    this.cep = cep;
    this.email1 = email1;
    this.email2 = email2;
    this.eventos = [];
  }

  /**
   * Cria uma nova instância de Dados com as opções fornecidas.
   * @param {DadosData} options - As opções para configurar o servo.
   * @returns {Dados} Uma nova instância de Dados.
   */
  static create(options) {
    return new Dados(options);
  }
}

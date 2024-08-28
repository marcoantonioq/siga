
(function (global) {
  // Define o objeto SIGA
  const SIGA = {
    username: "",
    currentIgreja: null,
    cookie: "",
    loading: false,
    error: null,
    igrejas: [],
    fluxos: [],
    eventos: [],
    competencias: [],

  };
  // Exponha o SIGA globalmente
  global.SIGA = SIGA;
})(document);
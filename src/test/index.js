import fetch from 'node-fetch'
import FormData from 'form-data'

const formData = new FormData()
formData.append('gravar', 'S')
formData.append('f_usuario', 'MARCO ANTONIO QUEIROZ')
formData.append('f_empresa', '168')
formData.append('f_estabelecimento', '370')
formData.append('f_competencia', '7B3D0FCE-9262-4EEA-86AA-B80F7368A9FD')
formData.append('__jqSubmit__', 'S')

fetch('https://siga.congregacao.org.br/SIS/SIS99906.aspx', {
  method: 'post',
  headers: {
    ...formData.getHeaders(),
    Cookie:
      'ApplicationGatewayAffinityCORS=15c6cdc3c6fb5853e4e82094c05f447b; ApplicationGatewayAffinity=15c6cdc3c6fb5853e4e82094c05f447b; ASP.NET_SessionId=2cs1v4ywakctrs5mpwz4dlhu; remember=true; __AntiXsrfToken=99b2093cf5e94287a1b46c18f016e07a; ai_user=1KHpHCtFyN+lNzQnstGQK3|2024-08-08T23:41:27.031Z; sigaTrustedDevice=94129; user=marco.queiroz; ai_session=SvafqgZYXWtLyw3VVhgnWe|1730930223541|1730930787672',
  },
  body: formData,
})

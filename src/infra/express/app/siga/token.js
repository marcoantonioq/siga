import ky from 'ky';

const request = ky.create({ retry: { limit: 5 }, timeout: 60000 });

export async function token({ cookies }) {
  try {
    const html = await request
      .get(
        'https://siga.congregacao.org.br/page.aspx?loadPage=/SIS/SIS99908.aspx?f_inicio=S',
        {
          headers: {
            Cookie: cookies,
          },
        }
      )
      .text();

    const regex =
      /window\.localStorage\.setItem\("ccbsiga-token-api", '(.+?)'\);/s;
    const match = html.match(regex);

    if (match && match[1]) {
      const token = match[1];
      console.log('Cookies recebidos:', cookies);
      console.log('Token encontrado:', token);

      return token;
    } else {
      console.log('Token não encontrado.');
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição preventiva:', error.message);
    return null;
  }
}

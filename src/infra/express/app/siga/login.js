import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

export async function login(cookies, domain = 'siga.congregacao.org.br') {
  if (!cookies) {
    throw new Error('Usuário cookie inválido!');
  }

  let usernameFromCookie = cookies.match(/(;| )(user)=([^;]*)/i)?.[3];

  let randomUsername = false;
  if (!usernameFromCookie) {
    usernameFromCookie = Math.random().toString(36).slice(2);
    randomUsername = true;
  }

  const result = {
    success: false,
    data: {
      cookies,
      username: usernameFromCookie,
      token: '',
      antixsrftoken: '',
      page: '',
    },
    message: 'Falha ao logar.',
  };

  result.data.antixsrftoken =
    cookies.match(/__AntiXsrfToken=([^;]+)/i)?.[1] || '';

  const userDir = path.join('user_data', result.data.username);

  const browser = await puppeteer.launch({
    headless: true || process.env.NODE_ENV === 'production',
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-infobars',
      '--window-size=1280,800',
      '--disable-extensions',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--allow-insecure-localhost',
    ],
    userDataDir: userDir,
  });

  let page;
  try {
    page = await browser.newPage();
    page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      if (
        ['image', 'stylesheet', 'font', 'script'].includes(resourceType) ||
        url.match(/\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|otf|eot|css|js)(\?|$)/i)
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });
    try {
      const parsedCookies = cookies.split(';').map((c) => {
        const [name, value] = c.split('=');
        return { name: name.trim(), value: value?.trim(), domain, path: '/' };
      });
      await page.setCookie(...parsedCookies);
    } catch (error) {
      throw new Error('Erro ao configurar cookies:' + error.message);
    }

    await page.goto(
      'https://siga.congregacao.org.br/SIS/SIS99908.aspx',
      {
        timeout: 60000,
        waitUntil: 'networkidle0',
      }
    );
    await page.goto(
      'https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S',
      {
        timeout: 60000,
        waitUntil: 'networkidle0',
      }
    );
    result.data.page = await page.content();

    result.data.token = await page.evaluate(() =>
      window.localStorage.getItem('ccbsiga-token-api')
    );

    result.success = true;
    result.message = 'Login realizado com sucesso.';
  } catch (error) {
    console.error('Erro ao criar diretório do usuário:', userDir, error);
    result.message =
      error.message ||
      'Erro ao acessar o SIGA. Verifique o sistema SIGA ou cookies informados!';
    throw new Error(
      error.message ||
        'Erro ao acessar o SIGA. Verifique o sistema SIGA ou cookies informados!'
    );
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
    await browser.close();
    if (randomUsername) {
      try {
        await fs.rm(userDir, { recursive: true, force: true });
      } catch (err) {
        console.warn('Falha ao remover userDataDir:', userDir, err.message);
      }
    }
  }

  return result;
}

export default login;

import puppeteer from 'puppeteer'

puppeteer.use(StealthPlugin())

const settings = {
  headless: process.env.NODE_ENV === 'production',
}

export const PuppeteerManager = {
  browsers: new Map(),
  timeoutIds: new Map(),

  async createBrowserInstance(cookies) {
    const browser = await puppeteer.launch({
      headless: settings.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        `--disable-infobars`,
        `--window-size=1280,800`,
        `--disable-extensions`,
        `--disable-dev-shm-usage`,
        `--disable-gpu`,
        `--allow-insecure-localhost`,
      ],
    })
    console.log('Navegador iniciado para:', cookies)
    this.browsers.set(cookies, browser)
    return browser
  },

  async getBrowser(user) {
    // Retorna um navegador existente ou cria um novo para o perfil de cookies
    if (!this.browsers.has(user)) {
      const browser = await this.createBrowserInstance(user)
      this.resetCloseTimer(user)
      return browser
    }
    this.resetCloseTimer(user)
    return this.browsers.get(user)
  },

  async createPage({ cookies = '', domain = '' } = {}) {
    const user =
      cookies.match(/(;| )(user)=([^;]*)/i)?.[3] ||
      Math.random().toString(36).slice(2)
    const browser = await this.getBrowser(user)
    const page = await browser.newPage()

    page.setRequestInterception(true)
    page.on('request', (request) => {
      ;['image'].includes(request.resourceType())
        ? request.abort()
        : request.continue()
    })

    if (cookies) {
      const parsedCookies = cookies.split(';').map((c) => {
        const [name, value] = c.split('=')
        return { name: name.trim(), value: value.trim(), domain, path: '/' }
      })
      await page.setCookie(...parsedCookies)
    }

    page.on('close', () => this.onPageClose(user, page))
    return page
  },

  async closeBrowser(user) {
    if (this.browsers.has(user)) {
      const browser = this.browsers.get(user)
      await browser.close()
      this.browsers.delete(user)
      console.log('Navegador fechado para o perfil ', user)
    }
  },

  resetCloseTimer(user) {
    if (this.timeoutIds.has(user)) clearTimeout(this.timeoutIds.get(user))
    this.timeoutIds.set(
      user,
      setTimeout(() => this.closeBrowser(user), 5 * 60 * 1000) // 5 minutos
    )
  },

  onPageClose(cookies, page) {
    const browser = this.browsers.get(cookies)
    if (browser) {
      this.resetCloseTimer(cookies)
    }
  },
}

export default PuppeteerManager

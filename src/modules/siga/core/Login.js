class LoginCore {
  #username = null;
  #cookies = null;
  #token = null;

  constructor() {}

  async authenticate(cookies, username, password) {
    this.#username =
      cookies.match(/(;| )(user)=([^;]*)/i)?.[3] ||
      Math.random().toString(36).slice(2);
    this.#cookies = cookies;
    this.#token = '';
    return true;
  }

  logout() {
    this.#username = null;
    this.#cookies = null;
    this.#token = null;
    return true;
  }

  isAuthenticated() {
    return !!this.#username;
  }

  getCurrentUser() {
    return this.#username;
  }

  getToken() {
    return this.#token;
  }

  getCookie() {
    return this.#cookies;
  }
}

module.exports = LoginCore;

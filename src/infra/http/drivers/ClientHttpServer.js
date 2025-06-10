import { Request } from '../entity/Request.js';
import { Response } from '../entity/Response.js';
import fetch from 'node-fetch';
import FormData from 'form-data';

export class ClientHttpServer {
  #cookie;
  #__antixsrftoken;
  constructor({ cookie = '' }) {
    this.#cookie = cookie;
    this.#__antixsrftoken = cookie.match(/__AntiXsrfToken=([^;]+)/i)?.[1] || '';
    this.error = null;
  }

  /**
   *
   * @param {Partial<Request>} request
   * @returns
   */
  async fetch(request) {
    const result = Response.create({});
    try {
      if (!request.headers) request.headers = {};

      if (
        request?.headers?.['Content-Type']?.includes(
          'application/x-www-form-urlencoded'
        )
      ) {
        const params = new URLSearchParams(request.data);
        if (request.method?.toUpperCase() === 'GET') {
          request.url += `?${params}`;
          delete request.data;
        } else {
          request.data = params;
        }
      } else if (
        request?.headers?.['Content-Type']?.includes('application/json')
      ) {
        request.data = JSON.stringify(request.data);
      } else if (
        request?.headers?.['Content-Type']?.includes('multipart/form-data')
      ) {
        const formData = new FormData();
        for (const [key, value] of Object.entries(request.data)) {
          formData.append(key, value);
        }
        request.headers = {
          ...formData.getHeaders(),
        };
        request.data = formData;
      }

      request.headers.Cookie = this.#cookie;
      if (this.#__antixsrftoken) {
        request.headers.__antixsrftoken = this.#__antixsrftoken;
      }
      const res = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.data,
      });
      process.stdout.write('.');

      result.code = res.status;
      result.type = res.headers.get('content-type') || '';
      result.headers = { ...res.headers };

      if (result.type === 'application/vnd.ms-excel') {
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        result.blobBytes = new Uint8Array(arrayBuffer);
      } else {
        result.data = await res.text();
      }
    } catch (error) {
      console.error('Erro ao realizar fetch:', error);
      this.error = error;
    }
    return result;
  }
}

import { Response } from "../entity/Response.js";

export class ClientHttpServer {
  #cookie;
  #__antixsrftoken;
  constructor({ cookie = "" }) {
    this.#cookie = cookie;
    this.#__antixsrftoken = cookie.match(/__AntiXsrfToken=([^;]+)/i)?.[1] || "";
    this.error = null;
  }

  async fetch(request = Response.create()) {
    const result = Response.create();
    try {
      if (!request.headers) request.headers = {};
      request.headers.Cookie = this.#cookie;

      if (this.#__antixsrftoken) {
        request.headers.__antixsrftoken = this.#__antixsrftoken;
      }

      request.body = request.data;
      delete request.data;

      if (
        request?.headers?.["Content-Type"]?.includes(
          "application/x-www-form-urlencoded"
        )
      ) {
        const params = new URLSearchParams(request.body);
        if (request.method?.toUpperCase() === "GET") {
          request.url += `?${params}`;
          delete request.body;
        } else {
          request.body = params;
        }
      } else if (
        request?.headers?.["Content-Type"]?.includes("multipart/form-data")
      ) {
        const boundary =
          "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        let payload = "";
        for (const [key, value] of Object.entries(options.payload)) {
          payload += `--${boundary}\n`;
          payload += `Content-Disposition: form-data; name="${key}"\n\n`;
          payload += `${value}\n`;
        }
        payload += `--${boundary}--\n`;
        request.body = payload;
      }

      const res = await fetch(request.url, request);

      result.code = res.status;
      result.type = res.headers["content-type"] || "";
      result.headers = res.headers;

      if (result.type === "application/vnd.ms-excel") {
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        result.blobBytes = new Uint8Array(arrayBuffer);
      } else {
        result.data = await res.text();
      }
    } catch (error) {
      console.error("Erro ao realizar fetch:", error);
      this.error = error;
    }
    return result;
  }
}

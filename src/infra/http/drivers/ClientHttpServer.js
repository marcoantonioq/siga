import { Request } from '../entity/Request.js'
import { Response } from '../entity/Response.js'

export class ClientHttpServer {
  #cookie
  #__antixsrftoken
  constructor({ cookie = '' }) {
    this.#cookie = cookie
    this.#__antixsrftoken = cookie.match(/__AntiXsrfToken=([^;]+)/i)?.[1] || ''
    this.error = null
  }

  async fetch(request = Request.create()) {
    const result = Response.create()
    try {
      if (!request.headers) request.headers = {}
      request.headers.Cookie = this.#cookie

      if (this.#__antixsrftoken) {
        request.headers.__antixsrftoken = this.#__antixsrftoken
      }

      if (
        request?.headers?.['Content-Type']?.includes(
          'application/x-www-form-urlencoded'
        )
      ) {
        const params = new URLSearchParams(request.data)
        if (request.method?.toUpperCase() === 'GET') {
          request.url += `?${params}`
          delete request.data
        } else {
          request.data = params
        }
      } else if (
        request?.headers?.['Content-Type']?.includes('application/json')
      ) {
        request.data = JSON.stringify(request.data)
      } else if (
        request?.headers?.['Content-Type']?.includes('multipart/form-data')
      ) {
        const boundary =
          '----WebKitFormBoundary' + Math.random().toString(36).substring(2)
        let payload = ''
        for (const [key, value] of Object.entries(request.data)) {
          payload += `--${boundary}\n`
          payload += `Content-Disposition: form-data; name="${key}"\n\n`
          payload += `${value}\n`
        }
        payload += `--${boundary}--\n`
        request.data = payload
      }

      request.body = request.data

      const res = await fetch(request.url, request)

      result.code = res.status
      result.type = res.headers.get('content-type') || ''
      result.headers = res.headers

      if (result.type === 'application/vnd.ms-excel') {
        const blob = await res.blob()
        const arrayBuffer = await blob.arrayBuffer()
        result.blobBytes = new Uint8Array(arrayBuffer)
      } else {
        result.data = await res.text()
      }
    } catch (error) {
      console.error('Erro ao realizar fetch:', error)
      this.error = error
    }
    return result
  }
}

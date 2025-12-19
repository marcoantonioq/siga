import { HTTPError } from 'ky';


/**
 * Executa uma requisição ky e aprimora a depuração em caso de erro,
 * mostrando informações essenciais como URL, método e status da requisição.
 *
 * @param {Function} requestFunction A função que retorna a promessa da requisição ky.
 * @returns {Promise<Object>} Um objeto com o resultado ou o erro da requisição.
 */
export async function executeKyRequest(requestFunction) {
    try {
        return await requestFunction();
    } catch (error) {
        if (error instanceof HTTPError) {
            const { request, response } = error;
            const url = request.url;
            const method = request.method;
            const status = response.status;
            let errorBody = 'N/A';
            try {
                errorBody = await response.text();
            } catch {}
            const errorMessage = `Erro na requisição! URL: ${url} | Método: ${method} | Status: ${status} | Corpo: ${errorBody.slice(0, 100)}`;
            console.error(errorMessage);
        }
        throw error;
    }
}
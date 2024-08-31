document.getElementById('fetchButton').addEventListener('click', () => {
    const body = {
        gravar: "S",
        f_usuario: "username",
        f_empresa: "empresa",
        f_estabelecimento: "estabelecimento",
        f_competencia: "competencia",
        __jqSubmit__: "S"
    };

    chrome.runtime.sendMessage({
        action: 'fetchData',
        url: 'https://siga.congregacao.org.br/SIS/SIS99906.aspx',
        body
    }, (response) => {
        const output = document.getElementById('responseOutput');
        if (response.success) {
            output.textContent = JSON.stringify(response.data, null, 2);
        } else {
            output.textContent = `Error: ${response.error}`;
        }
    });
});

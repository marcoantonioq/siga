# !pip3 install beautifulsoup4
import re
import json
import requests

class WebScraper:
    def __init__(self, cookie=None):
        if not cookie:
            raise ValueError("Por favor, informe o cookie")
        self.cookie = cookie
        self.session = requests.Session()
        self.session.headers.update({'Cookie': self.cookie, 'Content-Type': 'application/json; charset=UTF-8'})
        self.page_login = None
        self.username = None
        self.igrejas = []

    def fetch(self, url, method='GET', payload=None):
        if method == 'POST':
            response = self.session.post(url, data=payload)
        else:
            response = self.session.get(url)
        response.raise_for_status()
        return response.json() if 'application/json' in response.headers.get('Content-Type', '').lower() else response.text

    def login(self):
        if self.page_login:
            return self.page_login

        result = self.fetch("https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S")

        if isinstance(result, str) and re.search(
            r'(Lembrar meu email/usuário|acesso ao SIGA para enviarmos um e-mail com uma senha provisória|../index.aspx)', 
            result, 
            re.IGNORECASE
        ):
            raise ValueError("Você não está logado! Acesse o portal administrativo para enviar o cookie de autenticação...")

        result = self.fetch("https://siga.congregacao.org.br/SIS/SIS99906.aspx")
        
        if isinstance(result, str):
            usuario_match = re.search(r'<input[^>]*name="f_usuario"[^>]*value="([^"]*)"', result)
            if not usuario_match:
                raise ValueError("Não foi possível encontrar o valor do usuário.")
            
            self.username = usuario_match.group(1)
            print(f">>> ### Bem vindo(a) {self.username}")

        self.page_login = result
        return self.page_login

    def obter_igrejas(self):
        empresas = []
        igrejas = []

        try:
            optgroup_regex = re.compile(r'<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>')
            option_regex = re.compile(r'<option value="(\d+)"[^>]*>\s*([^<]+)\s*<\/option>', re.DOTALL)

            body = self.login()

            for optgroup_match in optgroup_regex.finditer(body):
                label = optgroup_match.group(1)
                options = optgroup_match.group(2)

                for option_match in option_regex.finditer(options):
                    empresas.append({
                        'retional': label,
                        'type': 'EMPRESA',
                        'id': int(option_match.group(1)),
                        'description': option_match.group(2).strip(),
                    })

            for empresa in empresas:

                result = self.fetch(
                    url="https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso",
                    method='POST',
                    payload=json.dumps({'codigoEmpresa': empresa['id']})
                )

                for e in result.get('d', []):
                    emp = next((emp for emp in empresas if emp['id'] == e['CodigoEmpresa']), None)
                    if emp:
                        igrejas.append({
                            'cod': e['Codigo'],
                            'adm': emp['description'],
                            'codUnidade': e['CodigoEmpresa'],
                            'reg': emp['retional'],
                            'type': e['CodigoTipoEstabelecimento'],
                            'nome': e['Nome'],
                            'desc': e['NomeExibicao'],
                            'membros': 0,
                        })
        except Exception as error:
            print(f"!!! Erro ao obter igrejas: {error}")

        self.igrejas = igrejas
        return igrejas

# Exemplo de uso:
cookie = ""
scraper = WebScraper(cookie)
igrejas = scraper.obter_igrejas()
print(igrejas)

scraper = WebScraper(cookie)


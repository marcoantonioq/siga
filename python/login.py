import requests


settings = {
    'cookie': '',
    'antiXsrfToken': 'b500c485e5e34b2da6b2fb06a952a640'
}

def fetch(input):
    if isinstance(input, str):
        options = {'url': input}
    elif isinstance(input, dict):
        options = input
    else:
        raise ValueError('Argument must be a string (URL) or a dictionary.')

    url = options.get('url')
    if not url:
        raise ValueError('URL is required.')

    headers = {
        'Cookie': settings.get('cookie', ''),
        '__AntiXsrfToken': settings.get('antiXsrfToken', ''),
        **options.get('headers', {})
    }

    method = options.get('method', 'get').lower()
    response = requests.request(method, url, headers=headers, data=options.get('payload'))

    return response



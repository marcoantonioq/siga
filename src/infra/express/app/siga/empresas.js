// import { Igreja } from '../../../../core/Igreja';

export async function empresas(auth) {
  const empresas = [];
  const optgroupRegex = /<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g;
  let optgroupMatch;

  while ((optgroupMatch = optgroupRegex.exec(auth.page)) !== null) {
    const label = optgroupMatch[1];
    const options = optgroupMatch[2];
    const optionRegex = /<option value="(\d+)"[^>]*>\s*([^<]+)\s*<\/option>/gs;
    let optionMatch;

    while ((optionMatch = optionRegex.exec(options)) !== null) {
      empresas.push({
        regional: label,
        type: 'EMPRESA',
        id: Number(optionMatch[1]),
        description: optionMatch[2].trim(),
        active: true,
        loading: false,
        igrejas: [],
      });
    }
  }

  return empresas;
}

import { writeFileSync } from 'fs';
import { searchDataAll } from '../siga.js';

(async () => {
  const msg = await searchDataAll('2024-10-01', '2024-11-30', 'Itaberaí', '');

  writeFileSync('msg.json', JSON.stringify(msg, null, 2));

  console.log('Finalizado: ', msg.settings);
})();

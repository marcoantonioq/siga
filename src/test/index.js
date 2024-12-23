import fetch from 'node-fetch';
import { HTTPClient } from '../infra/http/index.js';
import { DadosRepo } from '../repo/DadosRepo.js';

async function start() {
  const cookie = '';

  const client = new HTTPClient({
    cookie,
  });

  // await client.login();

  const dadosRepo = new DadosRepo([], client);
  const formated = (
    await Promise.all([
      dadosRepo.getDadosMinisterio(),
      dadosRepo.getDadosAdministradores(),
    ])
  ).flat();

  console.log(formated.length);
}

start();

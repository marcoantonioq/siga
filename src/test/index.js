import fetch from 'node-fetch';
import { HTTPClient } from '../infra/http/index.js';
import { DadosRepo } from '../repo/DadosRepo.js';

async function start() {
  const cookie = '';

  const client = new HTTPClient({
    cookie,
  });

  // await client.login();
  const token = '';

  const dadosRepo = new DadosRepo([], client);
  const formated = (
    await Promise.all([
      dadosRepo.getDadosMinisterio(token),
      dadosRepo.getDadosAdministradores(token),
    ])
  ).flat();

  console.log(formated.length);
}

start();

/**
 * Dexie Cloud: os mesmos dados em qualquer aparelho, com login por e-mail. O endereço do banco não é
 * segredo (o segredo fica no dexie-cloud.key, fora do repositório). Nos testes automáticos fica desligado.
 */
export const CLOUD_DATABASE_URL = 'https://zwvy8bnb2.dexie.cloud';

export const cloudEnabled = import.meta.env.MODE !== 'test';

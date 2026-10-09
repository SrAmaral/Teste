import request from 'supertest';
import { abrirBanco } from '../src/db/connection';
import { criarApp } from '../src/app';

export function novaApi() {
  const db = abrirBanco(':memory:');
  return { db, api: request(criarApp(db)) };
}

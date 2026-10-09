import request from 'supertest';
import { criarApp } from '../src/app';
import { abrirBanco } from '../src/db/connection';
import { MercadoSimulado } from '../src/mercado/mercado-simulado';
import { Travas } from '../src/mercado/travas';

/** Gerador pseudoaleatório determinístico (mulberry32) para testes reproduzíveis. */
export function semente(n: number): () => number {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function novaApi(opcoes: { agora?: () => Date } = {}) {
  const db = abrirBanco(':memory:');
  const mercado = new MercadoSimulado(db, { aleatorio: semente(42), agora: opcoes.agora });
  const travas = new Travas(opcoes.agora);
  return { db, mercado, travas, api: request(criarApp(db, { mercado, travas })) };
}

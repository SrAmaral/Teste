import { PAGINAS_DOC, paginaPorHref, paginaPorSlug } from './docs-pages';

describe('páginas de documentação', () => {
  it('slug desconhecido ou ausente cai na visão geral', () => {
    expect(paginaPorSlug(undefined).slug).toBe('visao-geral');
    expect(paginaPorSlug('nao-existe').slug).toBe('visao-geral');
    expect(paginaPorSlug('arquitetura').arquivo).toBe('02-arquitetura.md');
  });

  it('resolve links relativos .md para páginas internas', () => {
    expect(paginaPorHref('02-arquitetura.md')?.slug).toBe('arquitetura');
    expect(paginaPorHref('./05-decisoes.md#native-federation')?.slug).toBe('decisoes');
    expect(paginaPorHref('superpowers/specs/2026-10-09-safra-mfe-investimentos-design.md')?.slug).toBe('spec');
  });

  it('ignora links que não são markdown conhecido', () => {
    expect(paginaPorHref('https://angular.dev')).toBeUndefined();
    expect(paginaPorHref('desconhecido.md')).toBeUndefined();
    expect(paginaPorHref('#ancora')).toBeUndefined();
  });

  it('slugs são únicos', () => {
    const slugs = PAGINAS_DOC.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

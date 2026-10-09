export interface PaginaDoc {
  slug: string;
  titulo: string;
  arquivo: string;
}

export const PAGINAS_DOC: PaginaDoc[] = [
  { slug: 'visao-geral', titulo: 'Visão geral', arquivo: '01-visao-geral.md' },
  { slug: 'arquitetura', titulo: 'Arquitetura', arquivo: '02-arquitetura.md' },
  { slug: 'estrutura', titulo: 'Estrutura de pastas', arquivo: '03-estrutura.md' },
  { slug: 'dados-e-api', titulo: 'Modelo de dados e API', arquivo: '04-dados-e-api.md' },
  { slug: 'decisoes', titulo: 'Decisões técnicas', arquivo: '05-decisoes.md' },
  { slug: 'como-rodar', titulo: 'Como rodar', arquivo: '06-como-rodar.md' },
  { slug: 'uso-de-ia', titulo: 'Como a IA foi usada', arquivo: '07-uso-de-ia.md' },
  { slug: 'spec', titulo: 'Spec de design', arquivo: 'superpowers/specs/2026-10-09-safra-mfe-investimentos-design.md' },
  { slug: 'plano', titulo: 'Plano de implementação', arquivo: 'superpowers/plans/2026-10-09-safra-mfe-investimentos.md' },
  { slug: 'spec-fase-2', titulo: 'Spec — fase 2', arquivo: 'superpowers/specs/2026-10-09-safra-fase-2-design.md' },
  { slug: 'plano-fase-2', titulo: 'Plano — fase 2', arquivo: 'superpowers/plans/2026-10-09-safra-fase-2.md' },
];

const nomeDoArquivo = (caminho: string) => caminho.split('#')[0].split('/').pop() ?? '';

export function paginaPorSlug(slug: string | undefined): PaginaDoc {
  return PAGINAS_DOC.find((p) => p.slug === slug) ?? PAGINAS_DOC[0];
}

export function paginaPorHref(href: string): PaginaDoc | undefined {
  const arquivo = nomeDoArquivo(href);
  if (!arquivo.endsWith('.md')) return undefined;
  return PAGINAS_DOC.find((p) => nomeDoArquivo(p.arquivo) === arquivo);
}

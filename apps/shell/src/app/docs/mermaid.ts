type Mermaid = (typeof import('mermaid'))['default'];

let mermaidPronto: Promise<Mermaid> | undefined;

/** Converte blocos ```mermaid renderizados pelo marked em diagramas SVG. Mermaid é carregado sob demanda. */
export async function renderizarMermaid(raiz: HTMLElement): Promise<void> {
  const blocos = Array.from(raiz.querySelectorAll<HTMLElement>('pre > code.language-mermaid'));
  if (blocos.length === 0) return;

  const nos = blocos.map((codigo) => {
    const diagrama = document.createElement('div');
    diagrama.className = 'mermaid';
    diagrama.textContent = codigo.textContent ?? '';
    codigo.parentElement!.replaceWith(diagrama);
    return diagrama;
  });

  mermaidPronto ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
    return mermaid;
  });
  await (await mermaidPronto).run({ nodes: nos });
}

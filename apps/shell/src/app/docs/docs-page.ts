import { Component, ElementRef, ViewEncapsulation, computed, inject, input, linkedSignal } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { Router, RouterLink } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { PAGINAS_DOC, paginaPorHref, paginaPorSlug } from './docs-pages';
import { renderizarMermaid } from './mermaid';

@Component({
  selector: 'app-docs-page',
  imports: [MarkdownComponent, RouterLink, MatListModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="docs">
      <nav class="docs-indice" aria-label="Índice da documentação">
        <h2>Documentação</h2>
        <mat-nav-list>
          @for (p of paginas; track p.slug) {
            <a mat-list-item [routerLink]="['/docs', p.slug]" [activated]="p.slug === pagina().slug">{{ p.titulo }}</a>
          }
        </mat-nav-list>
      </nav>
      <article class="docs-conteudo" (click)="interceptarLink($event)">
        @if (erro()) {
          <p class="docs-erro">Não foi possível carregar <code>{{ pagina().arquivo }}</code>. Rode <code>npm run sync-docs</code>.</p>
        } @else {
          <markdown [src]="'docs/' + pagina().arquivo" (ready)="aoRenderizar()" (error)="erro.set(true)" />
        }
      </article>
    </div>
  `,
  styles: `
    .docs { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto; }
    .docs-indice h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--safra-dourado); margin: 8px 16px; }
    .docs-indice { position: sticky; top: 88px; align-self: start; }
    .docs-conteudo { background: #fff; border-radius: 12px; padding: 32px 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); line-height: 1.6; }
    .docs-conteudo h1 { color: var(--safra-marinho); margin-top: 0; }
    .docs-conteudo h2 { color: var(--safra-marinho); border-bottom: 2px solid var(--safra-dourado); padding-bottom: 4px; margin-top: 32px; }
    .docs-conteudo pre { background: #0f1b2b; color: #e6edf3; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .docs-conteudo code { font-family: 'JetBrains Mono', Menlo, monospace; font-size: 13px; }
    .docs-conteudo :not(pre) > code { background: #eef2f7; padding: 1px 6px; border-radius: 4px; }
    .docs-conteudo table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
    .docs-conteudo th, .docs-conteudo td { border: 1px solid #dde3ea; padding: 6px 10px; text-align: left; }
    .docs-conteudo th { background: #eef2f7; }
    .docs-conteudo .mermaid { text-align: center; margin: 16px 0; }
    .docs-erro { color: var(--safra-erro); }
    @media (max-width: 900px) {
      .docs { grid-template-columns: 1fr; }
      .docs-indice { position: static; }
      .docs-conteudo { padding: 20px; }
    }
  `,
})
export class DocsPage {
  readonly slug = input<string>();
  readonly paginas = PAGINAS_DOC;
  readonly pagina = computed(() => paginaPorSlug(this.slug()));
  readonly erro = linkedSignal({ source: this.pagina, computation: () => false });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);

  aoRenderizar(): void {
    void renderizarMermaid(this.host.nativeElement);
  }

  interceptarLink(evento: MouseEvent): void {
    const href = (evento.target as HTMLElement).closest('a')?.getAttribute('href');
    if (!href || /^[a-z]+:/i.test(href)) return;
    const destino = paginaPorHref(href);
    if (destino) {
      evento.preventDefault();
      void this.router.navigate(['/docs', destino.slug]);
    }
  }
}

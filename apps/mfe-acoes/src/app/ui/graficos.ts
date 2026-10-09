export interface Ponto {
  x: number;
  y: number;
}

export function escalaLinear(dominio: [number, number], intervalo: [number, number]): (valor: number) => number {
  const [d0, d1] = dominio;
  const [r0, r1] = intervalo;
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (valor) => r0 + ((valor - d0) / (d1 - d0)) * (r1 - r0);
}

export function pontosSerie(valores: number[], largura: number, altura: number, margem = 2): Ponto[] {
  if (valores.length === 0) return [];
  const x = escalaLinear([0, Math.max(valores.length - 1, 1)], [margem, largura - margem]);
  const y = escalaLinear([Math.min(...valores), Math.max(...valores)], [altura - margem, margem]);
  return valores.map((v, i) => ({ x: x(i), y: y(v) }));
}

const fmt = (n: number) => n.toFixed(2);

export function caminhoLinha(pontos: Ponto[]): string {
  return pontos.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join(' ');
}

export function caminhoArea(pontos: Ponto[], base: number): string {
  if (pontos.length === 0) return '';
  const ultimo = pontos[pontos.length - 1];
  return `${caminhoLinha(pontos)} L${fmt(ultimo.x)} ${base} L${fmt(pontos[0].x)} ${base} Z`;
}

/** Caminhos SVG de um donut (anel), um por valor, começando às 12h no sentido horário. */
export function arcosDonut(valores: number[], raio: number, espessura: number, centro: number): string[] {
  const total = valores.reduce((s, v) => s + Math.max(v, 0), 0);
  if (total <= 0) return [];
  let angulo = -Math.PI / 2;
  return valores.map((valor) => {
    const fatia = (Math.max(valor, 0) / total) * Math.PI * 2;
    const caminho = arco(centro, raio, espessura, angulo, angulo + Math.min(fatia, Math.PI * 2 - 1e-4));
    angulo += fatia;
    return caminho;
  });
}

function arco(centro: number, raio: number, espessura: number, inicio: number, fim: number): string {
  const interno = raio - espessura;
  const grande = fim - inicio > Math.PI ? 1 : 0;
  const ponto = (r: number, a: number) => `${fmt(centro + r * Math.cos(a))} ${fmt(centro + r * Math.sin(a))}`;
  return `M${ponto(raio, inicio)} A${raio} ${raio} 0 ${grande} 1 ${ponto(raio, fim)} L${ponto(interno, fim)} A${interno} ${interno} 0 ${grande} 0 ${ponto(interno, inicio)} Z`;
}

import { arcosDonut, caminhoArea, caminhoLinha, escalaLinear, pontosSerie } from './graficos';

describe('geometria dos gráficos', () => {
  it('escala linear mapeia o domínio no intervalo e centraliza domínio degenerado', () => {
    const x = escalaLinear([0, 10], [0, 100]);
    expect(x(5)).toBe(50);
    expect(escalaLinear([3, 3], [0, 100])(3)).toBe(50);
  });

  it('pontos da série: mínimo embaixo, máximo em cima', () => {
    const pontos = pontosSerie([10, 20, 15], 100, 50, 0);
    expect(pontos.map((p) => p.x)).toEqual([0, 50, 100]);
    expect(pontos[0].y).toBe(50);
    expect(pontos[1].y).toBe(0);
  });

  it('gera caminhos de linha e de área fechada', () => {
    const pontos = [{ x: 0, y: 10 }, { x: 5, y: 2 }];
    expect(caminhoLinha(pontos)).toBe('M0.00 10.00 L5.00 2.00');
    expect(caminhoArea(pontos, 20)).toBe('M0.00 10.00 L5.00 2.00 L5.00 20 L0.00 20 Z');
    expect(caminhoArea([], 20)).toBe('');
  });

  it('donut: um arco por valor positivo, nenhum quando o total é zero', () => {
    expect(arcosDonut([1, 1, 2], 50, 10, 60)).toHaveLength(3);
    expect(arcosDonut([0, 0], 50, 10, 60)).toEqual([]);
    expect(arcosDonut([5], 50, 10, 60)[0]).toMatch(/^M.* A50 50 0 1 1 .* Z$/);
  });
});

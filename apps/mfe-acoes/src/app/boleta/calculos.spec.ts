import { quantidadeMaxima, quantidadePorFracao, resumoOrdem } from './calculos';

describe('cálculos da boleta', () => {
  it('quantidade máxima: compra pelo saldo, venda pela posição', () => {
    expect(quantidadeMaxima('COMPRAR', 33.33, 100, 0)).toBe(3);
    expect(quantidadeMaxima('COMPRAR', 0, 100, 0)).toBe(0);
    expect(quantidadeMaxima('VENDER', 33.33, 100, 7)).toBe(7);
  });

  it('frações arredondam para baixo', () => {
    expect(quantidadePorFracao(7, 0.25)).toBe(1);
    expect(quantidadePorFracao(7, 0.5)).toBe(3);
    expect(quantidadePorFracao(7, 1)).toBe(7);
  });

  it('resumo de compra valida saldo', () => {
    expect(resumoOrdem({ lado: 'COMPRAR', preco: 33.33, quantidade: 3, saldo: 100, posicao: null })).toEqual({ total: 99.99, saldoApos: 0.01, resultadoEstimado: null, valida: true, motivo: null });
    expect(resumoOrdem({ lado: 'COMPRAR', preco: 33.33, quantidade: 4, saldo: 100, posicao: null })).toMatchObject({ valida: false, motivo: 'Saldo insuficiente' });
  });

  it('resumo de venda estima o resultado pelo preço médio e valida a posição', () => {
    const posicao = { quantidade: 10, precoMedio: 10 };
    expect(resumoOrdem({ lado: 'VENDER', preco: 15, quantidade: 4, saldo: 900, posicao })).toEqual({ total: 60, saldoApos: 960, resultadoEstimado: 20, valida: true, motivo: null });
    expect(resumoOrdem({ lado: 'VENDER', preco: 15, quantidade: 11, saldo: 900, posicao })).toMatchObject({ valida: false, motivo: 'Quantidade acima da posição' });
    expect(resumoOrdem({ lado: 'VENDER', preco: 15, quantidade: 1, saldo: 900, posicao: null })).toMatchObject({ valida: false, motivo: 'Sem posição nesta carteira' });
  });

  it('quantidade precisa ser inteira e positiva', () => {
    expect(resumoOrdem({ lado: 'COMPRAR', preco: 10, quantidade: 1.5, saldo: 100, posicao: null })).toMatchObject({ valida: false, motivo: 'Informe uma quantidade inteira' });
    expect(resumoOrdem({ lado: 'COMPRAR', preco: 10, quantidade: 0, saldo: 100, posicao: null }).valida).toBe(false);
  });
});

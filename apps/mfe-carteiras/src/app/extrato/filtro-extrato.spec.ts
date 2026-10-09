import { convertToParamMap } from '@angular/router';
import { filtroDeParams, paramsDeFiltro } from './filtro-extrato';

describe('filtro do extrato ↔ URL', () => {
  it('aplica padrões e converte tipos', () => {
    expect(filtroDeParams(convertToParamMap({}))).toEqual({ ordem: 'data', direcao: 'desc', pagina: 1, tamanho: 20 });
    expect(filtroDeParams(convertToParamMap({ carteiraId: '3', tipo: 'VENDA', pagina: '2', ordem: 'valor', direcao: 'asc', ticker: 'PETR' }))).toEqual({
      carteiraId: 3, tipo: 'VENDA', ticker: 'PETR', ordem: 'valor', direcao: 'asc', pagina: 2, tamanho: 20,
    });
  });

  it('descarta valores inválidos', () => {
    expect(filtroDeParams(convertToParamMap({ tipo: 'X', ordem: 'preco', pagina: '-1', carteiraId: 'abc' }))).toEqual({ ordem: 'data', direcao: 'desc', pagina: 1, tamanho: 20 });
  });

  it('omite padrões e vazios na URL', () => {
    expect(paramsDeFiltro({ ordem: 'data', direcao: 'desc', pagina: 1, tamanho: 20, tipo: 'COMPRA', ticker: '' })).toEqual({ tipo: 'COMPRA' });
  });
});

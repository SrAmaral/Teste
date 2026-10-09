export interface ItemMenu {
  rota: string;
  rotulo: string;
  icone: string;
  exato?: boolean;
}

export interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

export const MENU: GrupoMenu[] = [
  {
    titulo: 'Investimentos',
    itens: [
      { rota: '/carteiras', rotulo: 'Dashboard', icone: 'space_dashboard', exato: true },
      { rota: '/carteiras/lista', rotulo: 'Carteiras', icone: 'account_balance_wallet' },
      { rota: '/acoes', rotulo: 'Mercado', icone: 'candlestick_chart' },
      { rota: '/carteiras/extrato', rotulo: 'Extrato', icone: 'receipt_long' },
    ],
  },
  { titulo: 'Projeto', itens: [{ rota: '/docs', rotulo: 'Documentação', icone: 'menu_book' }] },
];

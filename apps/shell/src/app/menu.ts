export interface ItemMenu {
  rota: string;
  rotulo: string;
  icone: string;
}

export const MENU: ItemMenu[] = [
  { rota: '/docs', rotulo: 'Home · Documentação', icone: 'menu_book' },
  { rota: '/carteiras', rotulo: 'Carteiras', icone: 'account_balance_wallet' },
  { rota: '/acoes', rotulo: 'Ações', icone: 'show_chart' },
];

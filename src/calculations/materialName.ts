/**
 * Um único jeito de comparar nomes de material, usado pelo estoque, pelo custo dos produtos
 * e pela checagem dos pedidos: "Fio de Algodão " e "fio de algodao" são o mesmo material.
 */
export const materialKey = (name: string): string =>
  name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const sameMaterial = (a: string, b: string): boolean => materialKey(a) === materialKey(b);

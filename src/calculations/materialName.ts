/**
 * Um único jeito de comparar nomes de material, usado pelo estoque, pelo custo dos produtos
 * e pela checagem dos pedidos: "Fio de Algodão " e "fio de algodao" são o mesmo material.
 */
export const materialKey = (name: string): string =>
  name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const sameMaterial = (a: string, b: string): boolean => materialKey(a) === materialKey(b);

const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** "Fio de Algodão" → "fio algodao": sem acentos, pontuação e palavras de ligação. */
const words = (name: string): string[] =>
  materialKey(name).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !STOP_WORDS.has(w));

const editDistance = (a: string, b: string): number => {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
};

/**
 * Nome já cadastrado que provavelmente é o mesmo material escrito de outro jeito
 * ("Fio algodão" × "Fio de algodão", "Enchimeto" × "Enchimento"). Números diferentes
 * (olho 10 mm × 12 mm) são materiais diferentes. Se o nome já existe igual, não sugere nada.
 */
export const findSimilarMaterial = (name: string, existing: string[]): string | undefined => {
  const typed = words(name);
  if (typed.join('').length < 4 || existing.some(n => sameMaterial(n, name))) return undefined;
  const numbers = (ws: string[]) => ws.filter(w => /\d/.test(w)).sort().join(' ');
  const flat = typed.join(' ');
  return existing.find(n => {
    const other = words(n);
    if (numbers(other) !== numbers(typed)) return false;
    if ([...other].sort().join(' ') === [...typed].sort().join(' ')) return true;
    return editDistance(other.join(' '), flat) <= (flat.length >= 8 ? 2 : 1);
  });
};

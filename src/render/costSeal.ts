/**
 * Arranjo do selo de custo com vários recursos.
 *
 * Cada parte do custo vira "símbolo + número" ou o símbolo repetido (como no
 * MTG). Com mais partes, os símbolos diminuem; se ainda não couber numa
 * fileira, passam para duas. O selo se alarga até a largura máxima.
 */

export interface CostItem { resource: string; amount: number; show?: 'number' | 'repeat' }

/** Até quantos símbolos repetidos antes de voltar ao número. */
export const MAX_REPEAT = 6;
/** Largura máxima do selo de custo (px da carta). */
export const COST_MAX_W = 300;

/** Um símbolo (e talvez o número) já posicionado, relativo à caixa de conteúdo. */
export interface PlacedUnit {
  part: number;
  /** Canto do símbolo e o lado. */
  x: number; y: number; s: number;
  num?: { text: string; x: number; w: number; size: number };
}

export interface CostPlan { units: PlacedUnit[]; width: number; rows: number; scale: number }

interface Unit { part: number; num?: string }

const ICON = 0.52; // lado do símbolo ÷ altura do conteúdo
const NUM_GAP = 0.05; // símbolo ↔ número
const SAME_GAP = 0.03; // símbolos repetidos
const PART_GAP = 0.13; // entre partes

export function repeats(p: CostItem): boolean {
  return p.show === 'repeat' && p.amount >= 1 && p.amount <= MAX_REPEAT;
}

/**
 * @param h altura da caixa de conteúdo do selo
 * @param numW mede a largura de um número num tamanho de fonte
 * @param font tamanho de fonte do número com um só custo
 * @param maxW largura máxima disponível para o conteúdo
 * @param icon lado do símbolo ÷ altura do conteúdo (selo de classe usa símbolos maiores)
 * @param numGap espaço extra entre o símbolo e o número, em fração da altura (pode ser negativo para aproximar)
 */
export function planCost(parts: CostItem[], h: number, numW: (text: string, size: number) => number, font: number, maxW: number, icon = ICON, numGap = 0): CostPlan {
  const GAP = NUM_GAP + numGap;
  const units: Unit[] = parts.flatMap((p, part) =>
    repeats(p) ? Array.from({ length: p.amount }, () => ({ part })) : [{ part, num: String(p.amount) }]);
  if (!units.length) return { units: [], width: 0, rows: 0, scale: 1 };

  const unitW = (u: Unit, k: number) => h * icon * k + (u.num ? h * GAP * k + numW(u.num, font * k) : 0);
  const gap = (a: Unit, b: Unit, k: number) => h * (a.part === b.part ? SAME_GAP : PART_GAP) * k;
  const rowW = (row: Unit[], k: number) => row.reduce((s, u, i) => s + unitW(u, k) + (i ? gap(row[i - 1], u, k) : 0), 0);

  // 1 fileira: começa menor quanto mais símbolos houver
  const start = Math.max(0.6, 1 - 0.07 * (units.length - 1));
  let k1 = 0;
  for (let k = start; k >= 0.6 - 1e-9; k -= 0.05) {
    if (rowW(units, k) <= maxW) { k1 = k; break; }
  }
  if (units.length < 4 && k1) return place([units], k1);
  // 2 fileiras: divide onde as duas ficam mais parecidas
  let cut = 1, best = Infinity;
  for (let i = 1; i < units.length; i++) {
    const m = Math.max(rowW(units.slice(0, i), 1), rowW(units.slice(i), 1));
    if (m < best) { best = m; cut = i; }
  }
  const rows = [units.slice(0, cut), units.slice(cut)];
  let k2 = 0.8;
  while (k2 > 0.35 && Math.max(...rows.map((r) => rowW(r, k2))) > maxW) k2 -= 0.05;
  // uma fileira só se os símbolos não ficarem bem menores que em duas
  return k1 && k1 >= k2 - 0.1 ? place([units], k1) : place(rows, k2);

  function place(rows: Unit[][], k: number): CostPlan {
    const s = h * icon * k;
    const width = Math.max(...rows.map((r) => rowW(r, k)));
    const rowGap = h * 0.06;
    const top = h / 2 - (rows.length * s + (rows.length - 1) * rowGap) / 2;
    const out: PlacedUnit[] = [];
    rows.forEach((row, ri) => {
      let x = (width - rowW(row, k)) / 2;
      const y = top + ri * (s + rowGap);
      row.forEach((u, i) => {
        if (i) x += gap(row[i - 1], u, k);
        const pu: PlacedUnit = { part: u.part, x, y, s };
        if (u.num) {
          const size = font * k;
          const w = numW(u.num, size);
          pu.num = { text: u.num, x: x + s + h * GAP * k, w, size };
        }
        out.push(pu);
        x += unitW(u, k);
      });
    });
    return { units: out, width, rows: rows.length, scale: k };
  }
}

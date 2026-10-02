/**
 * Caminhos dentro de uma aparência (Look), para aplicar uma mudança feita no
 * editor a outras cartas, ao deck inteiro ou à coleção inteira.
 *
 * Um caminho é "style", "pieces.header.opacity", "icons.cost.size",
 * "pieces.*.style" (todas as peças) ou "pieces.header" (a peça inteira).
 */
import type { Look } from '../render/compose';

type AnyLook = Partial<Look> & Record<string, unknown>;
type Obj = Record<string, unknown>;

/**
 * O que é próprio de cada deck e NÃO passa de um deck para outro quando se
 * aplica à coleção: cores das peças, cores livres e os símbolos de classe e de
 * custo no formato antigo (o símbolo por recurso, em `icons.res`, vale para a
 * coleção inteira: mana é mana em qualquer deck).
 */
export function isDeckSpecific(path: string): boolean {
  return /^pieces\.[^.]+\.colors$/.test(path) || path === 'tint' || /^icons\.(cost|class)\.(glyph|color|image)$/.test(path);
}

const obj = (v: unknown): Obj | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined);

/** Nomes que o segmento cobre ("*" = todos os que existirem em qualquer dos lados). */
function keys(seg: string, ...sides: (Obj | undefined)[]): string[] {
  if (seg !== '*') return [seg];
  return [...new Set(sides.flatMap((o) => Object.keys(o ?? {})))];
}

/** Apaga o valor do caminho (para a carta passar a seguir o tema). */
export function clearPath(look: AnyLook | undefined, path: string): void {
  if (!look) return;
  const parts = path.split('.');
  const walk = (o: Obj | undefined, i: number): void => {
    if (!o) return;
    for (const k of keys(parts[i], o)) {
      if (i === parts.length - 1) delete o[k];
      else {
        walk(obj(o[k]), i + 1);
        const child = obj(o[k]);
        if (child && !Object.keys(child).length) delete o[k];
      }
    }
  };
  walk(look, 0);
}

/**
 * Copia o valor do caminho de `from` para `to` (apagando em `to` se não existir em `from`).
 * Ao copiar uma peça ou um grupo inteiro para outro deck, `keep` diz o que manter do destino.
 */
export function copyPath(to: AnyLook, from: AnyLook, path: string, keep: (path: string) => boolean = () => false): void {
  const parts = path.split('.');
  const walk = (t: Obj, f: Obj | undefined, i: number, at: string[]): void => {
    for (const k of keys(parts[i], t, f)) {
      const here = [...at, k];
      if (i < parts.length - 1) {
        const fc = obj(f?.[k]);
        if (!fc && !obj(t[k])) continue;
        t[k] = obj(t[k]) ?? {};
        walk(t[k] as Obj, fc, i + 1, here);
        if (!Object.keys(t[k] as Obj).length) delete t[k];
        continue;
      }
      const v = f?.[k];
      const tv = obj(t[k]);
      const fv = obj(v);
      if (fv || tv) {
        // grupo inteiro (ex.: "pieces.header"): copia campo a campo, mantendo o que for do deck
        const out: Obj = {};
        for (const kk of new Set([...Object.keys(fv ?? {}), ...Object.keys(tv ?? {})])) {
          const sub = [...here, kk].join('.');
          const val = keep(sub) ? tv?.[kk] : fv?.[kk];
          if (val !== undefined) out[kk] = structuredClone(val);
        }
        if (Object.keys(out).length) t[k] = out; else delete t[k];
      } else if (v === undefined) delete t[k];
      else t[k] = structuredClone(v);
    }
  };
  walk(to, from, 0, []);
}

/**
 * Registro de <defs> de uma carta: gradientes, filtros e texturas.
 * Cada carta tem um prefixo próprio (uid), então ids nunca colidem entre cartas
 * desenhadas na mesma página. Pedidos iguais reaproveitam o mesmo id.
 */
import { darken, parseHex } from './color';
import { METALS, vivid, type Palette } from './palette';

export class Defs {
  private items = new Map<string, { id: string; svg: string }>();
  constructor(readonly uid: string) {}

  /** Registra (uma vez) e devolve o id. `build` recebe o id final. */
  add(key: string, build: (id: string) => string): string {
    let it = this.items.get(key);
    if (!it) {
      const id = `${this.uid}-${this.items.size}`;
      it = { id, svg: build(id) };
      this.items.set(key, it);
    }
    return it.id;
  }

  url(key: string, build: (id: string) => string): string {
    return `url(#${this.add(key, build)})`;
  }

  toString(): string {
    return `<defs>${[...this.items.values()].map((i) => i.svg).join('')}</defs>`;
  }

  // ───────────── gradientes ─────────────

  /** Gradiente linear. `stops` = [offset 0..1, cor, opacidade?]. `dir` 'v' (cima→baixo), 'h' ou 'd' (diagonal). */
  linear(stops: [number, string, number?][], dir: 'v' | 'h' | 'd' = 'v'): string {
    const key = `lin:${dir}:${JSON.stringify(stops)}`;
    const [x2, y2] = dir === 'v' ? ['0', '1'] : dir === 'h' ? ['1', '0'] : ['1', '1'];
    return this.url(key, (id) =>
      `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
      stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') +
      `</linearGradient>`);
  }

  radial(stops: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5): string {
    const key = `rad:${cx}:${cy}:${r}:${JSON.stringify(stops)}`;
    return this.url(key, (id) =>
      `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">` +
      stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('') +
      `</radialGradient>`);
  }

  /** Cor da carta transformada por `t`. Mono → cor sólida; multicolor → gradiente no modo de mistura. */
  hue(pal: Palette, t: (c: string) => string = (c) => c, opacity?: number): string {
    if (!pal.hybrid) return t(pal.base);
    const n = pal.colors.length;
    const stops: [number, string, number?][] = [];
    const mode = pal.blend ?? 'faixas';
    if (mode === 'degrade' || mode === 'diagonal') {
      pal.colors.forEach((c, i) => stops.push([+(i / (n - 1)).toFixed(3), t(c), opacity]));
    } else {
      // faixas: transição curta entre blocos; divisão: sem transição nenhuma
      const soft = mode === 'divisao' ? 0 : Math.min(0.14, 0.35 / n);
      pal.colors.forEach((c, i) => {
        const a = i / n, b = (i + 1) / n;
        stops.push([+(a + (i ? soft : 0)).toFixed(3), t(c), opacity]);
        stops.push([+(b - (i < n - 1 ? soft : 0)).toFixed(3), t(c), opacity]);
      });
    }
    return this.linear(stops, mode === 'vertical' ? 'v' : mode === 'diagonal' ? 'd' : 'h');
  }

  /** Camadas de preenchimento de metal (a primeira é a base, as seguintes vão por cima). */
  metal(pal: Palette, kind = pal.metal): string[] {
    if (kind !== 'deck') {
      const m = METALS[kind];
      return [this.linear([[0, m[0]], [0.22, m[1]], [0.5, m[2]], [0.56, m[3]], [0.82, m[4]], [1, m[5]]])];
    }
    return [this.hue(pal, (c) => darken(vivid(c), 0.12)), this.shade()];
  }

  /** Sombreado de metal laqueado (brilho em cima, faixa escura no meio, reflexo embaixo). */
  shade(strength = 1): string {
    const s = (a: number) => +(a * strength).toFixed(3);
    return this.linear([
      [0, '#ffffff', s(0.42)], [0.1, '#ffffff', s(0.12)], [0.42, '#000000', s(0.04)],
      [0.56, '#000000', s(0.4)], [0.8, '#ffffff', s(0.04)], [1, '#000000', s(0.62)],
    ]);
  }

  // ───────────── filtros ─────────────

  /** Relevo metálico (luz vinda de cima-esquerda). `depth` ~ espessura percebida. */
  bevel(depth = 2.5, shine = 0.75): string {
    return this.url(`bevel:${depth}:${shine}`, (id) =>
      `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${depth}" result="b"/>` +
      `<feSpecularLighting in="b" surfaceScale="${(depth * 1.6).toFixed(2)}" specularConstant="${shine}" specularExponent="22" lighting-color="#fff" result="s">` +
      `<feDistantLight azimuth="235" elevation="42"/></feSpecularLighting>` +
      `<feComposite in="s" in2="SourceAlpha" operator="in" result="si"/>` +
      `<feOffset in="b" dx="${(-depth * 0.6).toFixed(2)}" dy="${(-depth * 0.9).toFixed(2)}" result="o"/>` +
      `<feComposite in="SourceAlpha" in2="o" operator="arithmetic" k2="1" k3="-1" result="edge"/>` +
      `<feFlood flood-color="#000" flood-opacity="0.45"/><feComposite in2="edge" operator="in" result="dk"/>` +
      `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dk"/></feMerge>` +
      `<feComposite in2="si" operator="arithmetic" k2="1" k3="0.85" result="lit"/>` +
      `<feComposite in="lit" in2="SourceAlpha" operator="in"/>` +
      `</filter>`);
  }

  /** Sombra projetada (para destacar a peça da arte). */
  shadow(dy = 4, blur = 6, opacity = 0.6, color = '#000'): string {
    return this.url(`shadow:${dy}:${blur}:${opacity}:${color}`, (id) =>
      `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">` +
      `<feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="${color}" flood-opacity="${opacity}"/></filter>`);
  }

  /** Brilho (aura) colorido em volta do desenho. */
  glow(color: string, size = 6, opacity = 0.9): string {
    return this.url(`glow:${color}:${size}:${opacity}`, (id) =>
      `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${size}" result="b"/>` +
      `<feFlood flood-color="${color}" flood-opacity="${opacity}"/><feComposite in2="b" operator="in" result="g"/>` +
      `<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  }

  /** Sombra interna (painéis afundados). */
  innerShadow(blur = 10, opacity = 0.55, color = '#000'): string {
    return this.url(`ishadow:${blur}:${opacity}:${color}`, (id) =>
      `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      `<feFlood flood-color="${color}" flood-opacity="${opacity}"/>` +
      `<feComposite in2="SourceAlpha" operator="out" result="inv"/>` +
      `<feGaussianBlur in="inv" stdDeviation="${blur}" result="blur"/>` +
      `<feComposite in="blur" in2="SourceAlpha" operator="in" result="sh"/>` +
      `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sh"/></feMerge></filter>`);
  }

  /** Textura de pergaminho: manchas suaves + fibra fina, na cor `stain`. */
  paper(stain: string, amount = 1, seed = 7): string {
    const { r, g, b } = parseHex(stain);
    const [R, G, B] = [r / 255, g / 255, b / 255].map((v) => v.toFixed(3));
    return this.url(`paper:${stain}:${amount}:${seed}`, (id) =>
      `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.011 0.018" numOctaves="4" seed="${seed}" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 ${R} 0 0 0 0 ${G} 0 0 0 0 ${B} ${(-2.2 * amount).toFixed(2)} 0 0 0 ${(1.18 * amount).toFixed(2)}" result="blot"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.7 0.35" numOctaves="2" seed="${seed + 3}" result="f"/>` +
      `<feColorMatrix in="f" type="matrix" values="0 0 0 0 ${R} 0 0 0 0 ${G} 0 0 0 0 ${B} 0 0 ${(0.9 * amount).toFixed(2)} 0 ${(-0.38 * amount).toFixed(2)}" result="fib"/>` +
      `<feMerge result="m"><feMergeNode in="SourceGraphic"/><feMergeNode in="blot"/><feMergeNode in="fib"/></feMerge>` +
      `<feComposite in="m" in2="SourceAlpha" operator="in"/></filter>`);
  }

  /** Granulado sutil (pedra/couro/vidro fosco) na cor `tint`. */
  grain(tint = '#000', amount = 0.35, freq = 0.8, seed = 3): string {
    const { r, g, b } = parseHex(tint);
    const [R, G, B] = [r / 255, g / 255, b / 255].map((v) => v.toFixed(3));
    return this.url(`grain:${tint}:${amount}:${freq}:${seed}`, (id) =>
      `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 ${R} 0 0 0 0 ${G} 0 0 0 0 ${B} ${(1.4 * amount).toFixed(2)} 0 0 0 ${(-0.55 * amount).toFixed(2)}" result="gn"/>` +
      `<feMerge result="m"><feMergeNode in="SourceGraphic"/><feMergeNode in="gn"/></feMerge>` +
      `<feComposite in="m" in2="SourceAlpha" operator="in"/></filter>`);
  }

  /** Desfoque do que está atrás (vidro fosco) — só funciona sobre a arte, via clip. */
  blur(std = 8): string {
    return this.url(`blur:${std}`, (id) =>
      `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="${std}"/></filter>`);
  }
}

/** Monta caminhos sobrepostos com várias camadas de preenchimento. */
export function layers(d: string, fills: string[], attrs = ''): string {
  return fills.map((fl) => `<path d="${d}" fill="${fl}"${attrs}/>`).join('');
}

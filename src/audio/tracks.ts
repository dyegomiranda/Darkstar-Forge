/**
 * As faixas do jogo: instrumentais de fundo, sem instrumento solista. Cada faixa tem
 * partes (A, B, C…); cada parte tem os acordes (um por compasso) e uma "levada", que
 * diz como a base toca. `form` é a ordem em que as partes tocam.
 *
 * Levadas calmas (seleção): `arp` (arpejo em colcheias), `pad` (acordes longos e notas
 * espaçadas), `pluck` (arpejo agudo saltitante).
 * Levadas de rock (batalha): `chug` (guitarra abafada em colcheias), `gallop` (galope),
 * `open` (acordes soltos, bateria em meio-tempo), `break` (respiro).
 * Levadas épicas (tela inicial): `dark` (coro grave, sinos espaçados, tambor distante),
 * `epic` (coro, metais, cordas em ostinato e tambores de guerra) e `rise` (tremolo e rufo que crescem).
 */
export type Mood = 'title' | 'menu' | 'battle';
export type Feel = 'arp' | 'pad' | 'pluck' | 'chug' | 'gallop' | 'open' | 'break' | 'dark' | 'epic' | 'rise';
export interface Part { chords: string; feel: Feel }
export interface TrackDef { id: string; name: [string, string]; mood: Mood; bpm: number; parts: Record<string, Part>; form: string }

export const TRACKS: TrackDef[] = [
  {
    id: 'eclipse', name: ['Sol do Vazio', 'Void Sun'], mood: 'title', bpm: 74, form: 'ABBCBB',
    parts: {
      A: { feel: 'dark', chords: 'Dm Dm Bb Bb Gm Gm A A' },
      B: { feel: 'epic', chords: 'Dm C Bb A Dm C Bb A' },
      C: { feel: 'rise', chords: 'Bb Bb C C Dm Dm A A' },
    },
  },
  {
    id: 'abismo', name: ['Coroa do Abismo', 'Crown of the Abyss'], mood: 'title', bpm: 66, form: 'AABCB',
    parts: {
      A: { feel: 'dark', chords: 'Em Em C C Am Am B B' },
      B: { feel: 'epic', chords: 'Em D C B Em G D B' },
      C: { feel: 'rise', chords: 'C C D D Em Em B B' },
    },
  },
  {
    id: 'estrada', name: ['Estrada do Herói', "Hero's Road"], mood: 'menu', bpm: 96, form: 'AABAB',
    parts: { A: { feel: 'arp', chords: 'Dm Dm Bb Bb F F C A' }, B: { feel: 'pad', chords: 'Gm Gm Dm Dm Bb C Dm Dm' } },
  },
  {
    id: 'fogueira', name: ['Fogueira na Estrada', 'Campfire on the Road'], mood: 'menu', bpm: 108, form: 'ABAB',
    parts: { A: { feel: 'pluck', chords: 'G D Em C G D C D' }, B: { feel: 'arp', chords: 'Em C G D Em C D D' } },
  },
  {
    id: 'runas', name: ['Salão das Runas', 'Hall of Runes'], mood: 'menu', bpm: 84, form: 'ABAB',
    parts: { A: { feel: 'pad', chords: 'Am F C G Am F E E' }, B: { feel: 'pluck', chords: 'F G Am Am F G E E' } },
  },
  {
    id: 'aco', name: ['Aço e Fúria', 'Steel and Fury'], mood: 'battle', bpm: 150, form: 'AABCAB',
    parts: { A: { feel: 'chug', chords: 'Am Am F G Am Am F E' }, B: { feel: 'open', chords: 'F F G G Am Am E E' }, C: { feel: 'break', chords: 'Am G F E' } },
  },
  {
    id: 'lamina', name: ['Lâmina Sombria', 'Shadow Blade'], mood: 'battle', bpm: 160, form: 'ABAAB',
    parts: { A: { feel: 'gallop', chords: 'Em Em C D Em Em C B' }, B: { feel: 'chug', chords: 'C D Em Em C D B B' } },
  },
  {
    id: 'folego', name: ['Último Fôlego', 'Last Breath'], mood: 'battle', bpm: 170, form: 'AABAB',
    parts: { A: { feel: 'gallop', chords: 'Dm Dm Bb C Dm Dm Bb A' }, B: { feel: 'open', chords: 'Gm Gm Dm Dm Bb Bb A A' } },
  },
  {
    id: 'marcha', name: ['Marcha de Ferro', 'Iron March'], mood: 'battle', bpm: 132, form: 'ABCAB',
    parts: { A: { feel: 'open', chords: 'Em G D A Em G D B' }, B: { feel: 'chug', chords: 'C C D D Em Em B B' }, C: { feel: 'break', chords: 'Em D C B' } },
  },
];

// ───────────── montagem: dos acordes para os eventos de cada passo (1 passo = semicolcheia) ─────────────

export type Voice = 'arp' | 'pad' | 'bass' | 'gtr' | 'kick' | 'snare' | 'hat' | 'crash' | 'tom' | 'choir' | 'bell' | 'str' | 'brass' | 'taiko' | 'roll';
export interface Ev { v: Voice; f: number; len: number }
export interface Track { def: TrackDef; steps: number; ev: Ev[][] }

const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = (n: string) => { const m = n.match(/^([A-G][#b]?)(\d)$/); if (!m) throw new Error(`nota inválida: ${n}`); return SEMI[m[1]] + (+m[2] + 1) * 12; };
export const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
export const noteHz = (n: string) => hz(midi(n));

function chord(name: string): { root: number; third: number } {
  const m = name.match(/^([A-G][#b]?)(m?)$/);
  if (!m) throw new Error(`acorde inválido: ${name}`);
  return { root: SEMI[m[1]], third: m[2] ? 3 : 4 };
}

export function build(def: TrackDef): Track {
  const ev: Ev[][] = [];
  const put = (step: number, v: Voice, note: number, len: number) => { (ev[step] ??= []).push({ v, f: note ? hz(note) : 0, len }); };
  let at = 0;
  [...def.form].forEach((letter, fi) => {
    const part = def.parts[letter];
    if (!part) throw new Error(`parte "${letter}" não existe em ${def.id}`);
    const chords = part.chords.trim().split(/\s+/).map(chord);
    chords.forEach((c, bi) => {
      const b0 = at + bi * 16, last = bi === chords.length - 1;
      const r = c.root;
      const low = 24 + r + (r > 7 ? 0 : 12);          // baixo: Lá1 … Sol2
      const mid = 48 + r, third = mid + c.third, fifth = mid + 7;
      const drumsLight = () => { put(b0, 'kick', 0, 1); put(b0 + 8, 'kick', 0, 1); put(b0 + 4, 'hat', 0, 1); put(b0 + 12, fi % 2 ? 'snare' : 'hat', 0, 1); };
      const fill = () => { for (const k of [8, 10, 11, 12, 13, 14, 15]) put(b0 + k, k < 12 ? 'tom' : 'snare', k < 12 ? 62 - k : 0, 1); };
      switch (part.feel) {
        case 'arp': {
          // arpejo em colcheias (sobe num compasso, desce no outro) e baixo longo
          const up = [mid - 12, fifth - 12, mid, third, fifth, third, mid, fifth - 12];
          (bi % 2 ? [...up].reverse() : up).forEach((n, k) => put(b0 + k * 2, 'arp', n, 2));
          put(b0, 'bass', low, 16);
          if (fi > 0) drumsLight();
          break;
        }
        case 'pad': {
          // acorde longo, baixo em mínimas e notas espaçadas no agudo
          for (const n of [mid, third, fifth]) put(b0, 'pad', n, 16);
          put(b0, 'bass', low, 8); put(b0 + 8, 'bass', low + 7, 8);
          [mid + 12, fifth + 12, third + 12, fifth].forEach((n, k) => put(b0 + k * 4 + 2, 'arp', n, 3));
          if (fi > 0) drumsLight();
          break;
        }
        case 'pluck': {
          // arpejo agudo saltitante, baixo marcando o 1 e o 3
          const pat = [mid + 12, fifth, third + 12, fifth, mid + 12, fifth + 12, third + 12, fifth];
          pat.forEach((n, k) => put(b0 + k * 2, 'arp', n, 1.4));
          put(b0, 'bass', low, 6); put(b0 + 8, 'bass', low + 7, 4); put(b0 + 12, 'bass', low, 4);
          for (const n of [mid, third]) put(b0, 'pad', n, 16);
          if (fi > 0) drumsLight();
          break;
        }
        case 'chug': {
          // guitarra abafada em colcheias; no fim do compasso, uma subidinha
          for (let k = 0; k < 12; k += 2) put(b0 + k, 'gtr', low + 12, k === 0 ? 2 : 1.2);
          [low + 12, low + 12 + c.third, low + 19, low + 24].forEach((n, k) => put(b0 + 12 + k, 'gtr', n, 1));
          for (let k = 0; k < 16; k += 2) { put(b0 + k, 'bass', low + (k === 6 ? 12 : 0), 1.8); put(b0 + k, 'hat', 0, 1); }
          for (const k of [0, 6, 8]) put(b0 + k, 'kick', 0, 1);
          if (bi % 2) put(b0 + 10, 'kick', 0, 1);
          if (last) { put(b0 + 4, 'snare', 0, 1); fill(); } else for (const k of [4, 12]) put(b0 + k, 'snare', 0, 1);
          if (bi === 0) put(b0, 'crash', 0, 6);
          break;
        }
        case 'gallop': {
          // galope: colcheia + duas semicolcheias, com bumbo duplo
          for (const k of [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15]) put(b0 + k, 'gtr', low + 12, k % 4 === 0 ? 1.6 : 0.9);
          for (const k of [0, 2, 3, 8, 10, 11]) put(b0 + k, 'kick', 0, 1);
          for (const k of [0, 4, 8, 12]) { put(b0 + k, 'bass', low, 3.6); put(b0 + k, 'hat', 0, 1); put(b0 + k + 2, 'hat', 0, 1); }
          if (last) { put(b0 + 4, 'snare', 0, 1); fill(); } else for (const k of [4, 12]) put(b0 + k, 'snare', 0, 1);
          if (bi === 0) put(b0, 'crash', 0, 6);
          break;
        }
        case 'open': {
          // acordes soltos e pesados, bateria em meio-tempo
          put(b0, 'gtr', low + 12, 6); put(b0 + 6, 'gtr', low + 12, 2); put(b0 + 8, 'gtr', low + 12, 5); put(b0 + 14, 'gtr', low + 19, 2);
          for (let k = 0; k < 16; k += 2) put(b0 + k, 'bass', low + (k === 14 ? 7 : 0), 1.8);
          for (const k of [0, 4, 8, 12]) put(b0 + k, 'hat', 0, 1);
          put(b0, 'kick', 0, 1); put(b0 + 10, 'kick', 0, 1); put(b0 + 6, 'kick', 0, 1);
          put(b0 + 8, 'snare', 0, 1);
          if (last) fill();
          if (bi % 4 === 0) put(b0, 'crash', 0, 6);
          break;
        }
        case 'dark': {
          // abertura sombria: coro grave, baixo parado, sinos espaçados e um tambor distante
          for (const n of [mid - 12, mid, third, fifth]) put(b0, 'choir', n, 16);
          put(b0, 'bass', low, 16);
          (bi % 2 ? [[4, fifth + 12], [10, mid + 24]] : [[2, mid + 12], [8, fifth + 12], [13, third + 12]]).forEach(([k, n]) => put(b0 + k, 'bell', n, 8));
          if (bi % 2 === 0) put(b0, 'taiko', 0, 2);
          if (bi % 4 === 3) { put(b0 + 12, 'taiko', 0, 1); put(b0 + 14, 'taiko', 0, 1); }
          break;
        }
        case 'epic': {
          // o tema: coro, metais segurando a tônica, cordas em ostinato e tambores de guerra
          for (const n of [mid, third, fifth, mid + 12]) put(b0, 'choir', n, 16);
          put(b0, 'brass', mid - 12, 11); put(b0 + 12, 'brass', fifth - 12, 4);
          put(b0, 'brass', fifth, 8); put(b0 + 8, 'brass', mid + 12, 8);
          [mid, mid, fifth, mid, third, mid, fifth, mid + 12].forEach((n, k) => put(b0 + k * 2, 'str', n, 1.5));
          put(b0, 'bass', low, 8); put(b0 + 8, 'bass', low, 4); put(b0 + 12, 'bass', low + 7, 4);
          for (const k of [0, 6, 8, 12, 14]) put(b0 + k, 'taiko', 0, k === 0 ? 2 : 1);
          if (bi % 2) put(b0 + 10, 'taiko', 0, 1);
          if (bi === 0) put(b0, 'crash', 0, 8);
          if (last) for (const k of [8, 9, 10, 11, 12, 13, 14, 15]) put(b0 + k, 'taiko', 0, 1);
          put(b0 + 4, 'bell', mid + 24, 6);
          break;
        }
        case 'rise': {
          // a subida: tremolo de cordas, sinos subindo e um rufo que cresce até o fim
          for (const n of [mid - 12, mid, fifth]) put(b0, 'choir', n, 16);
          for (let k = 0; k < 16; k++) put(b0 + k, 'str', k % 2 ? fifth : mid, 0.9);
          put(b0, 'bass', low, 16);
          [mid + 12, third + 12, fifth + 12, mid + 24].forEach((n, k) => put(b0 + k * 4, 'bell', n, 6));
          for (const k of [0, 4, 8, 12]) put(b0 + k, 'taiko', 0, 1);
          // rufo: começa baixo e cresce ao longo da parte (len = força, de 0,2 a 1)
          const grow = (bi + 1) / chords.length;
          for (let k = 0; k < 16; k += last ? 1 : 2) put(b0 + k, 'roll', 0, 0.2 + 0.8 * grow * (last ? (k + 1) / 16 : 0.6));
          if (last) put(b0 + 15, 'crash', 0, 8);
          break;
        }
        case 'break': {
          // respiro: acorde longo, bumbo marcando, tons no fim
          put(b0, 'gtr', low + 12, 16);
          put(b0, 'bass', low, 16);
          for (const n of [mid, fifth]) put(b0, 'pad', n, 16);
          for (const k of [0, 4, 8, 12]) put(b0 + k, 'kick', 0, 1);
          if (last) fill();
          break;
        }
      }
    });
    at += chords.length * 16;
  });
  return { def, steps: at, ev };
}

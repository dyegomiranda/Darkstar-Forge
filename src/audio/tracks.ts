/**
 * As faixas do jogo, escritas como partituras curtas. Cada faixa tem partes (A, B, C…),
 * cada parte tem a melodia (compassos separados por "|") e os acordes (um por compasso);
 * `form` diz a ordem em que as partes tocam. O baixo, a guitarra/arpejo e a bateria são
 * montados a partir dos acordes, conforme o estilo.
 *
 * Notação: "A4:2" = nota Lá da 4ª oitava por 2 passos (1 passo = semicolcheia; compasso = 16 passos); "-" = pausa.
 */
export type Mood = 'menu' | 'battle';
export interface Part { lead: string; chords: string; kind?: 'normal' | 'break' }
export interface TrackDef { id: string; name: [string, string]; mood: Mood; bpm: number; style: 'calm' | 'rock'; parts: Record<string, Part>; form: string }

export const TRACKS: TrackDef[] = [
  {
    id: 'estrada', name: ['Estrada do Herói', "Hero's Road"], mood: 'menu', bpm: 96, style: 'calm', form: 'AABAB',
    parts: {
      A: {
        chords: 'Dm Dm Bb Bb F F C A',
        lead: `A4:4 D5:4 F5:6 E5:2 | D5:8 -:4 A4:2 C5:2 | D5:4 F5:4 Bb5:6 A5:2 | F5:8 -:8 |
               A5:4 G5:4 F5:4 C5:4 | F5:6 E5:2 C5:8 | E5:4 G5:4 C6:4 G5:4 | A5:6 G5:2 E5:4 C#5:4`,
      },
      B: {
        chords: 'Gm Gm Dm Dm Bb C Dm Dm',
        lead: `G5:4 Bb5:4 D6:6 C6:2 | Bb5:8 A5:4 G5:4 | F5:4 A5:4 D6:6 C6:2 | A5:8 -:8 |
               Bb5:4 A5:4 G5:4 F5:4 | E5:4 G5:4 C6:6 Bb5:2 | A5:6 G5:2 F5:4 E5:4 | D5:12 -:4`,
      },
    },
  },
  {
    id: 'fogueira', name: ['Fogueira na Estrada', 'Campfire on the Road'], mood: 'menu', bpm: 108, style: 'calm', form: 'ABAB',
    parts: {
      A: {
        chords: 'G D Em C G D C D',
        lead: `B4:2 D5:2 G5:4 A5:4 G5:4 | F#5:4 D5:4 A4:4 D5:4 | E5:2 G5:2 B5:4 A5:4 G5:4 | E5:8 -:4 D5:4 |
               B4:2 D5:2 G5:4 B5:4 A5:4 | A5:4 F#5:4 D5:8 | E5:4 G5:4 C6:4 B5:4 | A5:8 F#5:4 D5:4`,
      },
      B: {
        chords: 'Em C G D Em C D D',
        lead: `E5:4 G5:4 B5:6 A5:2 | G5:4 E5:4 C5:8 | D5:4 G5:4 B5:6 A5:2 | A5:4 F#5:4 D5:8 |
               E5:4 G5:4 B5:4 D6:4 | C6:6 B5:2 G5:8 | A5:4 B5:4 C6:4 A5:4 | F#5:4 A5:4 D6:8`,
      },
    },
  },
  {
    id: 'aco', name: ['Aço e Fúria', 'Steel and Fury'], mood: 'battle', bpm: 150, style: 'rock', form: 'AABCAB',
    parts: {
      A: {
        chords: 'Am Am F G Am Am F E',
        lead: `A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2 | A5:4 G5:2 E5:2 D5:4 E5:4 | F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:4 | B5:4 G5:4 D5:4 B4:4 |
               A4:2 C5:2 E5:2 A5:2 B5:2 C6:2 B5:2 A5:2 | E6:6 D6:2 C6:4 A5:4 | F5:2 G5:2 A5:2 C6:2 A5:2 G5:2 F5:2 A5:2 | G#5:4 B5:4 E6:4 E5:4`,
      },
      B: {
        chords: 'F F G G Am Am E E',
        lead: `C6:4 A5:2 F5:2 A5:4 C6:4 | F5:2 G5:2 A5:2 C6:2 A5:4 F5:4 | D6:4 B5:2 G5:2 B5:4 D6:4 | G5:2 A5:2 B5:2 D6:2 B5:4 G5:4 |
               E6:6 D6:2 C6:2 B5:2 A5:4 | A5:2 B5:2 C6:2 E6:2 C6:4 A5:4 | G#5:2 B5:2 E6:2 B5:2 G#5:2 B5:2 E6:4 | E6:4 D6:4 C6:4 B5:4`,
      },
      C: { kind: 'break', chords: 'Am G F E', lead: 'A5:8 E5:8 | G5:8 D5:8 | F5:8 C5:8 | E5:4 G#5:4 B5:4 E6:4' },
    },
  },
  {
    id: 'lamina', name: ['Lâmina Sombria', 'Shadow Blade'], mood: 'battle', bpm: 160, style: 'rock', form: 'ABAAB',
    parts: {
      A: {
        chords: 'Em Em C D Em Em C B',
        lead: `E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 B5:2 | E6:4 D6:2 B5:2 A5:4 B5:4 | C6:2 E6:2 G6:2 E6:2 C6:2 E6:2 G6:4 | F#6:4 D6:4 A5:4 F#5:4 |
               E5:2 F#5:2 G5:2 B5:2 E6:2 F#6:2 G6:2 F#6:2 | E6:6 D6:2 B5:4 G5:4 | C6:2 B5:2 C6:2 E6:2 G6:4 E6:4 | D#6:4 F#6:4 B6:4 B5:4`,
      },
      B: {
        chords: 'C D Em Em C D B B',
        lead: `G5:4 E5:4 C6:6 B5:2 | A5:4 F#5:4 D6:6 C6:2 | B5:2 E6:2 B5:2 G5:2 E5:4 G5:4 | B5:8 -:4 B5:2 D6:2 |
               E6:4 C6:4 G5:4 E6:4 | F#6:4 D6:4 A5:4 F#6:4 | D#6:2 F#6:2 B6:2 F#6:2 D#6:2 F#6:2 B6:4 | B5:4 D#6:4 F#6:4 B6:4`,
      },
    },
  },
  {
    id: 'folego', name: ['Último Fôlego', 'Last Breath'], mood: 'battle', bpm: 170, style: 'rock', form: 'AABAB',
    parts: {
      A: {
        chords: 'Dm Dm Bb C Dm Dm Bb A',
        lead: `D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 A5:2 | D6:4 C6:2 A5:2 G5:4 A5:4 | Bb5:2 D6:2 F6:2 D6:2 Bb5:2 D6:2 F6:4 | E6:4 C6:4 G5:4 E5:4 |
               D5:2 F5:2 A5:2 D6:2 E6:2 F6:2 E6:2 D6:2 | A6:6 G6:2 F6:4 D6:4 | Bb5:2 C6:2 D6:2 F6:2 D6:2 C6:2 Bb5:2 D6:2 | C#6:4 E6:4 A6:4 A5:4`,
      },
      B: {
        chords: 'Gm Gm Dm Dm Bb Bb A A',
        lead: `G5:4 Bb5:4 D6:4 G6:4 | F6:2 D6:2 Bb5:2 D6:2 G6:4 D6:4 | F6:4 D6:4 A5:4 F6:4 | E6:2 D6:2 A5:2 D6:2 F6:4 A6:4 |
               Bb6:6 A6:2 F6:4 D6:4 | Bb5:2 D6:2 F6:2 Bb6:2 F6:4 D6:4 | A5:2 C#6:2 E6:2 A6:2 E6:2 C#6:2 A5:4 | A6:4 G6:4 F6:4 E6:4`,
      },
    },
  },
];

// ───────────── montagem: da partitura para os eventos de cada passo ─────────────

export type Voice = 'lead' | 'harm' | 'arp' | 'bass' | 'gtr' | 'kick' | 'snare' | 'hat' | 'crash' | 'tom';
export interface Ev { v: Voice; f: number; len: number }
export interface Track { def: TrackDef; steps: number; ev: Ev[][] }

const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = (n: string) => { const m = n.match(/^([A-G][#b]?)(\d)$/); if (!m) throw new Error(`nota inválida: ${n}`); return SEMI[m[1]] + (+m[2] + 1) * 12; };
export const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
export const noteHz = (n: string) => hz(midi(n));

/** Compassos de uma melodia: lista de [nota midi | null, passos]. Confere que cada compasso tem 16 passos. */
export function bars(lead: string): [number | null, number][][] {
  return lead.split('|').map((bar, i) => {
    const notes = bar.trim().split(/\s+/).map((tok): [number | null, number] => { const [n, l] = tok.split(':'); return [n === '-' ? null : midi(n), +l]; });
    const total = notes.reduce((s, x) => s + x[1], 0);
    if (total !== 16) throw new Error(`compasso ${i + 1} tem ${total} passos (deviam ser 16): "${bar.trim()}"`);
    return notes;
  });
}

function chord(name: string): { root: number; third: number } {
  const m = name.match(/^([A-G][#b]?)(m?)$/);
  if (!m) throw new Error(`acorde inválido: ${name}`);
  return { root: SEMI[m[1]], third: m[2] ? 3 : 4 };
}

export function build(def: TrackDef): Track {
  const ev: Ev[][] = [];
  const put = (step: number, e: Ev) => { (ev[step] ??= []).push(e); };
  let at = 0;
  const seen: Record<string, number> = {};
  const form = [...def.form];
  form.forEach((letter, fi) => {
    const part = def.parts[letter];
    if (!part) throw new Error(`parte "${letter}" não existe em ${def.id}`);
    const lead = bars(part.lead);
    const chords = part.chords.trim().split(/\s+/).map(chord);
    if (chords.length !== lead.length) throw new Error(`${def.id}/${letter}: ${chords.length} acordes para ${lead.length} compassos`);
    const rep = seen[letter] = (seen[letter] ?? 0) + 1;
    const brk = part.kind === 'break';
    lead.forEach((bar, bi) => {
      const b0 = at + bi * 16;
      const c = chords[bi];
      const last = bi === lead.length - 1;
      // melodia (na repetição da mesma parte entra uma 2ª voz, uma quinta acima)
      let s = b0;
      for (const [n, len] of bar) {
        if (n !== null) {
          put(s, { v: 'lead', f: hz(n), len });
          if (rep % 2 === 0 && !brk) put(s, { v: 'harm', f: hz(n + 7), len });
        }
        s += len;
      }
      const r = c.root;
      if (def.style === 'calm') {
        // arpejo em colcheias e baixo longo; bateria leve só da 2ª parte em diante
        const tones = [36 + r, 43 + r, 48 + r, 48 + r + c.third, 55 + r, 48 + r + c.third, 48 + r, 43 + r];
        tones.forEach((t, k) => put(b0 + k * 2, { v: 'arp', f: hz(t), len: 2 }));
        put(b0, { v: 'bass', f: hz(24 + r + (r > 7 ? 0 : 12)), len: 16 });
        if (fi > 0) { put(b0, { v: 'kick', f: 0, len: 1 }); put(b0 + 8, { v: 'kick', f: 0, len: 1 }); for (const h of [4, 12]) put(b0 + h, { v: 'hat', f: 0, len: 1 }); if (letter !== 'A') put(b0 + 12, { v: 'snare', f: 0, len: 1 }); }
      } else if (brk) {
        // respiro: acorde longo de guitarra, bumbo marcando e tons
        put(b0, { v: 'gtr', f: hz(36 + r), len: 16 });
        put(b0, { v: 'bass', f: hz(24 + r + (r > 7 ? 0 : 12)), len: 16 });
        for (const k of [0, 4, 8, 12]) put(b0 + k, { v: 'kick', f: 0, len: 1 });
        if (last) for (const k of [8, 10, 12, 13, 14, 15]) put(b0 + k, { v: k < 12 ? 'tom' : 'snare', f: k < 12 ? 140 - k * 4 : 0, len: 1 });
      } else {
        // rock: guitarra abafada em colcheias (tônica + quinta), baixo junto, bateria com contratempo
        for (let k = 0; k < 16; k += 2) {
          const open = k === 0 || k === 14;
          put(b0 + k, { v: 'gtr', f: hz(36 + r + (r > 7 ? 0 : 12) - 12 + 12), len: open ? 2 : 1.2 });
          put(b0 + k, { v: 'bass', f: hz(24 + r + (r > 7 ? 0 : 12) + (k === 6 || k === 12 ? 12 : 0)), len: 1.8 });
          put(b0 + k, { v: 'hat', f: 0, len: 1 });
        }
        for (const k of [0, 6, 8]) put(b0 + k, { v: 'kick', f: 0, len: 1 });
        if (bi % 2 === 1) put(b0 + 10, { v: 'kick', f: 0, len: 1 });
        if (last) {
          // virada no fim da parte
          put(b0 + 4, { v: 'snare', f: 0, len: 1 });
          for (const k of [8, 10, 11, 12, 13, 14, 15]) put(b0 + k, { v: k < 12 ? 'tom' : 'snare', f: 170 - k * 5, len: 1 });
        } else for (const k of [4, 12]) put(b0 + k, { v: 'snare', f: 0, len: 1 });
        if (bi === 0) put(b0, { v: 'crash', f: 0, len: 6 });
      }
    });
    at += lead.length * 16;
  });
  return { def, steps: at, ev };
}

/**
 * Música e sons em estilo 8-bit, sintetizados na hora (Web Audio): ondas quadradas
 * e triangulares e ruído, como nos consoles antigos. Nada de arquivos de áudio.
 *
 *  - music('menu' | 'battle' | null): troca de música com transição suave;
 *  - sfx('hit' | 'card' | …): pistas sonoras curtas.
 */

type Wave = 'square' | 'triangle' | 'sawtooth';
interface Note { step: number; len: number; freq: number }
interface Song { bpm: number; bars: number; lead: Note[]; arp: Note[]; bass: Note[]; kick: number[]; snare: number[]; hat: number[]; leadVol: number; arpVol: number }

const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n: string) => { const m = n.match(/^([A-G][#b]?)(\d)$/)!; return 440 * 2 ** ((SEMI[m[1]] + (+m[2] - 4) * 12 - 9) / 12); };

/** "A4:2 C5:2 -:4" → notas (o passo é uma semicolcheia; "-" é pausa). */
function line(src: string): Note[] {
  const out: Note[] = [];
  let step = 0;
  for (const tok of src.trim().split(/\s+/)) {
    const [n, l] = tok.split(':');
    const len = +l;
    if (n !== '-') out.push({ step, len, freq: hz(n) });
    step += len;
  }
  return out;
}
/** Um compasso de arpejo em colcheias por acorde. */
const arps = (chords: string[][], per = 2) => line(chords.map((c) => c.map((n) => `${n}:${per}`).join(' ')).join(' '));

// ── tema da seleção de heróis: aventura calma, em ré menor ──
const MENU: Song = {
  bpm: 96, bars: 8, leadVol: 0.16, arpVol: 0.07,
  lead: line(`A4:4 D5:4 F5:6 E5:2  D5:8 -:4 A4:2 C5:2  D5:4 F5:4 Bb5:6 A5:2  F5:8 -:8
              A5:4 G5:4 F5:4 C5:4  F5:6 E5:2 C5:8  E5:4 G5:4 C6:4 G5:4  A5:6 G5:2 E5:4 C#5:4`),
  arp: arps([
    ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3'], ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3'],
    ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'D4', 'Bb3', 'F3'], ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'D4', 'Bb3', 'F3'],
    ['F3', 'C4', 'F4', 'A4', 'C5', 'A4', 'F4', 'C4'], ['F3', 'C4', 'F4', 'A4', 'C5', 'A4', 'F4', 'C4'],
    ['C3', 'G3', 'C4', 'E4', 'G4', 'E4', 'C4', 'G3'], ['A2', 'E3', 'A3', 'C#4', 'E4', 'C#4', 'A3', 'E3'],
  ]),
  bass: line('D2:16 D2:16 Bb1:16 Bb1:16 F2:16 F2:16 C2:16 A1:16'),
  kick: [], snare: [], hat: [],
};

// ── tema de batalha: rápido, em lá menor ──
const BATTLE: Song = {
  bpm: 150, bars: 8, leadVol: 0.15, arpVol: 0.055,
  lead: line(`A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2  A5:4 G5:2 E5:2 D5:4 E5:4  F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:4  B5:4 G5:4 D5:4 B4:4
              A4:2 C5:2 E5:2 A5:2 B5:2 C6:2 B5:2 A5:2  E6:6 D6:2 C6:4 A5:4  F5:2 G5:2 A5:2 C6:2 A5:2 G5:2 F5:2 A5:2  G#5:4 B5:4 E6:4 E5:4`),
  arp: arps([
    ['A3', 'C4', 'E4', 'C4'], ['A3', 'C4', 'E4', 'C4'], ['A3', 'C4', 'E4', 'C4'], ['A3', 'C4', 'E4', 'C4'],
    ['F3', 'A3', 'C4', 'A3'], ['F3', 'A3', 'C4', 'A3'], ['G3', 'B3', 'D4', 'B3'], ['G3', 'B3', 'D4', 'B3'],
    ['A3', 'C4', 'E4', 'C4'], ['A3', 'C4', 'E4', 'C4'], ['A3', 'C4', 'E4', 'C4'], ['A3', 'C4', 'E4', 'C4'],
    ['F3', 'A3', 'C4', 'A3'], ['F3', 'A3', 'C4', 'A3'], ['E3', 'G#3', 'B3', 'G#3'], ['E3', 'G#3', 'B3', 'G#3'],
  ], 2),
  bass: line(`A1:2 A1:2 A2:2 A1:2 A1:2 A2:2 A1:2 G1:2  A1:2 A1:2 A2:2 A1:2 A1:2 A2:2 A1:2 E2:2
              F1:2 F1:2 F2:2 F1:2 F1:2 F2:2 F1:2 F2:2  G1:2 G1:2 G2:2 G1:2 G1:2 G2:2 G1:2 B1:2
              A1:2 A1:2 A2:2 A1:2 A1:2 A2:2 A1:2 G1:2  A1:2 A1:2 A2:2 A1:2 A1:2 A2:2 A1:2 E2:2
              F1:2 F1:2 F2:2 F1:2 F1:2 F2:2 F1:2 F2:2  E1:2 E1:2 E2:2 E1:2 E2:2 E2:2 G#1:2 B1:2`),
  kick: [0, 8, 10], snare: [4, 12], hat: [2, 6, 14],
};
const SONGS = { menu: MENU, battle: BATTLE };
export type SongId = keyof typeof SONGS;
export type Sfx = 'draw' | 'card' | 'select' | 'slash' | 'arrow' | 'magic' | 'hit' | 'block' | 'heal' | 'curse' | 'ward' | 'death' | 'summon' | 'levelup' | 'turn' | 'counter' | 'error' | 'victory' | 'defeat' | 'push';

const KEY = 'darkstar.som';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as { music?: number; sfx?: number; mute?: boolean }; } catch { return {}; } })();

class Chip {
  ctx: AudioContext | null = null;
  #master!: GainNode;
  #sfxBus!: GainNode;
  #noise!: AudioBuffer;
  #players = new Map<SongId, { gain: GainNode; next: number; step: number; timer: ReturnType<typeof setInterval> }>();
  #want: SongId | null = null;
  musicVol = saved.music ?? 0.6;
  sfxVol = saved.sfx ?? 0.8;
  muted = saved.mute ?? false;

  /** O navegador só deixa tocar depois de um gesto do usuário: liga no 1º clique/tecla. */
  constructor() {
    if (typeof window === 'undefined') return;
    const wake = () => { const c = this.#ensure(); if (!c) return; void c.resume().then(() => { if (this.#want && !this.#players.has(this.#want)) this.music(this.#want); }); };
    addEventListener('pointerdown', wake, { once: false });
    addEventListener('keydown', wake, { once: false });
  }

  #ensure(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.#master = this.ctx.createGain();
      this.#master.gain.value = this.muted ? 0 : 1;
      // um compressor leve evita estalos quando vários sons tocam juntos
      const comp = this.ctx.createDynamicsCompressor();
      this.#master.connect(comp).connect(this.ctx.destination);
      this.#sfxBus = this.ctx.createGain();
      this.#sfxBus.gain.value = this.sfxVol;
      this.#sfxBus.connect(this.#master);
      const n = this.ctx.sampleRate;
      this.#noise = this.ctx.createBuffer(1, n, n);
      const d = this.#noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  #save() { try { localStorage.setItem(KEY, JSON.stringify({ music: this.musicVol, sfx: this.sfxVol, mute: this.muted })); } catch { /* sem armazenamento local */ } }
  setMute(m: boolean) { this.muted = m; if (this.ctx) this.#master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05); this.#save(); }
  setMusicVol(v: number) { this.musicVol = v; const p = this.#want && this.#players.get(this.#want); if (p && this.ctx) p.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); this.#save(); }
  setSfxVol(v: number) { this.sfxVol = v; if (this.ctx) this.#sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); this.#save(); }

  // ───────────── vozes ─────────────

  #tone(out: AudioNode, wave: Wave, freq: number, t: number, dur: number, vol: number, opt: { to?: number; vib?: number } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t + dur);
    if (opt.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 7; lg.gain.value = opt.vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol * 0.75, t + Math.max(0.01, dur * 0.55));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.03);
  }

  #burst(out: AudioNode, t: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'highpass', to?: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.#noise; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  // ───────────── música ─────────────

  /** Troca a música (null = silêncio), com transição suave. */
  music(id: SongId | null, fade = 2.4): void {
    this.#want = id;
    const ctx = this.#ensure();
    if (!ctx || ctx.state !== 'running') return; // no navegador, começa no 1º gesto do usuário
    for (const [sid, p] of this.#players) {
      if (sid === id) continue;
      p.gain.gain.cancelScheduledValues(ctx.currentTime);
      p.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
      const timer = p.timer;
      setTimeout(() => { if (this.#want !== sid) { clearInterval(timer); if (this.#players.get(sid)?.timer === timer) this.#players.delete(sid); } }, fade * 1000 + 300);
    }
    if (!id) return;
    const cur = this.#players.get(id);
    if (cur) { cur.gain.gain.cancelScheduledValues(ctx.currentTime); cur.gain.gain.setTargetAtTime(this.musicVol, ctx.currentTime, fade / 4); return; }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(this.musicVol, ctx.currentTime, fade / 4);
    gain.connect(this.#master);
    const p = { gain, next: ctx.currentTime + 0.08, step: 0, timer: setInterval(() => this.#schedule(id), 60) };
    this.#players.set(id, p);
  }

  #schedule(id: SongId) {
    const ctx = this.ctx, p = this.#players.get(id);
    if (!ctx || !p) return;
    const song = SONGS[id], sec = 60 / song.bpm / 4, total = song.bars * 16;
    // a aba ficou em segundo plano: retoma do tempo atual, sem despejar notas atrasadas
    if (p.next < ctx.currentTime - 0.3) p.next = ctx.currentTime + 0.05;
    while (p.next < ctx.currentTime + 0.25) {
      const s = p.step, t = p.next, bar = s % 16;
      for (const n of song.lead) if (n.step === s) this.#tone(p.gain, 'square', n.freq, t, n.len * sec * 0.92, song.leadVol, { vib: n.len >= 6 ? 4 : 0 });
      for (const n of song.arp) if (n.step === s) this.#tone(p.gain, 'square', n.freq, t, n.len * sec * 0.7, song.arpVol);
      for (const n of song.bass) if (n.step === s) this.#tone(p.gain, 'triangle', n.freq, t, n.len * sec * 0.9, 0.3);
      if (song.kick.includes(bar)) this.#tone(p.gain, 'triangle', 150, t, 0.12, 0.5, { to: 45 });
      if (song.snare.includes(bar)) this.#burst(p.gain, t, 0.11, 0.2, 1400, 'bandpass');
      if (song.hat.includes(bar)) this.#burst(p.gain, t, 0.035, 0.07, 7000);
      p.step = (s + 1) % total;
      p.next += sec;
    }
  }

  // ───────────── pistas sonoras ─────────────

  sfx(name: Sfx): void {
    const ctx = this.#ensure();
    if (!ctx || ctx.state !== 'running') return;
    const o = this.#sfxBus, t = ctx.currentTime + 0.005;
    const seq = (notes: string[], step: number, vol = 0.2, wave: Wave = 'square', len = step * 1.6) => notes.forEach((n, i) => this.#tone(o, wave, hz(n), t + i * step, len, vol));
    switch (name) {
      case 'draw': this.#burst(o, t, 0.07, 0.12, 2500, 'bandpass', 5000); this.#tone(o, 'square', 700, t, 0.05, 0.06, { to: 1100 }); break;
      case 'select': this.#tone(o, 'square', 660, t, 0.05, 0.1); break;
      case 'card': this.#burst(o, t, 0.09, 0.14, 1800, 'bandpass', 600); seq(['E5', 'A5'], 0.06, 0.14); break;
      case 'slash': this.#burst(o, t, 0.16, 0.3, 5000, 'bandpass', 700); this.#tone(o, 'sawtooth', 900, t, 0.1, 0.07, { to: 200 }); break;
      case 'arrow': this.#burst(o, t, 0.18, 0.18, 900, 'bandpass', 4200); this.#tone(o, 'square', 1500, t + 0.02, 0.1, 0.06, { to: 700 }); break;
      case 'magic': seq(['E5', 'G5', 'B5', 'E6', 'G6'], 0.045, 0.13, 'square', 0.12); this.#tone(o, 'triangle', 330, t, 0.3, 0.16, { to: 990, vib: 14 }); break;
      case 'hit': this.#burst(o, t, 0.13, 0.4, 900, 'lowpass', 180); this.#tone(o, 'square', 170, t, 0.13, 0.26, { to: 55 }); break;
      case 'block': this.#tone(o, 'square', 1250, t, 0.09, 0.14); this.#tone(o, 'square', 1870, t + 0.03, 0.16, 0.1); this.#burst(o, t, 0.05, 0.16, 5000); break;
      case 'heal': seq(['C5', 'E5', 'G5', 'C6'], 0.07, 0.15, 'triangle', 0.2); break;
      case 'curse': this.#tone(o, 'sawtooth', 330, t, 0.35, 0.12, { to: 110, vib: 10 }); this.#tone(o, 'square', 233, t + 0.05, 0.3, 0.08, { to: 98 }); break;
      case 'ward': seq(['A5', 'E6'], 0.08, 0.13, 'triangle', 0.25); break;
      case 'push': this.#burst(o, t, 0.2, 0.2, 500, 'bandpass', 1800); this.#tone(o, 'triangle', 200, t, 0.18, 0.2, { to: 320 }); break;
      case 'summon': seq(['A3', 'E4', 'A4', 'C5', 'E5'], 0.055, 0.14, 'square', 0.14); this.#burst(o, t, 0.3, 0.08, 800, 'bandpass', 3000); break;
      case 'death': seq(['E4', 'C4', 'A3', 'F3'], 0.085, 0.18, 'square', 0.13); this.#burst(o, t, 0.3, 0.2, 700, 'lowpass', 120); break;
      case 'turn': seq(['A4', 'E5'], 0.1, 0.12, 'triangle', 0.3); break;
      case 'counter': seq(['B5', 'F5', 'B4'], 0.06, 0.16, 'square', 0.1); this.#burst(o, t, 0.2, 0.2, 3000, 'bandpass', 400); break;
      case 'error': this.#tone(o, 'square', 140, t, 0.09, 0.14); this.#tone(o, 'square', 110, t + 0.1, 0.13, 0.14); break;
      case 'levelup': seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.075, 0.17, 'square', 0.16); this.#tone(o, 'triangle', hz('C4'), t, 0.6, 0.2); break;
      case 'victory': seq(['C5', 'C5', 'C5', 'E5', 'G5', 'E5', 'G5', 'C6'], 0.13, 0.2, 'square', 0.2); seq(['C3', 'G3', 'C4', 'G3', 'C3', 'G3', 'C4', 'C4'], 0.13, 0.22, 'triangle', 0.2); this.#tone(o, 'square', hz('C6'), t + 8 * 0.13, 0.9, 0.2, { vib: 6 }); break;
      case 'defeat': seq(['A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3'], 0.16, 0.18, 'square', 0.24); seq(['A2', 'A2', 'F2', 'F2', 'D2', 'D2', 'E2', 'A1'], 0.16, 0.22, 'triangle', 0.3); break;
    }
  }
}

export const chip = new Chip();

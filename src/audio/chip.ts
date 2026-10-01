/**
 * Música e sons em estilo 8-bit, sintetizados na hora (Web Audio): ondas quadradas
 * e triangulares, uma "guitarra" distorcida e ruído para a bateria. Nada de arquivos de áudio.
 *
 *  - music('menu' | 'battle' | null): o clima pedido pela tela (troca com transição suave);
 *  - next() / pause() / resume() / stop(): o tocador (o que o jogador escolhe vale mais que a tela);
 *  - sfx('hit' | 'card' | …): pistas sonoras curtas.
 */
import { build, noteHz, TRACKS, type Mood, type Track } from './tracks';

type Wave = 'square' | 'triangle' | 'sawtooth';
export type Sfx = 'draw' | 'card' | 'select' | 'slash' | 'arrow' | 'magic' | 'hit' | 'block' | 'heal' | 'curse' | 'ward' | 'death' | 'summon' | 'levelup' | 'turn' | 'counter' | 'error' | 'victory' | 'defeat' | 'push';
export type { Mood };

const KEY = 'darkstar.som';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as { music?: number; sfx?: number; mute?: boolean }; } catch { return {}; } })();

interface Player { track: Track; gain: GainNode; gtr: GainNode; next: number; step: number; timer: ReturnType<typeof setInterval> }

class Chip {
  ctx: AudioContext | null = null;
  #master!: GainNode;
  #sfxBus!: GainNode;
  #noise!: AudioBuffer;
  #curve!: Float32Array<ArrayBuffer>;
  #tracks = new Map<string, Track>();
  #players = new Map<string, Player>();
  #index: Record<Mood, number> = { menu: 0, battle: 0 };
  #listeners = new Set<() => void>();
  /** Clima que a tela pede agora. */
  mood: Mood | null = null;
  /** O jogador pausou ou parou a música (vale até ele mandar tocar de novo). */
  paused = false;
  musicVol = saved.music ?? 0.6;
  sfxVol = saved.sfx ?? 0.8;
  muted = saved.mute ?? false;

  constructor() {
    if (typeof window === 'undefined') return;
    // o navegador só deixa tocar depois de um gesto do usuário
    const wake = () => { const c = this.#ensure(); if (!c) return; void c.resume().then(() => { if (this.mood && !this.paused && !this.#players.size) this.#play(); }); };
    addEventListener('pointerdown', wake);
    addEventListener('keydown', wake);
  }

  /** Faixa do clima atual (ou a última tocada). */
  get current(): Track | null {
    if (!this.mood) return null;
    const list = TRACKS.filter((t) => t.mood === this.mood);
    return this.#track(list[this.#index[this.mood] % list.length].id);
  }
  onchange(fn: () => void): () => void { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }
  #emit() { for (const fn of this.#listeners) fn(); }

  #track(id: string): Track {
    let t = this.#tracks.get(id);
    if (!t) { t = build(TRACKS.find((x) => x.id === id)!); this.#tracks.set(id, t); }
    return t;
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
      // curva de distorção da "guitarra"
      this.#curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = (i / 511.5) - 1; this.#curve[i] = Math.tanh(x * 7); }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  #save() { try { localStorage.setItem(KEY, JSON.stringify({ music: this.musicVol, sfx: this.sfxVol, mute: this.muted })); } catch { /* sem armazenamento local */ } }
  setMute(m: boolean) { this.muted = m; if (this.ctx) this.#master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05); this.#save(); this.#emit(); }
  setMusicVol(v: number) { this.musicVol = v; if (this.ctx) for (const p of this.#players.values()) if (p.track === this.current && !this.paused) p.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); this.#save(); }
  setSfxVol(v: number) { this.sfxVol = v; if (this.ctx) this.#sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); this.#save(); }

  // ───────────── vozes ─────────────

  #tone(out: AudioNode, wave: Wave, freq: number, t: number, dur: number, vol: number, opt: { to?: number; vib?: number } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t + dur);
    if (opt.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6.5; lg.gain.value = opt.vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
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

  /** A tela pede um clima (null = silêncio). Se o jogador pausou, só guarda o pedido. */
  music(mood: Mood | null, fade = 2.4): void {
    if (this.mood === mood) { if (mood && !this.paused && !this.#players.size) this.#play(fade); return; }
    this.mood = mood;
    this.#emit();
    if (!this.paused) this.#play(fade);
  }

  /** Toca a faixa atual do clima pedido (as outras somem aos poucos). */
  #play(fade = 2.4): void {
    const ctx = this.#ensure();
    if (!ctx || ctx.state !== 'running') return; // no navegador, começa no 1º gesto do usuário
    const track = this.mood && !this.paused ? this.current : null;
    for (const [id, p] of this.#players) {
      if (track && id === track.def.id) continue;
      p.gain.gain.cancelScheduledValues(ctx.currentTime);
      p.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
      this.#players.delete(id);
      setTimeout(() => { clearInterval(p.timer); p.gain.disconnect(); }, fade * 1000 + 300);
    }
    if (!track || this.#players.has(track.def.id)) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(this.musicVol, ctx.currentTime, fade / 4);
    gain.connect(this.#master);
    // canal da guitarra: distorção + filtro para tirar o chiado
    const gtr = ctx.createGain(), shaper = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), post = ctx.createGain();
    shaper.curve = this.#curve; shaper.oversample = '2x';
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    post.gain.value = 0.085;
    gtr.connect(shaper).connect(lp).connect(post).connect(gain);
    const id = track.def.id;
    const p: Player = { track, gain, gtr, next: ctx.currentTime + 0.08, step: 0, timer: setInterval(() => this.#schedule(id), 60) };
    this.#players.set(id, p);
  }

  #schedule(id: string) {
    const ctx = this.ctx, p = this.#players.get(id);
    if (!ctx || !p) return;
    const { track } = p, sec = 60 / track.def.bpm / 4;
    // a janela ficou em segundo plano: retoma do tempo atual, sem despejar notas atrasadas
    if (p.next < ctx.currentTime - 0.3) p.next = ctx.currentTime + 0.05;
    while (p.next < ctx.currentTime + 0.25) {
      const t = p.next, out = p.gain;
      for (const e of track.ev[p.step] ?? []) {
        const d = e.len * sec;
        switch (e.v) {
          case 'lead': this.#tone(out, 'square', e.f, t, d * 0.92, 0.15, { vib: e.len >= 6 ? 4 : 0 }); break;
          case 'harm': this.#tone(out, 'square', e.f, t, d * 0.9, 0.055); break;
          case 'arp': this.#tone(out, 'square', e.f, t, d * 0.7, 0.065); break;
          case 'bass': this.#tone(out, 'triangle', e.f, t, d * 0.9, 0.3); break;
          // acorde de força: tônica e quinta em dente de serra, pela distorção
          case 'gtr': this.#tone(p.gtr, 'sawtooth', e.f, t, d * 0.95, 0.5); this.#tone(p.gtr, 'sawtooth', e.f * 1.4983, t, d * 0.95, 0.4); break;
          case 'kick': this.#tone(out, 'triangle', 150, t, 0.12, 0.55, { to: 45 }); break;
          case 'snare': this.#burst(out, t, 0.12, 0.22, 1500, 'bandpass'); this.#tone(out, 'triangle', 190, t, 0.07, 0.16, { to: 120 }); break;
          case 'hat': this.#burst(out, t, 0.03, 0.055, 7500); break;
          case 'tom': this.#tone(out, 'triangle', e.f, t, 0.13, 0.4, { to: e.f * 0.6 }); break;
          case 'crash': this.#burst(out, t, 0.7, 0.13, 5200); break;
        }
      }
      p.next += sec;
      if (++p.step >= track.steps) {
        // terminou a faixa: passa para a próxima do mesmo clima (menos repetição)
        p.step = 0;
        if (this.mood === track.def.mood && TRACKS.filter((x) => x.mood === this.mood).length > 1) { setTimeout(() => this.next(1.2), 0); return; }
      }
    }
  }

  /** Próxima faixa do clima atual. */
  next(fade = 0.7): void {
    if (!this.mood) return;
    this.#index[this.mood]++;
    this.paused = false;
    this.#emit();
    this.#play(fade);
  }
  pause(): void { this.paused = true; this.#emit(); const ctx = this.ctx; if (!ctx) return; for (const p of this.#players.values()) { clearInterval(p.timer); p.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08); } }
  /** Volta a tocar: de onde parou (pausa) ou do começo (depois de parar). */
  resume(): void {
    this.paused = false;
    this.#emit();
    const ctx = this.#ensure();
    if (!ctx) return;
    const cur = this.current;
    for (const [id, p] of this.#players) {
      if (cur && id === cur.def.id) { p.next = ctx.currentTime + 0.06; p.gain.gain.setTargetAtTime(this.musicVol, ctx.currentTime, 0.1); clearInterval(p.timer); p.timer = setInterval(() => this.#schedule(id), 60); }
    }
    this.#play(0.6);
  }
  /** Para e volta a faixa ao começo. */
  stop(): void {
    this.pause();
    const ctx = this.ctx;
    for (const p of this.#players.values()) { p.gain.gain.cancelScheduledValues(ctx?.currentTime ?? 0); setTimeout(() => p.gain.disconnect(), 400); }
    this.#players.clear();
  }

  // ───────────── pistas sonoras ─────────────

  sfx(name: Sfx): void {
    const ctx = this.#ensure();
    if (!ctx || ctx.state !== 'running') return;
    const o = this.#sfxBus, t = ctx.currentTime + 0.005;
    const seq = (notes: string[], step: number, vol = 0.2, wave: Wave = 'square', len = step * 1.6) => notes.forEach((n, i) => this.#tone(o, wave, noteHz(n), t + i * step, len, vol));
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
      case 'levelup': seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.075, 0.17, 'square', 0.16); this.#tone(o, 'triangle', noteHz('C4'), t, 0.6, 0.2); break;
      case 'victory': seq(['C5', 'C5', 'C5', 'E5', 'G5', 'E5', 'G5', 'C6'], 0.13, 0.2, 'square', 0.2); seq(['C3', 'G3', 'C4', 'G3', 'C3', 'G3', 'C4', 'C4'], 0.13, 0.22, 'triangle', 0.2); this.#tone(o, 'square', noteHz('C6'), t + 8 * 0.13, 0.9, 0.2, { vib: 6 }); break;
      case 'defeat': seq(['A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'B3', 'A3'], 0.16, 0.18, 'square', 0.24); seq(['A2', 'A2', 'F2', 'F2', 'D2', 'D2', 'E2', 'A1'], 0.16, 0.22, 'triangle', 0.3); break;
    }
  }
}

export const chip = new Chip();

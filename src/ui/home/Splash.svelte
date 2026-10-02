<!--
  Tela de abertura: o logotipo de quem fez o jogo, numa tela velha que liga, falha e
  desliga. Tudo é desenhado numa grade de 640 × 360 e
  ampliado sem suavizar. Some sozinha; qualquer clique ou tecla pula na hora.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  let { ondone }: { ondone: () => void } = $props();
  let cv = $state<HTMLCanvasElement>();
  let px = $state(4);

  const W = 640, H = 360;
  /** Vermelho sangue do nome, de cima para baixo, e o "fantasma" roxo da falha. */
  const BLOOD = ['#a80f1a', '#8c0a14', '#8c0a14', '#6c060e'], GHOST = '#9a4dff';
  /** Tempo na tela. (Para conferir o desenho com calma: sessionStorage 'splash-hold' segura a abertura.) */
  /**
   * "Djabo" em letra de terminal antigo: cada letra tem 8 pontos de largura e 13 linhas
   * (da linha do alto das maiúsculas à perna do "j"); cada número é uma linha, em bits.
   */
  const NAME: number[][] = [
    [0xf8, 0x6c, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x6c, 0xf8, 0, 0, 0], // D
    [0x06, 0x06, 0x00, 0x0e, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x66, 0x66, 0x3c], // j
    [0, 0, 0, 0x78, 0x0c, 0x7c, 0xcc, 0xcc, 0xcc, 0x76, 0, 0, 0], // a
    [0xe0, 0x60, 0x60, 0x78, 0x6c, 0x66, 0x66, 0x66, 0x66, 0x7c, 0, 0, 0], // b
    [0, 0, 0, 0x7c, 0xc6, 0xc6, 0xc6, 0xc6, 0xc6, 0x7c, 0, 0, 0], // o
  ];
  const STAY = (() => { try { return sessionStorage.getItem('splash-hold') ? Infinity : 4.6; } catch { return 4.6; } })();

  onMount(() => {
    const out = cv!.getContext('2d')!;
    const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true })!; x.imageSmoothingEnabled = false; return x; };
    const base = mk(W, H), fb = mk(W, H), red = mk(W, H), cyan = mk(W, H);
    let name: { blood: HTMLCanvasElement; ghost: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null = null;
    const band = out.createLinearGradient(0, 0, W, 0);
    band.addColorStop(0, 'rgb(255 255 255 / 0)'); band.addColorStop(0.5, 'rgb(255 255 255 / .035)'); band.addColorStop(1, 'rgb(255 255 255 / 0)');
    let raf = 0, t0 = 0, exitAt = Infinity, exitLen = 520, over = false;

    /** A janela cabe um número inteiro de vezes na grade: cada ponto do desenho vira um quadrado exato. */
    const fit = () => {
      const d = devicePixelRatio || 1;
      const s = Math.max(1, Math.floor(Math.min((innerWidth * d) / W, (innerHeight * d) / H)));
      px = s / d;
    };
    fit();
    addEventListener('resize', fit);

    /** Texto em pontos duros (sem meio-tom): devolve a grade ligada/desligada, já aparada. */
    function dots(text: string, font: string, spacing = 0): { w: number; h: number; on: (x: number, y: number) => boolean } {
      const c = mk(360, 80);
      c.font = font; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff';
      (c as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
      c.fillText(text, 8, 56);
      const d = c.getImageData(0, 0, 360, 80).data;
      let x0 = 360, x1 = 0, y0 = 80, y1 = 0;
      for (let y = 0; y < 80; y++) for (let x = 0; x < 360; x++) if (d[(y * 360 + x) * 4 + 3] > 120) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < x0) return { w: 0, h: 0, on: () => false };
      return { w: x1 - x0 + 1, h: y1 - y0 + 1, on: (x, y) => x >= 0 && y >= 0 && x <= x1 - x0 && y <= y1 - y0 && d[((y + y0) * 360 + x + x0) * 4 + 3] > 120 };
    }

    function layout(img: HTMLImageElement | null) {
      // "Djabo": letra de terminal inclinada, ampliada 3× (pontos grandes, como numa tela antiga)
      const K = 3, LEAN = 3, ROWS = 13, CAP = 10;
      const m = { w: NAME.length * 8, h: ROWS, on: (x: number, y: number) => !!(NAME[x >> 3][y] & (0x80 >> (x & 7))) };
      const lean = Math.ceil(m.h / LEAN);
      const w = (m.w + lean) * K, h = m.h * K;
      const blood = mk(w, h), ghost = mk(w, h);
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (!m.on(x, y)) continue;
        const sx = (x + Math.floor((m.h - 1 - y) / LEAN)) * K;
        blood.fillStyle = BLOOD[Math.min(BLOOD.length - 1, Math.floor((y / CAP) * BLOOD.length))];
        blood.fillRect(sx, y * K, K, K);
        ghost.fillStyle = GHOST;
        ghost.fillRect(sx, y * K, K, K);
      }
      const iw = img?.width ?? 0, ih = img?.height ?? 0, GAP = 6;
      const gx = Math.round((W - (iw + GAP + w)) / 2), top = Math.round((H - (ih + 26)) / 2);
      base.clearRect(0, 0, W, H);
      if (img) base.drawImage(img, gx, top + 26);
      // "DEVELOPED BY", centralizado sobre o conjunto
      const by = dots('DEVELOPED BY', '400 8px "Silkscreen", monospace', 4);
      const bx = Math.round((W - by.w) / 2);
      base.fillStyle = '#b9aab0';
      for (let y = 0; y < by.h; y++) for (let x = 0; x < by.w; x++) if (by.on(x, y)) base.fillRect(bx + x, top + 6 + y, 1, 1);
      name = { blood: blood.canvas, ghost: ghost.canvas, x: gx + iw + GAP, y: top + 26 + Math.round((ih - CAP * K) / 2) + 8, w, h };
    }

    // ───── a falha: sorteada de novo a cada ~55 ms ─────
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    let step = -1, bands: { y: number; h: number; dx: number }[] = [], ca = 0, blank = false;
    let ghostDx = -2, cuts: { y: number; h: number; dx: number }[] = [], swap = false;
    let burst = { from: 0, to: 0, amp: 0 }, nextBurst = 1.9;

    function shuffle(g: number, t: number) {
      bands = [];
      for (let i = 0, n = Math.round(g * 7); i < n; i++) bands.push({ y: Math.floor(rnd(0, H)), h: Math.ceil(rnd(2, 4 + 30 * g)), dx: Math.round(rnd(-1, 1) * g * 46) });
      ca = Math.round(g * rnd(1, 5));
      blank = t < 0.75 && Math.random() < 0.22;
      // o nome falha sozinho, mesmo com a tela calma: o fantasma roxo treme e fatias das letras escorregam
      const r = Math.random();
      ghostDx = r < 0.16 || g > 0.3 ? Math.round(rnd(-6, 5)) : -2;
      swap = g > 0.5 && Math.random() < 0.3;
      cuts = [];
      if (name && (r > 0.86 || g > 0.25)) for (let i = 0, n = 1 + Math.floor(rnd(0, 3)); i < n; i++) cuts.push({ y: 3 * Math.floor(rnd(0, name.h / 3 - 1)), h: 3 * Math.ceil(rnd(0, 3)), dx: 3 * Math.round(rnd(-4, 4)) });
    }

    function drawName() {
      if (!name) return;
      const n = name;
      // primeiro tudo inteiro, depois as fatias escorregadas por cima (limpa a faixa e redesenha deslocada)
      fb.drawImage(swap ? n.blood : n.ghost, n.x + ghostDx, n.y);
      fb.drawImage(swap ? n.ghost : n.blood, n.x, n.y);
      for (const c of cuts) {
        fb.fillStyle = '#000';
        fb.fillRect(n.x - 8, n.y + c.y, n.w + 16, c.h);
        fb.drawImage(n.ghost, 0, c.y, n.w, c.h, n.x + c.dx + ghostDx * 2, n.y + c.y, n.w, c.h);
        fb.drawImage(n.blood, 0, c.y, n.w, c.h, n.x + c.dx, n.y + c.y, n.w, c.h);
      }
    }

    /** A tela abre (e fecha) a partir de uma linha no meio, como um tubo antigo. */
    function shutter(open: number, line: number) {
      const hh = Math.max(1, Math.round((H / 2) * open));
      out.fillStyle = '#000';
      out.fillRect(0, 0, W, H / 2 - hh);
      out.fillRect(0, H / 2 + hh, W, H / 2 - hh);
      if (open <= 0.02) {
        out.fillRect(0, 0, W, H);
        const lw = Math.round(W * line);
        out.fillStyle = '#fff';
        out.fillRect(Math.round((W - lw) / 2), H / 2 - 1, lw, 1);
        out.fillStyle = 'rgb(255 80 90 / .55)';
        out.fillRect(Math.round((W - lw) / 2), H / 2, lw, 1);
      }
    }

    function frame(now: number) {
      if (over) return;
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      if (t >= STAY && exitAt === Infinity) leave(false);
      const e = exitAt === Infinity ? -1 : Math.min(1, (now - exitAt) / exitLen);
      if (e >= 1) { finish(); return; }

      // força da falha: forte ao ligar, some aos poucos, volta em rajadas curtas e no desligar
      let g = t < 0.4 ? 1 : t < 1.5 ? Math.pow(1 - (t - 0.4) / 1.1, 2) : 0;
      if (t > nextBurst) { burst = { from: t, to: t + rnd(0.1, 0.24), amp: rnd(0.25, 0.6) }; nextBurst = t + rnd(0.9, 1.9); }
      if (t >= burst.from && t < burst.to) g = Math.max(g, burst.amp);
      if (e >= 0) g = 1;
      const s = Math.floor(now / 55);
      if (s !== step) { step = s; shuffle(g, t); }

      // o quadro inteiro, ainda sem falha de tela
      fb.fillStyle = '#000';
      fb.fillRect(0, 0, W, H);
      if (!blank) { fb.drawImage(base.canvas, 0, 0); drawName(); }

      out.globalCompositeOperation = 'source-over';
      out.globalAlpha = 1;
      out.fillStyle = '#000';
      out.fillRect(0, 0, W, H);
      if (ca === 0 && !bands.length) out.drawImage(fb.canvas, 0, 0);
      else {
        // vermelho para um lado, verde e azul para o outro; fatias da imagem escorregam de lado
        for (const [c, tint] of [[red, '#ff0000'], [cyan, '#00ffff']] as const) {
          c.globalCompositeOperation = 'source-over'; c.drawImage(fb.canvas, 0, 0);
          c.globalCompositeOperation = 'multiply'; c.fillStyle = tint; c.fillRect(0, 0, W, H);
        }
        const put = (y: number, h: number, dx: number) => {
          out.globalCompositeOperation = 'source-over';
          out.fillStyle = '#000'; out.fillRect(0, y, W, h);
          out.globalCompositeOperation = 'lighter';
          out.drawImage(red.canvas, 0, y, W, h, dx - ca, y, W, h);
          out.drawImage(cyan.canvas, 0, y, W, h, dx + ca, y, W, h);
        };
        put(0, H, 0);
        for (const b of bands) put(b.y, Math.min(b.h, H - b.y), b.dx);
        out.globalCompositeOperation = 'source-over';
      }
      // chuvisco, e uma faixa clara que desce devagar pela tela
      for (let i = 0, n = 5 + Math.round(g * 150); i < n; i++) {
        out.fillStyle = Math.random() < 0.2 ? `rgb(255 40 60 / ${rnd(0.1, 0.5)})` : `rgb(255 255 255 / ${rnd(0.04, 0.3)})`;
        out.fillRect(Math.floor(rnd(0, W)), Math.floor(rnd(0, H)), g > 0.3 && Math.random() < 0.3 ? Math.ceil(rnd(2, 26)) : 1, 1);
      }
      out.fillStyle = band;
      out.fillRect(0, ((t * 34) % (H + 30)) - 30, W, 14);
      if (Math.random() < 0.06 + g * 0.3) { out.fillStyle = `rgb(0 0 0 / ${rnd(0.05, 0.22)})`; out.fillRect(0, 0, W, H); }

      // ligar: uma linha que cresce, depois a tela abre com um clarão
      if (t < 0.14) shutter(0, t / 0.14);
      else if (t < 0.36) { const p = (t - 0.14) / 0.22; shutter(p * p, 1); out.fillStyle = `rgb(255 255 255 / ${0.5 * (1 - p)})`; out.fillRect(0, 0, W, H); }
      // desligar: a falha toma a tela, ela fecha numa linha e a linha some
      if (e > 0.4) { const p = (e - 0.4) / 0.6; if (p < 0.6) shutter(Math.pow(1 - p / 0.6, 2), 1); else shutter(0, 1 - (p - 0.6) / 0.4); }
    }

    function finish() {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      ondone();
    }
    function leave(fast: boolean) {
      if (exitAt !== Infinity) return;
      if (!t0) { finish(); return; }
      exitAt = performance.now();
      exitLen = fast ? 300 : 620;
      // a animação para quando a janela não está à vista: a saída não pode depender dela
      setTimeout(finish, exitLen + 120);
    }
    const guard = Number.isFinite(STAY) ? setTimeout(() => leave(false), STAY * 1000 + 1600) : undefined;
    const skip = (e: Event) => { e.preventDefault(); e.stopPropagation(); leave(true); };

    // espera a figura e as fontes (sem travar a abertura se algo faltar)
    const img = new Image();
    img.src = new URL('ui/estudio.webp', document.baseURI).toString();
    const wait = Promise.all([
      img.decode().then(() => img, () => null),
      document.fonts.load('400 8px "Silkscreen"', 'DEVELOPED BY').catch(() => undefined),
    ]);
    void Promise.race([wait, new Promise<null>((ok) => setTimeout(() => ok(null), 1500))]).then((r) => {
      if (over) return;
      layout(r ? r[0] : img.complete && img.naturalWidth ? img : null);
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    });

    addEventListener('keydown', skip, true);
    cv!.parentElement!.addEventListener('pointerdown', skip);
    return () => { over = true; clearTimeout(guard); cancelAnimationFrame(raf); removeEventListener('keydown', skip, true); removeEventListener('resize', fit); };
  });
</script>

<div class="splash" style="--p:{px}px">
  <canvas bind:this={cv} width={W} height={H} style="width:{W * px}px;height:{H * px}px" aria-label="Developed by Djabo"></canvas>
  <span class="scan"></span>
  <span class="tube"></span>
</div>

<style>
  .splash { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; background: #000; cursor: default; user-select: none; overflow: hidden; }
  canvas { grid-area: 1 / 1; image-rendering: pixelated; display: block; }
  /* linhas de varredura (uma por ponto do desenho) e o escurecido das bordas do tubo */
  .scan, .tube { grid-area: 1 / 1; position: absolute; inset: 0; pointer-events: none; }
  .scan { background: repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--p) * .62), rgb(0 0 0 / .34) calc(var(--p) * .62), rgb(0 0 0 / .34) var(--p)); }
  .tube { background: radial-gradient(ellipse 60% 50% at 50% 50%, rgb(150 10 24 / .1), transparent 70%), radial-gradient(ellipse at 50% 50%, transparent 52%, rgb(0 0 0 / .72) 100%); animation: hum 2.4s steps(12) infinite; }
  @keyframes hum { 0%, 100% { opacity: 1; } 37% { opacity: .9; } 61% { opacity: .97; } 83% { opacity: .86; } }
</style>

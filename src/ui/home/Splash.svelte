<!--
  Tela de abertura: o logotipo de quem fez o jogo, sobre preto. Some sozinha depois
  de alguns segundos; qualquer clique ou tecla pula na hora.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  let { ondone }: { ondone: () => void } = $props();
  let leaving = $state(false);
  let name = $state<HTMLCanvasElement>();
  let ready = $state(false);

  function leave(fast = false) {
    if (leaving) return;
    leaving = true;
    setTimeout(ondone, fast ? 260 : 700);
  }
  const skip = (e: Event) => { e.preventDefault(); e.stopPropagation(); leave(true); };

  /**
   * "Djabo" em letra gótica, desenhado pequeno e ampliado sem suavizar: vira pixel art,
   * do mesmo grão do resto do jogo. De osso (em cima) a sangue (embaixo), com contorno escuro.
   */
  async function drawName() {
    const c = name;
    if (!c) return;
    const font = '700 46px "Grenze Gotisch", "Cinzel", serif';
    try { await document.fonts.load(font, 'Djabo'); } catch { /* usa a fonte de reserva */ }
    const W = 176, H = 64;
    const mk = () => { const k = document.createElement('canvas'); k.width = W; k.height = H; return k; };
    const text = mk(), tx = text.getContext('2d', { willReadFrequently: true })!;
    tx.font = font; tx.textBaseline = 'alphabetic'; tx.fillStyle = '#fff';
    tx.fillText('Djabo', 6, 46);
    // letras de contorno duro (sem meio-tom): cada ponto é do texto ou não é
    const a = tx.getImageData(0, 0, W, H), d = a.data;
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 110;
    c.width = W; c.height = H;
    const out = c.getContext('2d')!;
    const img = out.createImageData(W, H), o = img.data;
    const put = (x: number, y: number, r: number, g: number, b: number) => { const i = (y * W + x) * 4; o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; };
    // faixas de cor, de cima para baixo (degradê em degraus, como na pixel art)
    const bands: [number, number, number][] = [[255, 244, 226], [255, 214, 170], [255, 150, 96], [236, 70, 48], [176, 22, 26], [112, 8, 20]];
    let top = H, bottom = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (on(x, y)) {
        const [r, g, b] = bands[Math.min(bands.length - 1, Math.floor(((y - top) / Math.max(1, bottom - top + 1)) * bands.length))];
        // brilho na aresta de cima de cada traço
        if (!on(x, y - 1)) put(x, y, 255, 255, 255); else put(x, y, r, g, b);
      } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || on(x - 1, y - 1) || on(x - 2, y - 2) || on(x - 1, y - 2) || on(x - 2, y - 1)) {
        put(x, y, 40, 0, 8); // contorno e sombra, para baixo e para a direita
      }
    }
    out.putImageData(img, 0, 0);
    ready = true;
  }

  onMount(() => {
    void drawName();
    const t = setTimeout(() => leave(), 4200);
    addEventListener('keydown', skip, true);
    return () => { clearTimeout(t); removeEventListener('keydown', skip, true); };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="splash" class:leaving onpointerdown={skip}>
  <div class="mark" class:ready>
    <span class="by">Developed by</span>
    <div class="row">
      <span class="pic"><img src="ui/estudio.webp" alt="" draggable="false" /></span>
      <span class="name"><canvas bind:this={name} aria-label="Djabo"></canvas><i></i></span>
    </div>
  </div>
</div>

<style>
  .splash { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; background: #000; cursor: default; user-select: none; transition: opacity .7s ease; }
  .splash.leaving { opacity: 0; transition-duration: .26s; pointer-events: none; }
  .mark { display: grid; justify-items: center; gap: min(2.2vh, 22px); opacity: 0; }
  .mark.ready { animation: arrive 1.1s .15s cubic-bezier(.2, .7, .3, 1) forwards; }
  @keyframes arrive { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
  .by { font: 400 clamp(13px, 2.1vh, 22px) var(--pixel); letter-spacing: .5em; padding-left: .5em; text-transform: uppercase; color: #b3a0a6; }
  .row { display: flex; align-items: center; gap: min(2.4vw, 34px); }
  .pic { position: relative; display: block; height: min(56vh, 620px); aspect-ratio: 1; }
  .pic img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; display: block;
    /* as bordas do desenho somem no preto da tela */
    mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 78%, transparent 100%); -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 78%, transparent 100%); }
  .pic::after { content: ''; position: absolute; inset: 12% 8%; border-radius: 50%; background: radial-gradient(circle, rgb(255 40 30 / .16), transparent 68%); mix-blend-mode: screen; animation: ember 3.2s ease-in-out infinite; pointer-events: none; }
  @keyframes ember { 50% { opacity: .45; } }
  .name { display: grid; gap: min(1vh, 10px); justify-items: start; }
  .name canvas { height: min(24vh, 230px); width: auto; image-rendering: pixelated; filter: drop-shadow(0 0 22px rgb(255 50 30 / .35)); }
  /* traço sob o nome: uma lâmina que afina para a direita */
  .name i { width: 92%; height: 4px; margin-left: 4%; background: linear-gradient(90deg, #ff5a3c, #b0161a 55%, transparent); }
  @media (max-width: 760px) { .row { flex-direction: column; } .name { justify-items: center; } }
</style>

<!--
  Tela inicial: o sol eclipsado sobre o vazio, o nome do jogo dentro do disco negro
  e o menu principal. A arte é pixel art (gerada no fluxo de artes do projeto); por
  cima dela, só vida: a coroa pulsa, as estrelas piscam e as brasas sobem.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { L } from '../../app/i18n.svelte';
  import { app } from '../../store/project.svelte';
  import { router } from '../../app/router.svelte';
  import { host, settings } from '../../app/settings.svelte';
  import { ui } from '../../app/ui.svelte';
  import { chip } from '../../audio/chip';

  interface Item { id: string; pt: string; en: string; hint: [string, string]; go?: () => void; wip?: boolean }
  const ITEMS: Item[] = [
    { id: 'campaign', pt: 'Campanha', en: 'Campaign', wip: true, hint: ['Um mundo aberto, uma história e batalhas contra criaturas e chefes.', 'An open world, a story and battles against creatures and bosses.'] },
    { id: 'battle', pt: 'Modo batalha', en: 'Battle mode', go: () => router.go('/batalha'), hint: ['Escolha o seu herói e enfrente um oponente.', 'Pick your hero and face an opponent.'] },
    { id: 'heroes', pt: 'Criação de personagem', en: 'Character creation', go: () => router.go('/heroi'), hint: ['Crie heróis: ancestralidade, atributos, aparência e equipamento.', 'Create heroes: ancestry, attributes, look and equipment.'] },
    { id: 'decks', pt: 'Construtor de decks', en: 'Deck builder', go: () => router.go('/decks'), hint: ['Crie e edite cartas, decks e coleções.', 'Create and edit cards, decks and collections.'] },
    { id: 'settings', pt: 'Configurações', en: 'Settings', go: () => router.go('/ajustes'), hint: ['Vídeo, som, jogo e controles.', 'Video, sound, game and controls.'] },
    { id: 'about', pt: 'Sobre o jogo', en: 'About the game', go: () => router.go('/sobre'), hint: ['O que é o Void Sun, versão e créditos.', 'What Void Sun is, version and credits.'] },
  ];
  const canQuit = !!host();
  let focused = $state('battle');
  const hint = $derived.by(() => {
    if (focused === 'quit') return L('Fecha o jogo. Tudo já está salvo.', 'Closes the game. Everything is already saved.');
    const it = ITEMS.find((i) => i.id === focused);
    return it ? L(it.hint[0], it.hint[1]) : '';
  });

  async function quit() {
    const r = await ui.confirm({ title: L('Sair do jogo?', 'Quit the game?'), text: L('Tudo já está salvo.', 'Everything is already saved.'), ok: L('Sair', 'Quit') });
    if (r === 'ok') host()?.quit();
  }
  function setLang(l: 'pt-BR' | 'en-US') {
    app.updateProject((p) => { p.lang = l; });
    document.documentElement.lang = l;
  }

  // céu: estrelas e brasas em posições sorteadas uma vez (sempre as mesmas, para a tela não "pular")
  const rnd = (() => { let s = 20261002; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const STARS = Array.from({ length: 70 }, () => ({ x: rnd() * 100, y: rnd() * 62, d: rnd() * 6, t: 2.4 + rnd() * 4, big: rnd() < 0.18 }));
  const EMBERS = Array.from({ length: 26 }, () => ({ x: rnd() * 100, d: rnd() * 14, t: 9 + rnd() * 10, drift: (rnd() - 0.5) * 8, hue: rnd() < 0.5 }));

  // a arte desliza um pouco com o mouse (profundidade)
  let px = $state(0), py = $state(0);
  function parallax(e: MouseEvent) {
    if (settings.v.quality === 'low') return;
    px = (e.clientX / innerWidth - 0.5) * -14;
    py = (e.clientY / innerHeight - 0.5) * -8;
  }
  let first = $state<HTMLButtonElement>();
  onMount(() => {
    chip.music('menu');
    first?.focus({ preventScroll: true });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="home" onmousemove={parallax}>
  <div class="art ambient" style="--px:{px}px; --py:{py}px">
    <img src="ui/titulo.webp" alt="" draggable="false" />
    <div class="stars">{#each STARS as s}<i class:big={s.big} style="left:{s.x}%; top:{s.y}%; animation-delay:-{s.d}s; animation-duration:{s.t}s"></i>{/each}</div>
    <div class="corona"></div>
    <div class="flare"></div>
    <div class="embers">{#each EMBERS as e}<i class:v={e.hue} style="left:{e.x}%; animation-delay:-{e.d}s; animation-duration:{e.t}s; --dx:{e.drift}cqw"></i>{/each}</div>
    <div class="logo">
      <span class="word">Void</span>
      <span class="word sun">Sun</span>
      <span class="tag">{L('RPG de cartas', 'A card RPG')}</span>
    </div>
  </div>
  <div class="shade"></div>

  <nav class="menu" aria-label={L('Menu principal', 'Main menu')}>
    {#each ITEMS as it, i (it.id)}
      {#if it.wip}
        <div class="item wip" style="--i:{i}" aria-disabled="true">
          <span class="cur"></span><span class="tx">{L(it.pt, it.en)}</span><span class="wip-tag">{L('Em construção', 'Work in progress')}</span>
        </div>
      {:else if it.id === 'battle'}
        <button class="item" class:on={focused === it.id} style="--i:{i}" bind:this={first} data-focus-first onclick={it.go} onfocus={() => (focused = it.id)} onmouseenter={(e) => { focused = it.id; (e.currentTarget as HTMLElement).focus({ preventScroll: true }); }}>
          <span class="cur"></span><span class="tx">{L(it.pt, it.en)}</span>
        </button>
      {:else}
        <button class="item" class:on={focused === it.id} style="--i:{i}" onclick={it.go} onfocus={() => (focused = it.id)} onmouseenter={(e) => { focused = it.id; (e.currentTarget as HTMLElement).focus({ preventScroll: true }); }}>
          <span class="cur"></span><span class="tx">{L(it.pt, it.en)}</span>
        </button>
      {/if}
    {/each}
    {#if canQuit}
      <button class="item quit" class:on={focused === 'quit'} style="--i:{ITEMS.length}" onclick={quit} onfocus={() => (focused = 'quit')} onmouseenter={(e) => { focused = 'quit'; (e.currentTarget as HTMLElement).focus({ preventScroll: true }); }}>
        <span class="cur"></span><span class="tx">{L('Sair', 'Quit')}</span>
      </button>
    {/if}
    <p class="hint">{hint}</p>
  </nav>

  <footer class="foot">
    <span class="ver">Void Sun v{__APP_VERSION__}<small>{__APP_BUILD__}</small></span>
    <span class="keys"><b>↑ ↓</b> {L('navegar', 'navigate')} <b>Enter</b> {L('confirmar', 'confirm')} <b>Esc</b> {L('menu', 'menu')}</span>
    <span class="lang">
      <button class:on={app.lang === 'pt-BR'} onclick={() => setLang('pt-BR')}>PT</button>
      <button class:on={app.lang === 'en-US'} onclick={() => setLang('en-US')}>EN</button>
    </span>
  </footer>
</div>

<style>
  .home { position: relative; height: 100%; overflow: hidden; background: #05040a; user-select: none; }

  /* a arte cobre a tela inteira mantendo a proporção; tudo o que vai por cima dela usa as mesmas medidas (cqw) */
  .art { position: absolute; left: 50%; top: 50%; width: max(100vw, calc(100vh * 1920 / 1088)); aspect-ratio: 1920 / 1088; container-type: size;
    transform: translate(calc(-50% + var(--px, 0px)), calc(-50% + var(--py, 0px))) scale(1.03); transition: transform .5s cubic-bezier(.2, .7, .3, 1); animation: breathe 26s ease-in-out infinite alternate; }
  @keyframes breathe { from { scale: 1; } to { scale: 1.035; } }
  .art img { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; display: block; animation: reveal 1.6s ease-out both; }
  @keyframes reveal { from { opacity: 0; filter: brightness(.2); } }

  .stars i { position: absolute; width: .16cqw; height: .16cqw; min-width: 2px; min-height: 2px; background: #e9defa; opacity: .15; animation: twinkle 4s steps(4) infinite; }
  .stars i.big { width: .26cqw; height: .26cqw; min-width: 3px; min-height: 3px; background: #fff3d6; box-shadow: 0 0 .5cqw rgb(255 230 180 / .8); }
  @keyframes twinkle { 0%, 100% { opacity: .1; } 50% { opacity: .95; } }

  /* coroa do eclipse: um halo que respira em volta do disco (centro em 51% × 32%, raio de 15,6% da largura) */
  .corona { position: absolute; left: 51%; top: 32%; width: 32.4cqw; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; mix-blend-mode: screen; pointer-events: none;
    box-shadow: 0 0 3cqw .6cqw rgb(255 214 235 / .34), 0 0 9cqw 2cqw rgb(190 120 255 / .22), inset 0 0 2.2cqw .2cqw rgb(255 220 240 / .2); animation: pulse 5.5s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
  .flare { position: absolute; left: 66%; top: 26%; width: 34cqw; height: 9cqw; pointer-events: none; mix-blend-mode: screen; background: radial-gradient(ellipse at 0% 60%, rgb(170 90 255 / .3), transparent 70%); animation: pulse 7s ease-in-out infinite reverse; }

  .embers { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .embers i { position: absolute; bottom: -2%; width: .22cqw; height: .22cqw; min-width: 3px; min-height: 3px; background: #ffd9a8; box-shadow: 0 0 .7cqw rgb(255 190 120 / .9); opacity: 0; animation: rise 14s linear infinite; }
  .embers i.v { background: #d9b8ff; box-shadow: 0 0 .7cqw rgb(180 120 255 / .9); }
  @keyframes rise { 0% { transform: translate(0, 0); opacity: 0; } 12% { opacity: .9; } 80% { opacity: .5; } 100% { transform: translate(var(--dx, 0), -62cqh); opacity: 0; } }

  /* o nome do jogo, dentro do disco negro */
  .logo { position: absolute; left: 51%; top: 32%; transform: translate(-50%, -50%); display: grid; justify-items: center; line-height: .9; text-align: center; animation: logoin 2.2s .5s cubic-bezier(.2, .7, .3, 1) both; }
  @keyframes logoin { from { opacity: 0; transform: translate(-50%, -46%); filter: blur(.4cqw); } }
  .word { font: 700 6.3cqw var(--pixel); letter-spacing: .1em; padding-left: .1em; text-transform: uppercase; color: #fff4dc;
    background: linear-gradient(180deg, #ffffff 8%, #ffe9c4 42%, #f0a8d8 78%, #b98bff 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 .28cqw 0 #3a1d5c) drop-shadow(0 0 1.4cqw rgb(255 190 230 / .45)); }
  .word.sun { letter-spacing: .34em; padding-left: .34em; }
  .tag { margin-top: 1.5cqw; font: 400 .92cqw var(--pixel); letter-spacing: .62em; padding-left: .62em; text-transform: uppercase; color: #cdb6f2; opacity: .85; white-space: nowrap; }

  .shade { position: absolute; inset: 0; pointer-events: none; background:
    linear-gradient(90deg, rgb(5 4 10 / .78) 0%, rgb(5 4 10 / .42) 22%, transparent 42%),
    radial-gradient(ellipse at 50% 45%, transparent 55%, rgb(3 2 7 / .7) 100%),
    linear-gradient(0deg, rgb(5 4 10 / .8), transparent 16%); }

  .menu { position: absolute; left: clamp(28px, 5.2vw, 110px); top: 50%; transform: translateY(-46%); display: flex; flex-direction: column; align-items: flex-start; gap: clamp(2px, .5vh, 8px); width: min(460px, 44vw); }
  .item { position: relative; display: flex; align-items: center; gap: 14px; padding: clamp(6px, 1vh, 11px) 16px clamp(6px, 1vh, 11px) 6px; border: 0; background: none; cursor: pointer; text-align: left;
    font: 400 clamp(15px, 2.6vh, 26px) var(--pixel); letter-spacing: .1em; text-transform: uppercase; color: #b9aed6; text-shadow: 0 3px 0 #05040a, 0 0 18px #05040a;
    opacity: 0; animation: itemin .6s calc(.9s + var(--i) * .08s) cubic-bezier(.2, .7, .3, 1) forwards; transition: color .12s, transform .16s cubic-bezier(.2, .7, .3, 1); }
  @keyframes itemin { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; } }
  .item:focus { outline: none !important; box-shadow: none !important; }
  .cur { width: .8em; height: .8em; flex: none; border-radius: 50%; background: #05040a; opacity: 0; transform: scale(.4); transition: opacity .12s, transform .18s cubic-bezier(.3, 1.6, .5, 1);
    box-shadow: 0 0 0 .13em #fff0c8, 0 0 .7em .12em rgb(255 200 120 / .9), 0 0 1.6em .4em rgb(190 120 255 / .5); }
  .item.on { color: #fff3d2; transform: translateX(10px); text-shadow: 0 3px 0 #3a1d5c, 0 0 22px rgb(255 200 140 / .55); }
  .item.on .cur { opacity: 1; transform: scale(1); }
  .item.on::after { content: ''; position: absolute; left: 2.1em; right: 6px; bottom: 2px; height: 2px; background: linear-gradient(90deg, #f6d691, transparent); }
  .item.wip { cursor: default; color: #5d5578; text-shadow: 0 3px 0 #05040a; }
  .item.wip .tx { text-decoration: line-through; text-decoration-color: rgb(93 85 120 / .5); text-decoration-thickness: 2px; }
  .item.quit { margin-top: clamp(4px, 1.4vh, 16px); font-size: clamp(13px, 1.8vh, 18px); color: #8f86ab; }
  .item.quit.on { color: #ffb4ad; }
  .hint { min-height: 2.8em; margin: clamp(8px, 2vh, 22px) 0 0 2.6em; max-width: 380px; font: 400 clamp(12.5px, 1.6vh, 15px)/1.4 var(--pixel-text); color: #c9bfe2; text-shadow: 0 2px 0 #05040a; opacity: 0; animation: itemin .6s 1.7s forwards; }

  .foot { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px clamp(18px, 2.4vw, 40px); font: 400 10px var(--pixel); letter-spacing: .1em; text-transform: uppercase; color: #8f86ab; }
  .ver { display: flex; gap: 10px; align-items: baseline; } .ver small { opacity: .6; text-transform: none; letter-spacing: .04em; }
  .keys b { display: inline-block; margin: 0 4px 0 12px; padding: 2px 6px; border: 2px solid #4a417a; color: #d9cff2; font-weight: 400; }
  .lang { display: flex; gap: 4px; }
  .lang button { width: 38px; height: 26px; border: 2px solid #3a3260; background: rgb(10 8 18 / .7); color: #8f86ab; font: 400 10px var(--pixel); cursor: pointer; }
  .lang button.on { border-color: var(--accent); color: var(--accent-2); }
  @media (max-width: 820px) { .keys { display: none; } }
</style>

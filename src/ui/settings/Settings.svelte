<!--
  Configurações do jogo: vídeo, som, jogo, controles e dados.
  Tudo vale na hora e fica guardado neste computador.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Monitor, Volume2, Gamepad2, Swords, HardDrive, Download, Upload, FileSpreadsheet, Trash, RotateCcw, Maximize, AppWindow, Fullscreen, Keyboard } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { pruneRenders, storageEstimate, db } from '../../store/db';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { router } from '../../app/router.svelte';
  import { host, KEY_ACTIONS, settings, type DisplayMode, type KeyAction, type Quality } from '../../app/settings.svelte';
  import { DIFFICULTIES } from '../../game/bot';
  import { renderKey } from '../../render/card';
  import { exportBackup, exportCsv, importBackup } from '../../export/exporters.svelte';
  import { ctxFor } from '../common/cardCtx';
  import { chip } from '../../audio/chip';
  import ScreenBar from '../common/ScreenBar.svelte';

  type Tab = 'video' | 'audio' | 'game' | 'controls' | 'data';
  const TABS: { id: Tab; icon: typeof Monitor; pt: string; en: string }[] = [
    { id: 'video', icon: Monitor, pt: 'Vídeo', en: 'Video' }, { id: 'audio', icon: Volume2, pt: 'Som', en: 'Sound' },
    { id: 'game', icon: Swords, pt: 'Jogo', en: 'Game' }, { id: 'controls', icon: Gamepad2, pt: 'Controles', en: 'Controls' },
    { id: 'data', icon: HardDrive, pt: 'Dados', en: 'Data' },
  ];
  let tab = $state<Tab>('video');
  const s = settings.v;
  const inApp = !!host();

  const MODES: { id: DisplayMode; icon: typeof Monitor; pt: string; en: string; info: [string, string] }[] = [
    { id: 'windowed', icon: AppWindow, pt: 'Em janela', en: 'Windowed', info: ['janela no tamanho escolhido abaixo', 'a window of the size chosen below'] },
    { id: 'maximized', icon: Maximize, pt: 'Janela maximizada', en: 'Maximized window', info: ['ocupa a tela, mantendo a barra do sistema', 'fills the screen, keeping the system bar'] },
    { id: 'fullscreen', icon: Fullscreen, pt: 'Tela cheia', en: 'Fullscreen', info: ['só o jogo na tela (F11 alterna)', 'only the game on screen (F11 toggles)'] },
  ];
  const QUALITIES: { id: Quality; pt: string; en: string; info: [string, string] }[] = [
    { id: 'high', pt: 'Alta', en: 'High', info: ['todos os efeitos: desfoques, brilhos e animações de ambiente', 'every effect: blurs, glows and ambient animation'] },
    { id: 'medium', pt: 'Média', en: 'Medium', info: ['sem desfoque de fundo (mais leve em placas fracas)', 'no background blur (lighter on weak GPUs)'] },
    { id: 'low', pt: 'Baixa', en: 'Low', info: ['sem desfoque nem animações de ambiente e transições', 'no blur, ambient animation or transitions'] },
  ];
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  // tudo vale na hora
  // (só quando o jogador muda algo: abrir esta tela não mexe na janela)
  let opened = false;
  $effect(() => { void [s.display, s.resolution]; if (opened) settings.applyVideo(); });
  $effect(() => { void [s.uiScale, s.quality]; if (opened) settings.applyVideo(false); });
  $effect(() => { opened = true; });
  $effect(() => { void [s.master, s.music, s.sfx, s.mute]; settings.applyAudio(); });
  $effect(() => { JSON.stringify(s); settings.save(); });

  // ───── teclas ─────
  let capturing = $state<KeyAction | null>(null);
  function capture(e: KeyboardEvent) {
    if (!capturing) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape' && capturing !== 'back') { capturing = null; return; }
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F11'].includes(e.key)) return;
    const taken = KEY_ACTIONS.find((a) => a.id !== capturing && s.keys[a.id].toLowerCase() === e.key.toLowerCase());
    if (taken) { ui.toast(L(`Essa tecla já é de “${taken.pt}”.`, `That key already belongs to “${taken.en}”.`), 'error'); return; }
    s.keys[capturing] = e.key;
    capturing = null;
  }
  const PAD: [string, string, string][] = [
    ['Direcional / alavanca esquerda', 'D-pad / left stick', 'navegar'], ['A', 'A', 'confirmar'], ['B', 'B', 'voltar / fechar'], ['X', 'X', 'golpear (batalha)'],
    ['Y', 'Y', 'encerrar o turno (batalha)'], ['LB / RB', 'LB / RB', 'aba anterior / seguinte'], ['Start', 'Start', 'menu'],
  ];
  const PAD_EN: Record<string, string> = { navegar: 'navigate', confirmar: 'confirm', 'voltar / fechar': 'back / close', 'golpear (batalha)': 'strike (battle)', 'encerrar o turno (batalha)': 'end the turn (battle)', 'aba anterior / seguinte': 'previous / next tab', menu: 'menu' };
  let padName = $state('');
  function findPad() { const g = [...(navigator.getGamepads?.() ?? [])].find((x) => x && x.connected); padName = g ? g.id.replace(/\s*\(.*\)\s*$/, '') : ''; }

  // ───── dados ─────
  let usage = $state({ used: 0, quota: 0 });
  let renders = $state(0);
  let backupInput = $state<HTMLInputElement>();
  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  async function refresh() { usage = await storageEstimate(); renders = await (await db()).count('renders'); }
  async function cleanCache() {
    const keep = new Set(Object.values(app.cards).map((c) => { const ctx = ctxFor(c); return ctx ? renderKey(c, ctx) : ''; }));
    const n = await pruneRenders(keep);
    await refresh();
    ui.toast(L(`${n} imagens antigas removidas do cache`, `${n} stale images removed from cache`));
  }
  async function reset() {
    const r = await ui.confirm({
      title: L('Recomeçar do zero?', 'Start over?'),
      text: L('Apaga TODAS as cartas, decks, heróis e artes e recria as coleções de exemplo.\nFaça um backup antes se quiser guardar algo.', 'Deletes ALL cards, decks, heroes and art and recreates the sample collections.\nMake a backup first if you want to keep anything.'),
      ok: L('Apagar e recomeçar', 'Erase and start over'), danger: true,
    });
    if (r !== 'ok') return;
    await app.resetToSeed();
    await refresh();
    ui.toast(L('Tudo recriado', 'Everything recreated'));
  }
  async function defaults() {
    const r = await ui.confirm({ title: L('Restaurar o padrão?', 'Restore defaults?'), text: L('Volta vídeo, som, jogo e controles para os valores de fábrica. Cartas e heróis não mudam.', 'Puts video, sound, game and controls back to factory values. Cards and heroes do not change.'), ok: L('Restaurar', 'Restore') });
    if (r !== 'ok') return;
    settings.reset();
    location.reload();
  }
  function setLang(l: 'pt-BR' | 'en-US') { app.updateProject((p) => { p.lang = l; }); document.documentElement.lang = l; }

  onMount(() => {
    void refresh();
    void host()?.info().then((i) => { settings.screen = { width: i.width, height: i.height }; });
    findPad();
    const t = setInterval(findPad, 1500);
    return () => clearInterval(t);
  });
</script>

<svelte:window onkeydowncapture={capture} />

<div class="cfg">
  <div class="bg"></div>
  <ScreenBar title={L('Configurações', 'Settings')} onback={() => router.go('/')}>
    <button class="px-btn ghost" onclick={defaults}><RotateCcw size={14} /> {L('Restaurar o padrão', 'Restore defaults')}</button>
  </ScreenBar>
  <div class="body">
    <nav class="tabs">
      {#each TABS as t (t.id)}
        <button class:on={tab === t.id} data-tab onclick={() => (tab = t.id)}><t.icon size={17} /><span>{L(t.pt, t.en)}</span></button>
      {/each}
    </nav>

    <div class="panel">
      {#if tab === 'video'}
        <div class="row3">
          <div class="lbl"><b>{L('Modo de tela', 'Display mode')}</b><small>{inApp ? L('como o jogo ocupa a tela', 'how the game takes the screen') : L('no navegador, só a tela cheia pode ser mudada daqui', 'in the browser, only fullscreen can be changed from here')}</small></div>
          <div class="choices">
            {#each MODES as m (m.id)}
              <button class="choice" class:on={s.display === m.id} disabled={!inApp && m.id === 'maximized'} onclick={() => (s.display = m.id)}>
                <m.icon size={20} /><b>{L(m.pt, m.en)}</b><small>{L(m.info[0], m.info[1])}</small>
              </button>
            {/each}
          </div>
        </div>
        <!-- em tela cheia e maximizado o jogo usa a tela inteira; escolher uma resolução passa para janela desse tamanho -->
        <div class="row3" class:dim={!inApp}>
          <div class="lbl"><b>{L('Resolução', 'Resolution')}</b><small>{!inApp ? L('só no programa instalado', 'only in the installed game') : s.display === 'windowed' ? L('tamanho da janela do jogo', 'size of the game window') : L(`agora o jogo usa a tela inteira (${settings.screen.width} × ${settings.screen.height}); escolher uma resolução passa o jogo para janela desse tamanho`, `the game now uses the whole screen (${settings.screen.width} × ${settings.screen.height}); picking a resolution puts the game in a window of that size`)}</small></div>
          <div class="chips">
            {#each settings.resolutions as r}
              <button class:on={s.display === 'windowed' && s.resolution === r} disabled={!inApp} onclick={() => { s.resolution = r; s.display = 'windowed'; }}>{r.replace('x', ' × ')}</button>
            {/each}
          </div>
        </div>
        <div class="row3">
          <div class="lbl"><b>{L('Escala da interface', 'Interface scale')}</b><small>{L('tamanho de textos e botões; a automática ajusta pela resolução', 'size of text and buttons; automatic adjusts to the resolution')}</small></div>
          <div class="chips">
            <button class:on={!s.uiScale} onclick={() => (s.uiScale = 0)} title={L('Acompanha o tamanho da janela: o jogo fica com o mesmo aspecto em 1080p, 2K ou 4K', 'Follows the window size: the game looks the same in 1080p, 2K or 4K')}>{L('Automática', 'Automatic')} ({pct(settings.zoom)})</button>
            {#each [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as z}
              <button class:on={Math.abs(s.uiScale - z) < 0.01} onclick={() => (s.uiScale = z)}>{pct(z)}</button>
            {/each}
          </div>
        </div>
        <div class="row3">
          <div class="lbl"><b>{L('Qualidade gráfica', 'Graphics quality')}</b><small>{L('efeitos da interface; as cartas e a pixel art não mudam', 'interface effects; cards and pixel art do not change')}</small></div>
          <div class="choices">
            {#each QUALITIES as q (q.id)}
              <button class="choice" class:on={s.quality === q.id} onclick={() => (s.quality = q.id)}><b>{L(q.pt, q.en)}</b><small>{L(q.info[0], q.info[1])}</small></button>
            {/each}
          </div>
        </div>
        <label class="row3 check">
          <div class="lbl"><b>{L('Mostrar quadros por segundo', 'Show frames per second')}</b><small>{L('um contador pequeno no canto da tela', 'a small counter in the corner of the screen')}</small></div>
          <input type="checkbox" bind:checked={s.showFps} />
        </label>

      {:else if tab === 'audio'}
        {#snippet vol(label: string, sub: string, get: () => number, set: (v: number) => void)}
          <div class="row3">
            <div class="lbl"><b>{label}</b><small>{sub}</small></div>
            <div class="slider"><input type="range" min="0" max="1" step="0.05" value={get()} oninput={(e) => set(+(e.currentTarget as HTMLInputElement).value)} /><em>{pct(get())}</em></div>
          </div>
        {/snippet}
        {@render vol(L('Volume geral', 'Master volume'), L('vale para a música e para os sons', 'applies to music and sounds'), () => s.master, (v) => (s.master = v))}
        {@render vol(L('Música', 'Music'), L('trilha do menu e das batalhas', 'menu and battle tracks'), () => s.music, (v) => (s.music = v))}
        {@render vol(L('Efeitos sonoros', 'Sound effects'), L('cartas, golpes, magias e avisos', 'cards, strikes, spells and cues'), () => s.sfx, (v) => { s.sfx = v; chip.sfx('select'); })}
        <label class="row3 check">
          <div class="lbl"><b>{L('Silenciar tudo', 'Mute everything')}</b><small>{L('desliga música e efeitos sem mexer nos volumes', 'turns music and effects off without touching the volumes')}</small></div>
          <input type="checkbox" bind:checked={s.mute} />
        </label>
        <label class="row3 check">
          <div class="lbl"><b>{L('Silenciar em segundo plano', 'Mute in the background')}</b><small>{L('o som para quando você sai da janela do jogo', 'sound stops when you leave the game window')}</small></div>
          <input type="checkbox" bind:checked={s.muteInBackground} />
        </label>

      {:else if tab === 'game'}
        <div class="row3">
          <div class="lbl"><b>{L('Idioma', 'Language')}</b><small>{L('interface e cartas', 'interface and cards')}</small></div>
          <div class="chips"><button class:on={app.lang === 'pt-BR'} onclick={() => setLang('pt-BR')}>Português</button><button class:on={app.lang === 'en-US'} onclick={() => setLang('en-US')}>English</button></div>
        </div>
        <div class="row3">
          <div class="lbl"><b>{L('Dificuldade do oponente', 'Opponent difficulty')}</b><small>{L(DIFFICULTIES.find((d) => d.id === s.difficulty)!.info[0], DIFFICULTIES.find((d) => d.id === s.difficulty)!.info[1])}</small></div>
          <div class="chips">{#each DIFFICULTIES as d (d.id)}<button class:on={s.difficulty === d.id} onclick={() => (s.difficulty = d.id)}>{L(d.name[0], d.name[1])}</button>{/each}</div>
        </div>
        <div class="row3">
          <div class="lbl"><b>{L('Velocidade de jogo', 'Game speed')}</b><small>{L('quanto tempo o oponente dá para você ler cada carta e ver cada efeito', 'how long the opponent gives you to read each card and see each effect')}</small></div>
          <div class="chips">
            <button class:on={s.pace === 'slow'} onclick={() => (s.pace = 'slow')}>{L('Lento', 'Slow')}</button>
            <button class:on={s.pace === 'normal'} onclick={() => (s.pace = 'normal')}>{L('Normal', 'Normal')}</button>
            <button class:on={s.pace === 'fast'} onclick={() => (s.pace = 'fast')}>{L('Rápido', 'Fast')}</button>
          </div>
        </div>
        <label class="row3 check">
          <div class="lbl"><b>{L('Limite de tempo por jogada', 'Time limit per play')}</b><small>{L('30 s parado mostra o contador; mais 30 s e você perde', '30 s idle shows the countdown; 30 s more and you lose')}</small></div>
          <input type="checkbox" bind:checked={s.timeLimit} />
        </label>
        <label class="row3 check">
          <div class="lbl"><b>{L('Registro da batalha', 'Battle log')}</b><small>{L('botão com tudo o que aconteceu na partida', 'a button with everything that happened in the match')}</small></div>
          <input type="checkbox" bind:checked={s.showLog} />
        </label>

      {:else if tab === 'controls'}
        <div class="two">
          <div class="box">
            <h3><Keyboard size={16} /> {L('Teclado', 'Keyboard')}</h3>
            <div class="keys">
              <div class="k"><span>{L('Navegar', 'Navigate')}<small>{L('em qualquer tela', 'anywhere')}</small></span><kbd>↑ ↓ ← →</kbd></div>
              {#each KEY_ACTIONS as a (a.id)}
                <div class="k"><span>{L(a.pt, a.en)}<small>{L(a.where[0], a.where[1])}</small></span>
                  <button class="kbtn" class:cap={capturing === a.id} onclick={() => (capturing = capturing === a.id ? null : a.id)}>{capturing === a.id ? L('aperte uma tecla…', 'press a key…') : settings.keyName(s.keys[a.id])}</button></div>
              {/each}
              <div class="k"><span>{L('Tela cheia', 'Fullscreen')}<small>{L('em qualquer tela', 'anywhere')}</small></span><kbd>F11</kbd></div>
              <div class="k"><span>{L('Salvar', 'Save')}<small>{L('nos editores', 'in the editors')}</small></span><kbd>Ctrl + S</kbd></div>
            </div>
            <button class="px-btn ghost sm" onclick={() => settings.resetKeys()}><RotateCcw size={13} /> {L('Teclas padrão', 'Default keys')}</button>
          </div>
          <div class="box">
            <h3><Gamepad2 size={16} /> {L('Controle (joystick)', 'Gamepad')}</h3>
            <label class="k"><span>{L('Usar controle', 'Use a gamepad')}<small>{padName ? `${L('conectado', 'connected')}: ${padName}` : L('nenhum controle detectado (aperte um botão nele)', 'no gamepad detected (press a button on it)')}</small></span><input type="checkbox" bind:checked={s.gamepad} /></label>
            <div class="keys" class:dim={!s.gamepad}>
              {#each PAD as [pt, en, what]}
                <div class="k"><span>{L(what.charAt(0).toUpperCase() + what.slice(1), PAD_EN[what].charAt(0).toUpperCase() + PAD_EN[what].slice(1))}</span><kbd>{L(pt, en)}</kbd></div>
              {/each}
            </div>
          </div>
        </div>

      {:else}
        <div class="row3 tall">
          <div class="lbl"><b>{L('Backup', 'Backup')}</b><small>{L('Tudo fica salvo neste computador. O backup é um único arquivo .zip com cartas, decks, heróis e artes.', 'Everything is saved on this computer. The backup is a single .zip file with cards, decks, heroes and art.')}</small></div>
          <div class="btns">
            <button class="px-btn gold" onclick={exportBackup}><Download size={15} /> {L('Fazer backup', 'Make backup')}</button>
            <button class="px-btn" onclick={() => backupInput?.click()}><Upload size={15} /> {L('Restaurar backup', 'Restore backup')}</button>
            <button class="px-btn" onclick={() => exportCsv(app.decks.flatMap((d) => app.cardsOf(d.id)))}><FileSpreadsheet size={15} /> {L('Planilha de cartas', 'Card spreadsheet')}</button>
            <input type="file" accept=".zip,application/zip" hidden bind:this={backupInput} onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) void importBackup(f).then(refresh); }} />
          </div>
        </div>
        <div class="row3 tall">
          <div class="lbl"><b>{L('Espaço usado', 'Storage used')}</b><small>{mb(usage.used)}{usage.quota ? ` ${L('de', 'of')} ${mb(usage.quota)}` : ''} · {renders} {L('imagens de cartas em cache', 'cached card images')}</small>
            <div class="bar"><div style="width:{usage.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0}%"></div></div></div>
          <div class="btns"><button class="px-btn" onclick={cleanCache}><Trash size={14} /> {L('Limpar cache antigo', 'Clean stale cache')}</button></div>
        </div>
        <div class="row3 tall danger">
          <div class="lbl"><b>{L('Recomeçar', 'Start over')}</b><small>{L('Apaga cartas, decks, heróis e artes e recria as coleções de exemplo.', 'Erases cards, decks, heroes and art and recreates the sample collections.')}</small></div>
          <div class="btns"><button class="px-btn" onclick={reset}>{L('Apagar tudo e recomeçar', 'Erase everything and start over')}</button></div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .cfg { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .bg { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(7 6 12 / .78), rgb(7 6 12 / .95)), url('/ui/fundo.webp') center / cover; image-rendering: pixelated; }
  .body { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 18px; max-width: 1180px; width: 100%; margin: 0 auto; padding: 22px 24px 26px; }
  .tabs { display: flex; flex-direction: column; gap: 6px; }
  .tabs button { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border: 2px solid #2c2647; background: rgb(13 11 22 / .85); color: var(--text-2); font: 400 12px var(--pixel); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; text-align: left; transition: all var(--t); }
  .tabs button:hover { border-color: #6a5fa8; color: var(--text); }
  .tabs button.on { border-color: var(--accent); color: var(--accent-2); background: #1d1930; box-shadow: 4px 0 0 var(--accent) inset; }
  .panel { min-height: 0; overflow-y: auto; padding: 8px 22px; border: 2px solid #4a417a; background: rgb(18 16 28 / .94); box-shadow: 0 2px 0 #05040a, 0 14px 40px rgb(0 0 0 / .45); }
  .row3 { display: grid; grid-template-columns: minmax(200px, 300px) minmax(0, 1fr); gap: 20px; align-items: center; padding: 16px 0; border-bottom: 2px solid #231e38; }
  .row3:last-child { border-bottom: 0; }
  .row3.check { grid-template-columns: minmax(0, 1fr) auto; cursor: pointer; }
  .row3.tall { align-items: start; }
  .row3.dim { opacity: .45; }
  .lbl { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .lbl b { font: 400 13px var(--pixel); letter-spacing: .05em; color: var(--text); }
  .lbl small { font-size: 12.5px; color: var(--muted); line-height: 1.4; }
  .danger .lbl b { color: #ffa99f; }
  .choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .choice { display: grid; justify-items: start; gap: 4px; padding: 11px 12px; border: 2px solid #2c2647; background: #100e1a; color: var(--text-2); cursor: pointer; text-align: left; font: inherit; transition: all var(--t); }
  .choice b { font-size: 13.5px; color: var(--text); } .choice small { font-size: 11.5px; color: var(--muted); line-height: 1.35; }
  .choice:hover:not(:disabled) { border-color: #6a5fa8; }
  .choice.on { border-color: var(--accent); background: #1d1930; color: var(--accent-2); } .choice.on b { color: var(--accent-2); }
  .choice:disabled { opacity: .35; cursor: default; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { height: 34px; padding: 0 14px; border: 2px solid #2c2647; background: #100e1a; color: var(--text-2); font: 600 13px var(--ui); cursor: pointer; transition: all var(--t); font-variant-numeric: tabular-nums; }
  .chips button:hover:not(:disabled) { border-color: #6a5fa8; color: var(--text); }
  .chips button.on { border-color: var(--accent); background: #1d1930; color: var(--accent-2); }
  .chips button:disabled { cursor: default; }
  .slider { display: flex; align-items: center; gap: 14px; }
  .slider em { font: 400 13px var(--pixel); font-style: normal; color: var(--accent-2); min-width: 52px; text-align: right; }
  .btns { display: flex; flex-wrap: wrap; gap: 8px; }
  .bar { height: 6px; background: #231e38; margin-top: 8px; overflow: hidden; } .bar div { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; padding: 16px 0; align-items: start; }
  .box { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 2px solid #2c2647; background: #100e1a; }
  .box h3 { display: flex; gap: 8px; align-items: center; font: 400 13px var(--pixel); letter-spacing: .08em; text-transform: uppercase; color: var(--accent-2); }
  .keys { display: flex; flex-direction: column; } .keys.dim { opacity: .4; }
  .k { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #231e38; font-size: 13.5px; color: var(--text); }
  .k span { display: flex; flex-direction: column; } .k small { font-size: 11.5px; color: var(--muted); }
  kbd, .kbtn { min-width: 76px; height: 30px; padding: 0 10px; display: inline-grid; place-items: center; border: 2px solid #4a417a; border-bottom-width: 4px; background: #17132a; color: var(--text); font: 400 11px var(--pixel); letter-spacing: .04em; white-space: nowrap; }
  .kbtn { cursor: pointer; transition: all var(--t); }
  .kbtn:hover { border-color: var(--accent); color: var(--accent-2); }
  .kbtn.cap { border-color: var(--accent-2); color: #1a1308; background: var(--accent); animation: blink 1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: .6; } }
  @media (max-width: 900px) { .body { grid-template-columns: 1fr; overflow-y: auto; } .tabs { flex-direction: row; flex-wrap: wrap; } .panel { overflow: visible; } .row3, .two { grid-template-columns: 1fr; } .choices { grid-template-columns: 1fr; } }
</style>

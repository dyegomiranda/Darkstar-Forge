<!-- Criação de personagem: a galeria dos heróis. Daqui se cria (do zero), edita, duplica ou exclui. -->
<script lang="ts">
  import { avatarForCharacter } from '../../avatar/equipment';
  import { Plus, Trash2, Pencil, Copy, Heart, Swords, Shield, Sparkles } from '@lucide/svelte';
  import { app } from '../../store/project.svelte';
  import { L } from '../../app/i18n.svelte';
  import { ui } from '../../app/ui.svelte';
  import { router } from '../../app/router.svelte';
  import { COLORS } from '../../model/catalog';
  import { newId } from '../../model/id';
  import type { Character } from '../../model/types';
  import { RACES } from '../../model/hero';
  import HeroPortrait from '../common/HeroPortrait.svelte';
  import ScreenBar from '../common/ScreenBar.svelte';
  import AvatarSprite from '../../avatar/AvatarSprite.svelte';
  import { deckCount, heroColor, heroDef } from '../game/heroes';

  const chars = $derived(app.project?.characters ?? []);
  const open = (id: string) => { router.returnTo = null; router.go(`/heroi/${encodeURIComponent(id)}`); };
  let hover = $state<string | null>(null);

  async function remove(c: Character) {
    const r = await ui.confirm({ title: L('Excluir herói?', 'Delete hero?'), text: `“${c.name}”\n${L('Isso não pode ser desfeito.', 'This cannot be undone.')}`, ok: L('Excluir', 'Delete'), danger: true });
    if (r !== 'ok') return;
    app.updateProject((p) => { p.characters = p.characters.filter((x) => x.id !== c.id); });
  }
  function duplicate(c: Character) {
    const id = newId('char');
    const copy = structuredClone($state.snapshot(c) as Character);
    copy.id = id; copy.name = `${c.name} ${L('(cópia)', '(copy)')}`; delete copy.preset;
    if (copy.play) { copy.play.id = id; copy.play.name = copy.name; }
    app.updateProject((p) => { p.characters.push(copy); });
    ui.toast(L('Herói duplicado', 'Hero duplicated'));
  }
</script>

<div class="hs">
  <ScreenBar title={L('Criação de personagem', 'Character creation')} kicker={L('Heróis', 'Heroes')} onback={() => router.go('/')}>
    <button class="px-btn gold" onclick={() => open('novo')}><Plus size={15} /> {L('Novo herói', 'New hero')}</button>
  </ScreenBar>
  <div class="scroll">
    <p class="lead">{L('Cada herói tem a sua ancestralidade, os seus atributos, a sua aparência, o seu equipamento e o seu deck. Todos podem entrar em batalha.', 'Each hero has an ancestry, attributes, a look, equipment and a deck. All of them can enter battle.')}</p>
    <div class="grid">
      <button class="card new" onclick={() => open('novo')}>
        <span class="plus"><Plus size={30} /></span>
        <b>{L('Novo herói', 'New hero')}</b>
        <small>{L('começa do zero: você escolhe tudo', 'starts from scratch: you choose everything')}</small>
      </button>
      {#each chars as c (c.id)}
        {@const d = c.play ? heroDef(c) : null}
        <div class="card" style="--c:{heroColor(c)}" onmouseenter={() => (hover = c.id)} onmouseleave={() => (hover = null)} role="group">
          <button class="main" onclick={() => open(c.id)} title={L('Abrir', 'Open')}>
            <span class="pic">
              <span class="glow"></span>
              {#if c.avatar}<span class="doll"><AvatarSprite avatar={avatarForCharacter(c, app.cards)!} scale={3} anim={hover === c.id ? 'walk' : 'idle'} /></span>{:else}<HeroPortrait hero={c} size={150} />{/if}
            </span>
            <b class="nm">{c.name || L('Sem nome', 'Unnamed')}</b>
            <span class="cl">{RACES.find((r) => r.id === c.raceId)?.name[app.lang] ?? ''}{c.raceId && d ? ' · ' : ''}{d ? L(d.className[0], d.className[1]) : c.classColors.map((col) => COLORS[col].classes[app.lang]).join(' / ')}</span>
            {#if d}
              <span class="st"><i><Heart size={12} /> {d.maxHp}</i><i><Swords size={12} /> {d.weapon.dmg}</i><i><Shield size={12} /> {d.armor}</i><i><Sparkles size={12} /> {d.resist}</i></span>
              <span class="dk" class:bad={deckCount(c) === 0}>{app.deck(d.deckId)?.name[app.lang] ?? L('sem deck', 'no deck')} · {deckCount(c)} {L('cartas', 'cards')}</span>
            {/if}
          </button>
          <div class="act">
            <button class="px-btn sm" onclick={() => open(c.id)}><Pencil size={13} /> {L('Editar', 'Edit')}</button>
            <button class="px-icon" onclick={() => duplicate(c)} title={L('Duplicar', 'Duplicate')} aria-label={L('Duplicar', 'Duplicate')}><Copy size={14} /></button>
            <button class="px-icon danger" onclick={() => remove(c)} title={L('Excluir', 'Delete')} aria-label={L('Excluir', 'Delete')}><Trash2 size={14} /></button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .hs { height: 100%; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% -10%, #1c1636, var(--bg) 60%); }
  .scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 30px 50px; }
  .lead { max-width: 760px; margin: 0 auto 20px; text-align: center; color: var(--text-2); font-size: 13.5px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(236px, 1fr)); gap: 18px; max-width: 1500px; margin: 0 auto; }
  .card { position: relative; display: flex; flex-direction: column; border: 2px solid #2c2647; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #6a5fa8) 18%, #14111f), #0d0b16 72%); box-shadow: 0 2px 0 #05040a, 0 12px 30px rgb(0 0 0 / .5); transition: transform var(--t), border-color var(--t); }
  .card:hover, .card:focus-within { transform: translateY(-4px); border-color: color-mix(in srgb, var(--c, #e3b566) 75%, #fff 0%); }
  .main { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 14px 12px 10px; border: 0; background: none; color: var(--text); cursor: pointer; font: inherit; }
  .pic { position: relative; width: 100%; height: 200px; display: grid; place-items: center; overflow: hidden; background: repeating-conic-gradient(rgb(255 255 255 / .018) 0 25%, transparent 0 50%) 0 0 / 16px 16px, #0a0812; border: 2px solid #231e38; }
  .glow { position: absolute; left: 50%; bottom: -40%; width: 120%; aspect-ratio: 1; transform: translateX(-50%); background: radial-gradient(circle, color-mix(in srgb, var(--c) 55%, transparent), transparent 62%); }
  .doll { position: relative; margin-top: -8px; }
  .nm { font: 400 16px var(--pixel); letter-spacing: .05em; color: var(--accent-2); margin-top: 6px; text-align: center; }
  .cl { font-size: 12px; color: var(--text-2); text-align: center; }
  .st { display: flex; gap: 10px; font: 600 12.5px var(--ui); color: var(--text-2); }
  .st i { font-style: normal; display: inline-flex; gap: 4px; align-items: center; }
  .dk { font-size: 11.5px; color: var(--muted); } .dk.bad { color: #ffa99f; }
  .act { display: flex; gap: 6px; justify-content: center; padding: 0 12px 14px; }
  .card.new { min-height: 330px; align-items: center; justify-content: center; gap: 8px; border-style: dashed; border-color: #4a417a; color: var(--text-2); cursor: pointer; font: inherit; background: rgb(255 255 255 / .015); }
  .card.new:hover { color: var(--accent-2); border-color: var(--accent); }
  .plus { width: 62px; height: 62px; display: grid; place-items: center; border: 2px solid currentColor; }
  .card.new b { font: 400 15px var(--pixel); letter-spacing: .06em; text-transform: uppercase; }
  .card.new small { font-size: 12px; color: var(--muted); }
</style>

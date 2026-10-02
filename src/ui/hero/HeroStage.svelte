<!--
  Palco do criador: o boneco grande e animado, com os botões de girar e de animação.
  Cada animação toca uma vez e o boneco volta a ficar parado ("Andar" repete).
-->
<script lang="ts">
  import { RotateCcw, RotateCw, Dices, Swords } from '@lucide/svelte';
  import { L } from '../../app/i18n.svelte';
  import AvatarSprite from '../../avatar/AvatarSprite.svelte';
  import { attackAnim, colorsOf, DIRS, LPC, OWN_SKIN, SKINS, type Anim, type Avatar, type Dir } from '../../avatar/lpc';

  let { avatar, color = '#6b5532', onchange }: { avatar: Avatar; color?: string; onchange: (a: Avatar) => void } = $props();

  type Pick = Anim | 'weapon';
  let dir = $state<Dir>('s');
  /** O botão marcado; `anim` é o que o boneco está fazendo (o "ataque da arma" vira a animação da arma). */
  let sel = $state<Pick>('idle');
  let playKey = $state(0);
  const anim = $derived<Anim>(sel === 'weapon' ? attackAnim(avatar) : sel);
  const LOOPS: Anim[] = ['idle', 'walk'];
  const ANIMS: { id: Pick; pt: string; en: string }[] = [
    { id: 'idle', pt: 'Parado', en: 'Idle' }, { id: 'walk', pt: 'Andar', en: 'Walk' }, { id: 'weapon', pt: 'Ataque da arma', en: 'Weapon attack' },
    { id: 'slash', pt: 'Golpear', en: 'Slash' }, { id: 'thrust', pt: 'Estocar', en: 'Thrust' }, { id: 'shoot', pt: 'Atirar', en: 'Shoot' },
    { id: 'spellcast', pt: 'Conjurar', en: 'Cast' }, { id: 'hurt', pt: 'Cair', en: 'Fall' },
  ];
  /** Clicar toca a animação (de novo, se for a mesma). */
  function play(p: Pick) { sel = p; playKey++; }
  let back: ReturnType<typeof setTimeout> | undefined;
  function ended() { const k = playKey; clearTimeout(back); back = setTimeout(() => { if (k === playKey) sel = 'idle'; }, 600); }
  const turn = (d: number) => { dir = DIRS[(DIRS.indexOf(dir) + d + 4) % 4]; };

  function random() {
    const rnd = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    const a = JSON.parse(JSON.stringify(avatar)) as Avatar;
    a.skin = rnd(SKINS.slice(0, 7));
    a.eyes = rnd(Object.keys(LPC.palettes.eye.colors).filter((k) => !LPC.palettes.eye.colors[k][3]));
    delete a.head; delete a.frame; delete a.face;
    const RARE = ['beard', 'mustache', 'nose', 'ears', 'arms', 'shoulders', 'head', 'cape', 'face', 'neck', 'belt', 'back', 'shield'];
    const NEVER = ['eyes', 'crest', 'visor', 'eyebrows'];
    for (const s of LPC.slots) {
      const pool = s.items.filter((i) => i.bodies.includes(a.body));
      const skip = OWN_SKIN.includes(s.id) || NEVER.includes(s.id) || (RARE.includes(s.id) && Math.random() < 0.7) || (a.body === 'female' && (s.id === 'beard' || s.id === 'mustache'));
      if (skip || !pool.length) { delete a.parts[s.id]; continue; }
      const it = rnd(pool);
      a.parts[s.id] = { id: it.id, color: rnd(colorsOf(it, s.id))?.name };
    }
    onchange(a);
  }
</script>

<div class="stage" style="--c:{color}">
  <div class="sky"></div>
  <div class="floor"></div>
  <div class="doll">{#key playKey}<AvatarSprite {avatar} {anim} {dir} scale={5} loop={LOOPS.includes(anim)} onend={ended} />{/key}</div>
  <div class="turn">
    <button class="px-icon" onclick={() => turn(1)} title={L('Girar', 'Rotate')} aria-label={L('Girar para a esquerda', 'Rotate left')}><RotateCcw size={15} /></button>
    <button class="px-icon" onclick={() => turn(-1)} title={L('Girar', 'Rotate')} aria-label={L('Girar para a direita', 'Rotate right')}><RotateCw size={15} /></button>
    <button class="px-icon" onclick={random} title={L('Aparência aleatória', 'Random look')} aria-label={L('Aparência aleatória', 'Random look')}><Dices size={15} /></button>
  </div>
  <div class="anims">
    {#each ANIMS as a (a.id)}
      <button class:on={sel === a.id} onclick={() => play(a.id)}>{#if a.id === 'weapon'}<Swords size={11} />{/if}{L(a.pt, a.en)}</button>
    {/each}
  </div>
</div>

<style>
  .stage { position: relative; height: 380px; overflow: hidden; display: grid; place-items: center; border: 2px solid #2c2647; background: #07060c; }
  .sky { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--c) 40%, #1b1533), #07060c 75%); }
  .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; background: linear-gradient(180deg, rgb(255 255 255 / .05), transparent 3px), linear-gradient(180deg, transparent, rgb(0 0 0 / .55)); }
  .doll { position: relative; margin-top: -56px; }
  .turn { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; }
  .anims { position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .anims button { display: inline-flex; gap: 4px; align-items: center; padding: 4px 8px; border: 1px solid #3a3260; background: rgb(8 7 14 / .8); color: var(--text-2); font: 500 11px var(--ui); cursor: pointer; }
  .anims button:hover { color: var(--text); border-color: #6a5fa8; }
  .anims button.on { border-color: var(--accent); color: var(--accent-2); background: rgb(227 181 102 / .12); }
</style>

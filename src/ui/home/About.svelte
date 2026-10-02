<!-- Sobre o jogo: o que é o Void Sun, versão e créditos. -->
<script lang="ts">
  import lpcCredits from '../../data/lpc-credits.json';
  import creatureCredits from '../../data/creatures-credits.json';
  import { L } from '../../app/i18n.svelte';
  import { router } from '../../app/router.svelte';
  import { AUTHORS, ICONS } from '../../render/icons/game-icons';
  import ScreenBar from '../common/ScreenBar.svelte';

  const lpcAuthors = [...new Set(Object.values(lpcCredits as Record<string, { authors: string[] }>).flatMap((c) => c.authors))].sort((a, b) => a.localeCompare(b));
  const iconAuthors = [...new Set(Object.values(ICONS).map((i) => i.author))].map((a) => AUTHORS[a] ?? a);
</script>

<div class="about">
  <div class="bg"></div>
  <ScreenBar title={L('Sobre o jogo', 'About the game')} onback={() => router.go('/')} />
  <div class="scroll">
    <div class="inner">
      <header class="hero">
        <span class="sun" aria-hidden="true"></span>
        <h1>Void Sun</h1>
        <p class="ver">{L('versão', 'version')} {__APP_VERSION__} <small>· {__APP_BUILD__}</small></p>
      </header>

      <section>
        <h2>{L('O jogo', 'The game')}</h2>
        <p>{L('Void Sun é um RPG de mesa em forma de jogo de cartas. Você é o herói: a ancestralidade, os atributos e o equipamento saem da sua ficha, e o deck são as habilidades da sua classe. Em batalha, cada carta é um golpe, uma magia, uma técnica ou uma invocação.', 'Void Sun is a tabletop RPG in the shape of a card game. You are the hero: ancestry, attributes and equipment come from your sheet, and the deck holds your class abilities. In battle, each card is a strike, a spell, a technique or a summon.')}</p>
        <p>{L('Os recursos (Vigor e Mana) enchem a cada turno. Derrotar criaturas e ferir o herói inimigo dá experiência; ao subir de nível durante a partida, o herói fica mais forte. Vence quem derrubar o herói do oponente.', 'Resources (Vigor and Mana) refill every turn. Defeating creatures and wounding the enemy hero grants experience; levelling up during the match makes the hero stronger. Whoever brings down the opposing hero wins.')}</p>
      </section>

      <section>
        <h2>{L('O que já existe', 'What exists today')}</h2>
        <ul>
          <li><b>{L('Modo batalha — solo', 'Battle mode — solo')}</b>: {L('partidas contra o jogo, em cinco níveis de dificuldade.', 'matches against the game, in five difficulty levels.')}</li>
          <li><b>{L('Criação de personagem', 'Character creation')}</b>: {L('heróis feitos do zero, com boneco em pixel art.', 'heroes built from scratch, with a pixel-art doll.')}</li>
          <li><b>{L('Construtor de decks', 'Deck builder')}</b>: {L('editor completo de cartas, decks, temas e coleções.', 'a full editor for cards, decks, themes and collections.')}</li>
        </ul>
        <p class="soon"><span class="wip-tag">{L('Em construção', 'Work in progress')}</span> {L('Campanha, com mapa aberto, história e batalhas contra criaturas e chefes; e o modo multijogador.', 'Campaign, with an open map, a story and battles against creatures and bosses; and multiplayer.')}</p>
      </section>

      <section class="credits">
        <h2>{L('Créditos', 'Credits')}</h2>
        <p><b>Void Sun</b> — {L('software livre sob a licença GPL-3.0. A propriedade intelectual do jogo (nome, marca, artes, textos) não está coberta pela GPL.', 'free software under the GPL-3.0 license. The game’s intellectual property (name, logo, art, texts) is not covered by the GPL.')}</p>
        <p>{L('Símbolos', 'Symbols')}: <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a>, {L('licença', 'license')} <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> — {L('autores', 'by')} {iconAuthors.join(', ')}.</p>
        <p>{L('Fontes (SIL Open Font License)', 'Fonts (SIL Open Font License)')}: EB Garamond, Cinzel, Cormorant Garamond, Marcellus, Noto Sans, Pixelify Sans, Silkscreen, Grenze Gotisch, Barlow Condensed, Uncial Antiqua, Inter.</p>
        <p>{L('Bonecos dos heróis (peças em pixel art)', 'Hero dolls (pixel art parts)')}: <a href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator" target="_blank" rel="noreferrer">Universal LPC Spritesheet Character Generator</a> / Liberated Pixel Cup, {L('licenças', 'licenses')} CC-BY-SA 3.0, GPL 3.0 {L('e', 'and')} OGA-BY 3.0 — {L('artistas', 'artists')}: {lpcAuthors.join(', ')}. {L('A lista por peça, com as fontes, está no arquivo', 'The per-part list, with sources, is in the file')} <code>src/data/lpc-credits.json</code>.</p>
        <p>{L('Criaturas do campo (OpenGameArt)', 'Field creatures (OpenGameArt)')}: {#each creatureCredits as c, i}{i ? '; ' : ''}{c.what} — <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a>, {c.authors} ({c.license}){/each}.</p>
        <p>{L('Símbolos 3D', '3D symbols')}: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">Fluent Emoji</a> (Microsoft), {L('licença', 'license')} MIT.</p>
        <p>{L('Arte da tela inicial e dos modos, cenários do campo de batalha e artes das cartas do Protótipo: gerados no próprio computador com Flux.1 dev e o LoRA “Modern Pixel Art” (UmeAiRT).', 'Title and mode art, battlefield sceneries and Prototype card art: generated locally with Flux.1 dev and the “Modern Pixel Art” LoRA (UmeAiRT).')}</p>
        <p>{L('Música e sons: sintetizados pelo próprio jogo.', 'Music and sounds: synthesized by the game itself.')}</p>
        <p class="fine">{L('Regras inspiradas no Pathfinder 2e (Paizo) e D&D 5e, adaptadas; nenhum texto oficial é reproduzido.', 'Rules inspired by Pathfinder 2e (Paizo) and D&D 5e, adapted; no official text is reproduced.')}</p>
      </section>
    </div>
  </div>
</div>

<style>
  .about { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .bg { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(7 6 12 / .7), rgb(7 6 12 / .94)), url('/ui/fundo.webp') center / cover; image-rendering: pixelated; }
  .scroll { position: relative; flex: 1; min-height: 0; overflow-y: auto; }
  .inner { max-width: 820px; margin: 0 auto; padding: 34px 28px 70px; display: flex; flex-direction: column; gap: 26px; }
  .hero { display: grid; justify-items: center; gap: 8px; text-align: center; padding-bottom: 6px; }
  .sun { width: 74px; height: 74px; border-radius: 50%; background: #05040a; box-shadow: 0 0 0 4px #fff0c8, 0 0 26px 6px rgb(255 200 120 / .7), 0 0 60px 18px rgb(170 110 255 / .4); margin-bottom: 12px; }
  h1 { font: 700 46px var(--pixel); letter-spacing: .16em; text-transform: uppercase; background: linear-gradient(180deg, #fff 10%, #ffe9c4 45%, #f0a8d8 80%, #b98bff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 4px 0 #3a1d5c); }
  .ver { margin: 0; font: 400 11px var(--pixel); letter-spacing: .12em; text-transform: uppercase; color: var(--text-2); } .ver small { opacity: .65; text-transform: none; }
  section { padding: 20px 22px; border: 2px solid #2c2647; background: rgb(13 11 22 / .88); display: flex; flex-direction: column; gap: 10px; }
  h2 { font: 400 14px var(--pixel); letter-spacing: .12em; text-transform: uppercase; color: var(--accent-2); }
  p, li { margin: 0; line-height: 1.65; color: var(--text-2); font-size: 14px; }
  ul { margin: 0; padding-left: 20px; display: grid; gap: 4px; } li b { color: var(--text); }
  .soon { display: flex; gap: 12px; align-items: center; }
  .credits p { font-size: 13px; }
  .fine { font-size: 12px; color: var(--muted); }
  code { font-size: 12px; color: var(--text); }
</style>

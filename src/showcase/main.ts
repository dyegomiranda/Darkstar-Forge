/**
 * Mostruário de estilos: peças lado a lado, cartas completas e misturas.
 * Página de aprovação do visual antes da reescrita do app.
 */
import { compose, type ComposeInput, type Look } from '../render/compose';
import { Defs } from '../render/defs';
import { piece, PIECE_KINDS, STYLES, type PieceKind, type StyleId } from '../render/elements';
import { loadCardFonts } from '../render/fonts';
import { skeleton } from '../render/layout';
import { makePalette } from '../render/palette';
import { rasterize } from '../render/raster';
import './showcase.css';

const DECK = {
  red: { hex: '#b92d20', name: 'Vermelho — Guerreiro/Bárbaro', res: 'vigor', art: 'deck-vermelho' },
  blue: { hex: '#2f7cff', name: 'Azul — Mago/Feiticeiro', res: 'mana', art: 'deck-azul' },
  green: { hex: '#4d8b34', name: 'Verde — Druida/Patrulheiro', res: 'nature', art: 'arqueira-deck-verde' },
  black: { hex: '#3a3a3a', name: 'Preto — Necromante/Bruxo', res: 'souls', art: 'necro' },
  purple: { hex: '#6b3eb6', name: 'Roxo — Ladino/Assassino', res: 'shadow', art: 'deck-roxo' },
  white: { hex: '#c3a15a', name: 'Bege — Clérigo/Paladino', res: 'faith', art: 'deck-preto' },
  silver: { hex: '#97a1af', name: 'Prata — Monge/Bardo', res: 'focus', art: 'druida-deck-verde' },
} as const;
type DeckId = keyof typeof DECK;

const assets: ComposeInput['assets'] = {
  resource: (id) => ({
    vigor: 'vigor', mana: 'mana', nature: 'nature', souls: 'souls', shadow: 'shadow', faith: 'faith', focus: 'focus', fury: 'fury', gold: 'gold',
  } as Record<string, string>)[id] && `/assets/icons/resources/${id}.png`,
  classIcon: (c) => `/assets/icons/classes/${c}.png`,
  setIcon: '/assets/icons/set/logo.png',
  sword: '/assets/icons/ui/sword.png',
  shield: '/assets/icons/ui/shield.png',
};

interface Sample { deck: DeckId; also?: DeckId; name: string; type: string; rules: string; flavor?: string; cost: number; stats?: [number, number]; rarity: string; n: string }

const SAMPLES: Sample[] = [
  { deck: 'red', name: 'Fúria do Berserker', type: 'Criatura | Bárbaro', cost: 3, stats: [4, 3], rarity: 'uncommon', n: '004/050',
    rules: 'Investida. Quando entra em campo, ganhe 1 {fury}.\nEnquanto você tiver 3 ou mais {fury}, esta criatura recebe +2/+0.',
    flavor: 'O sangue ferve antes da primeira lâmina tocar a carne.' },
  { deck: 'blue', name: 'Arquimago da Tempestade', type: 'Criatura | Mago', cost: 5, stats: [3, 5], rarity: 'rare', n: '031/050',
    rules: 'Sempre que você conjurar uma magia, cause 1 de dano a um alvo à sua escolha.\n{mana}{mana}: compre uma carta.',
    flavor: 'Os trovões obedecem a quem conhece seus nomes.' },
  { deck: 'green', name: 'Arqueira da Clareira', type: 'Criatura | Patrulheira', cost: 2, stats: [2, 2], rarity: 'common', n: '012/050',
    rules: 'Alcance.\nMarca da Presa: escolha uma criatura inimiga. Seus ataques contra ela causam +1 de dano.' },
  { deck: 'purple', name: 'Golpe nas Sombras', type: 'Habilidade | Ladino', cost: 1, rarity: 'common', n: '007/050',
    rules: 'Ataque Furtivo: a próxima criatura sua que atacar neste turno causa +3 de dano se não for bloqueada.',
    flavor: 'Você só vê a lâmina quando ela já voltou para a bainha.' },
  { deck: 'black', name: 'Ceifador Sem Rosto', type: 'Criatura | Morto-vivo', cost: 4, stats: [4, 2], rarity: 'unique', n: '044/050',
    rules: 'Quando outra criatura morrer, ganhe 1 {souls}.\nSacrifique 2 {souls}: esta criatura ganha Toque Mortal até o fim do turno.',
    flavor: 'Não tem rosto porque já foi todos eles.' },
  { deck: 'red', also: 'blue', name: 'Lâmina Arcana', type: 'Criatura | Magus', cost: 4, stats: [3, 3], rarity: 'rare', n: '001/020',
    rules: 'Quando esta criatura atacar, gaste 1 {mana}: ela causa +2 de dano e ganha Atropelar até o fim do turno.' },
];

const LONG_RULES = 'Ao entrar em campo, escolha um: cause 3 de dano a uma criatura; ou ganhe 2 {vigor} e compre uma carta; ou suas criaturas ganham +1/+1 até o fim do turno.\n' +
  'Fúria 3 — enquanto você tiver 3 ou mais {fury}, esta criatura tem Atropelar e não pode ser alvo de habilidades de Mago.\n' +
  'No fim do seu turno, se ela não atacou, cause 2 de dano a você.';

function input(s: Sample, look: Look, uid: string, over: Partial<ComposeInput> = {}): ComposeInput {
  const d = DECK[s.deck];
  const colors = s.also ? [d.hex, DECK[s.also].hex] : [d.hex];
  return {
    uid, colors, colorId: s.deck,
    art: { src: `/amostras/${d.art}.jpg` },
    name: s.name, typeLine: s.type, rules: s.rules, flavor: s.flavor,
    footer: `${s.n} · PT-BR · 1ª Ed.`,
    cost: { resource: d.res, amount: s.cost },
    stats: s.stats ? { atk: s.stats[0], def: s.stats[1] } : null,
    rarity: s.rarity, look, assets, ...over,
  };
}

let uidN = 0;
const uid = () => `c${++uidN}`;

function cardEl(inp: ComposeInput, caption?: string): string {
  return `<figure class="card"><div class="card-svg">${compose(inp)}</div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
}

const PIECE_NAMES: Record<PieceKind, string> = {
  frame: 'Moldura', header: 'Cabeçalho (nome)', cost: 'Selo de custo', class: 'Selo de classe', typeBar: 'Barra de tipo',
  rules: 'Caixa de regras', stat: 'Placa ATK/DEF', footer: 'Rodapé', set: 'Selo da edição',
};

/** Uma peça sozinha, sobre um recorte escurecido da arte. */
function pieceEl(style: StyleId, kind: PieceKind, deck: DeckId): string {
  const S = skeleton(260);
  const box = kind === 'stat' ? S.atk : kind === 'frame' ? S.card : (S as any)[kind];
  const defs = new Defs(uid());
  const ps = piece(style, kind);
  const out = ps.render({ box, pal: makePalette([DECK[deck].hex], ps.metal), defs, opacity: ps.opacity });
  const pad = kind === 'frame' ? 0 : 40;
  const vb = kind === 'frame'
    ? `0 0 750 1050`
    : `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`;
  const art = `<image href="/amostras/${DECK[deck].art}.jpg" x="0" y="0" width="750" height="1050" preserveAspectRatio="xMidYMid slice" opacity=".55"/>`;
  return `<svg viewBox="${vb}" class="piece piece-${kind}">${defs}<rect x="-100" y="-100" width="950" height="1250" fill="#0d0b0a"/>${art}${out.svg}</svg>`;
}

function render(deck: DeckId) {
  const app = document.getElementById('app')!;
  const styles = STYLES;
  const sampleFor = SAMPLES.find((s) => s.deck === deck && !s.also) ?? SAMPLES[0];

  const full = styles.map((st) => `
    <h3>${st.name} <small>${st.description}</small></h3>
    <div class="row">${SAMPLES.slice(0, 5).map((s) => cardEl(input(s, { style: st.id }, uid()))).join('')}</div>`).join('');

  const table = `<table class="pieces"><thead><tr><th></th>${styles.map((s) => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>` +
    PIECE_KINDS.filter((k) => k !== 'frame').map((k) => `<tr><th>${PIECE_NAMES[k]}</th>${styles.map((s) => `<td>${pieceEl(s.id, k, deck)}</td>`).join('')}</tr>`).join('') +
    `</tbody></table>`;

  const mixes: [string, Look][] = [
    ['Cabeçalho Ornado + regras Sombrio + resto Arcano', { style: 'arcano', pieces: { header: { style: 'ornado' }, rules: { style: 'sombrio' }, typeBar: { style: 'sombrio' } } }],
    ['Clássico com selos Ornado', { style: 'classico', pieces: { cost: { style: 'ornado' }, class: { style: 'ornado' }, set: { style: 'ornado' } } }],
    ['Sombrio com metal dourado', { style: 'sombrio', pieces: Object.fromEntries(PIECE_KINDS.filter((k) => k !== 'frame').map((k) => [k, { style: 'sombrio', metal: 'gold' }])) }],
  ];
  const framed = styles.map((st) => cardEl(input(SAMPLES[4], { style: st.id, pieces: { frame: { style: st.id } } }, uid()), `${st.name} — com moldura`)).join('');

  app.innerHTML = `
    <header class="top">
      <h1>Darkstar Forge — Mostruário de estilos</h1>
      <p>Cada peça da carta existe em vários estilos e pode ser trocada sozinha. As cores vêm do deck; o metal, a opacidade e a cor de cada peça podem ser ajustados.</p>
      <label>Cor do deck para as peças:
        <select id="deck">${Object.entries(DECK).map(([id, d]) => `<option value="${id}"${id === deck ? ' selected' : ''}>${d.name}</option>`).join('')}</select>
      </label>
    </header>
    <section><h2>1. Peças lado a lado</h2>${table}</section>
    <section><h2>2. Cartas completas, um estilo por vez</h2>${full}</section>
    <section><h2>3. Misturando estilos</h2><div class="row">${mixes.map(([cap, look], i) => cardEl(input(SAMPLES[i % 3], look, uid()), cap)).join('')}</div></section>
    <section><h2>4. Texto curto e texto longo (a caixa cresce para cima)</h2><div class="row">${styles.map((st) =>
      cardEl(input(sampleFor, { style: st.id }, uid(), { rules: 'Investida.', flavor: undefined }), `${st.name} — curto`) +
      cardEl(input(sampleFor, { style: st.id }, uid(), { rules: LONG_RULES }), `${st.name} — longo`)).join('')}</div></section>
    <section><h2>5. Carta híbrida (duas classes)</h2><div class="row">${styles.map((st) => cardEl(input(SAMPLES[5], { style: st.id }, uid()), st.name)).join('')}</div></section>
    <section><h2>6. Moldura em volta da carta (opcional — o padrão é sem moldura)</h2><div class="row">${framed}</div></section>
  `;
  (document.getElementById('deck') as HTMLSelectElement).onchange = (e) => render((e.target as HTMLSelectElement).value as DeckId);
}

loadCardFonts().then(() => render('red'));

/** Desenvolvimento: grava cartas em .snaps/ para conferência em alta resolução. */
(window as any).__snap = async (style: StyleId, idx: number, name: string, over: Partial<ComposeInput> = {}, look?: Look) => {
  const svg = compose(input(SAMPLES[idx], look ?? { style }, uid(), over));
  const blob = await rasterize(svg, 750);
  await fetch(`/__snap?name=${name}`, { method: 'POST', body: blob });
  return name;
};
(window as any).__snapPiece = async (style: StyleId, kind: PieceKind, deck: DeckId, name: string) => {
  const html = pieceEl(style, kind, deck).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="900" ');
  const { selfContained } = await import('../render/raster');
  const full = await selfContained(html);
  const img = new Image(); img.src = URL.createObjectURL(new Blob([full], { type: 'image/svg+xml' })); await img.decode();
  const c = new OffscreenCanvas(900, Math.round(900 * img.naturalHeight / img.naturalWidth)); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  await fetch(`/__snap?name=${name}`, { method: 'POST', body: await c.convertToBlob() });
  return name;
};

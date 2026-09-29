/**
 * Mostruário de estilos: bancada para montar uma carta peça a peça, galeria de
 * símbolos, peças lado a lado e cartas prontas. Página de aprovação do visual.
 */
import { compose, type ComposeInput, type IconChoice, type Look, type PieceChoice } from '../render/compose';
import { Defs } from '../render/defs';
import { piece, PIECE_KINDS, STYLES, type PieceKind, type StyleId } from '../render/elements';
import { CARD_FONTS, loadCardFonts } from '../render/fonts';
import { ATK_CHOICES, classChoices, classIcon, DEF_CHOICES, ICON_NAMES, RESOURCE_COLORS, RESOURCE_IDS, resourceIcon, STEEL } from '../render/icons/glyphs';
import { drawGlyph, ICON_STYLES, type IconStyle } from '../render/icons/render';
import { skeleton } from '../render/layout';
import { makePalette, vivid, type MetalKind } from '../render/palette';
import { lighten } from '../render/color';
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
  orange: { hex: '#e07a2a', name: 'Recursos', res: 'gold', art: 'deck-vermelho' },
  gear: { hex: '#8a9098', name: 'Equipamentos', res: 'gold', art: 'deck-preto' },
} as const;
type DeckId = keyof typeof DECK;

const SET_ICON = '/brand/logo.png';

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

/** O estilo Pixel vem com a arte pixelada (dá para desligar). */
const lookFor = (style: StyleId): Look => (style === 'pixel' ? { style, pixelateArt: 7 } : { style });

/** Carta híbrida: o custo se divide entre os recursos das duas classes (mostra o selo largo). */
function sampleCost(s: Sample): ComposeInput['cost'] {
  const d = DECK[s.deck];
  if (!s.also) return [{ resource: d.res, amount: s.cost }];
  const half = Math.ceil(s.cost / 2);
  return [{ resource: d.res, amount: half, show: 'repeat' }, { resource: DECK[s.also].res, amount: s.cost - half, show: 'repeat' }];
}

function input(s: Sample, look: Look, uid: string, over: Partial<ComposeInput> = {}): ComposeInput {
  const d = DECK[s.deck];
  const colors = s.also ? [d.hex, DECK[s.also].hex] : [d.hex];
  return {
    uid, colors, colorId: s.deck,
    art: { src: `/amostras/${d.art}.jpg` },
    name: s.name, typeLine: s.type, rules: s.rules, flavor: s.flavor,
    footer: `${s.n} · PT-BR · 1ª Ed.`,
    cost: sampleCost(s),
    stats: s.stats ? { atk: s.stats[0], def: s.stats[1] } : null,
    rarity: s.rarity, look, setIcon: SET_ICON, ...over,
  };
}

let uidN = 0;
const uid = () => `c${++uidN}`;

function cardEl(inp: ComposeInput, caption?: string): string {
  return `<figure class="card"><div class="card-svg">${compose(inp)}</div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
}

const PIECE_NAMES: Record<PieceKind, string> = {
  frame: 'Moldura (opcional)', header: 'Cabeçalho (nome)', cost: 'Selo de custo', class: 'Selo de classe', typeBar: 'Barra de tipo',
  rules: 'Caixa de regras', stat: 'Placas ATK/DEF', footer: 'Rodapé', set: 'Selo da edição',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Uma peça sozinha, sobre um recorte escurecido da arte. */
function pieceEl(style: StyleId, kind: PieceKind, deck: DeckId): string {
  const S = skeleton(260);
  const box = kind === 'stat' ? S.atk : kind === 'frame' ? S.card : (S as unknown as Record<string, typeof S.card>)[kind];
  const defs = new Defs(uid());
  const ps = piece(style, kind);
  const out = ps.render({ box, pal: makePalette([DECK[deck].hex], ps.metal), defs, opacity: ps.opacity });
  const pad = 40;
  const vb = `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`;
  const art = `<image href="/amostras/${DECK[deck].art}.jpg" x="0" y="0" width="750" height="1050" preserveAspectRatio="xMidYMid slice" opacity=".55"/>`;
  return `<svg viewBox="${vb}" class="piece piece-${kind}">${defs}<rect x="-100" y="-100" width="950" height="1250" fill="#0d0b0a"/>${art}${out.svg}</svg>`;
}

/** Grade de símbolos: linhas = símbolos, colunas = estilos de desenho. */
function glyphGallery(ids: string[], title: string, key: string, color?: (id: string) => string | undefined): string {
  const defs = new Defs(uid());
  const cell = 120;
  let body = '';
  ids.forEach((id, row) => {
    ICON_STYLES.forEach((st, col) => {
      body += drawGlyph(defs, id, st.id, col * cell + 18, row * cell + 16, 84, { color: color?.(id) });
    });
    body += `<text x="${ICON_STYLES.length * cell + 10}" y="${row * cell + 64}" fill="#bfb2a2" font-family="Noto Sans" font-size="17">${esc(ICON_NAMES[id] ?? id)}</text>`;
  });
  const top = 30;
  const heads = ICON_STYLES.map((s, i) => `<text x="${i * cell + 60}" y="20" fill="#8f8272" font-family="Noto Sans" font-size="14" text-anchor="middle">${s.name}</text>`).join('');
  const w = ICON_STYLES.length * cell + 330, h = ids.length * cell + top;
  return `<div><h3>${title}</h3><svg viewBox="0 0 ${w} ${h}" width="${w}" class="glyphs" id="gl-${key}">${defs}${heads}<g transform="translate(0 ${top})">${body}</g></svg></div>`;
}

// ───────────── bancada "Monte sua carta" ─────────────

interface Bench {
  sample: number; deck: DeckId; deck2: DeckId | ''; style: StyleId;
  pieces: Partial<Record<PieceKind, Partial<PieceChoice>>>;
  icons: { cost: IconChoice; class: IconChoice; atk: IconChoice; def: IconChoice; statMode: 'placa' | 'emblema' };
  pixelArt: boolean; frame: boolean;
}

const bench: Bench = {
  sample: 0, deck: 'red', deck2: '', style: 'ornado', pieces: {},
  icons: { cost: {}, class: {}, atk: {}, def: {}, statMode: 'placa' }, pixelArt: false, frame: false,
};

const FONT_FAMILIES = [...new Set(CARD_FONTS.map((f) => f.family))];
const METALS: [MetalKind | '', string][] = [['', 'padrão do estilo'], ['deck', 'cor do deck'], ['gold', 'ouro'], ['silver', 'prata'], ['bronze', 'bronze'], ['iron', 'ferro']];
const EDIT_KINDS: PieceKind[] = ['header', 'cost', 'class', 'typeBar', 'rules', 'stat', 'footer', 'set', 'frame'];

function benchLook(): Look {
  const pieces: Look['pieces'] = {};
  for (const k of EDIT_KINDS) {
    if (k === 'frame' && !bench.frame) continue;
    pieces[k] = { style: bench.style, ...bench.pieces[k] } as PieceChoice;
  }
  const clean = (c: IconChoice) => Object.fromEntries(Object.entries(c).filter(([, v]) => v)) as IconChoice;
  return {
    style: bench.style, pieces,
    icons: { cost: clean(bench.icons.cost), class: clean(bench.icons.class), atk: clean(bench.icons.atk), def: clean(bench.icons.def), statMode: bench.icons.statMode },
    pixelateArt: bench.pixelArt ? 7 : undefined,
  };
}

function benchCard(): string {
  const s = SAMPLES[bench.sample];
  const d = DECK[bench.deck];
  const colors = bench.deck2 ? [d.hex, DECK[bench.deck2].hex] : [d.hex];
  return compose(input({ ...s, deck: bench.deck }, benchLook(), 'bench', { colors, colorId: bench.deck, cost: sampleCost({ ...s, deck: bench.deck }) }));
}

const opt = (v: string, label: string, cur: string) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;

function benchControls(): string {
  const styleOpts = (cur: string, blank = true) => (blank ? opt('', '(estilo geral)', cur) : '') + STYLES.map((s) => opt(s.id, s.name, cur)).join('');
  const iconRow = (key: 'cost' | 'class' | 'atk' | 'def', label: string, glyphs: string[]) => {
    const c = bench.icons[key];
    return `<div class="ctl-row"><span class="lbl">${label}</span>
      <select data-icon="${key}" data-f="style">${opt('', 'estilo do tema', c.style ?? '')}${ICON_STYLES.map((s) => opt(s.id, s.name, c.style ?? '')).join('')}</select>
      ${glyphs.length ? `<select data-icon="${key}" data-f="glyph">${opt('', 'símbolo padrão', c.glyph ?? '')}${glyphs.map((g) => opt(g, ICON_NAMES[g] ?? g, c.glyph ?? '')).join('')}</select>` : ''}
      <input type="color" data-icon="${key}" data-f="color" value="${c.color ?? '#d6dde6'}" title="Cor do símbolo">
      <button class="mini" data-icon-reset="${key}" title="Voltar à cor padrão">↺</button></div>`;
  };
  const pieceRows = EDIT_KINDS.map((k) => {
    const p = bench.pieces[k] ?? {};
    const dis = k === 'frame' && !bench.frame ? ' disabled' : '';
    return `<tr${dis ? ' class="off"' : ''}>
      <th>${PIECE_NAMES[k]}</th>
      <td><select data-p="${k}" data-f="style"${dis}>${styleOpts(p.style ?? '')}</select></td>
      <td><input type="color" data-p="${k}" data-f="color" value="${p.colors?.[0] ?? DECK[bench.deck].hex}"${dis}><button class="mini" data-reset="${k}" title="Voltar à cor do deck">↺</button></td>
      <td><input type="range" min="0" max="100" data-p="${k}" data-f="opacity" value="${Math.round((p.opacity ?? piece(p.style ?? bench.style, k).opacity) * 100)}"${dis}></td>
      <td><select data-p="${k}" data-f="metal"${dis}>${METALS.map(([v, l]) => opt(v, l, p.metal ?? '')).join('')}</select></td>
      <td><input type="color" data-p="${k}" data-f="ink" value="${p.ink ?? '#ffffff'}"${dis}><button class="mini" data-ink-reset="${k}" title="Cor de texto padrão">↺</button></td>
      <td><select data-p="${k}" data-f="font"${dis}>${opt('', 'padrão', p.font ?? '')}${FONT_FAMILIES.map((f) => opt(f, f, p.font ?? '')).join('')}</select></td>
    </tr>`;
  }).join('');
  return `
    <div class="ctl-row">
      <label>Carta <select id="b-sample">${SAMPLES.map((s, i) => opt(String(i), s.name, String(bench.sample))).join('')}</select></label>
      <label>Deck <select id="b-deck">${Object.entries(DECK).map(([id, d]) => opt(id, d.name, bench.deck)).join('')}</select></label>
      <label>+ 2ª classe <select id="b-deck2">${opt('', '(nenhuma)', bench.deck2)}${Object.entries(DECK).map(([id, d]) => opt(id, d.name, bench.deck2)).join('')}</select></label>
    </div>
    <div class="ctl-row">
      <label>Estilo geral <select id="b-style">${styleOpts(bench.style, false)}</select></label>
      <label><input type="checkbox" id="b-frame"${bench.frame ? ' checked' : ''}> Moldura em volta</label>
      <label><input type="checkbox" id="b-pixel"${bench.pixelArt ? ' checked' : ''}> Pixelar a arte</label>
      <button id="b-reset">Limpar ajustes</button>
    </div>
    <h4>Peças</h4>
    <table class="bench-table"><thead><tr><th></th><th>Estilo</th><th>Cor</th><th>Transparência</th><th>Metal</th><th>Cor do texto</th><th>Fonte</th></tr></thead><tbody>${pieceRows}</tbody></table>
    <h4>Símbolos</h4>
    ${iconRow('cost', 'Custo', [])}
    ${iconRow('class', 'Classe', classChoices(bench.deck))}
    ${iconRow('atk', 'Ataque', ATK_CHOICES)}
    ${iconRow('def', 'Defesa', DEF_CHOICES)}
    <div class="ctl-row"><span class="lbl">ATK/DEF</span>
      <label><input type="radio" name="statMode" value="placa"${bench.icons.statMode === 'placa' ? ' checked' : ''}> em placas</label>
      <label><input type="radio" name="statMode" value="emblema"${bench.icons.statMode === 'emblema' ? ' checked' : ''}> número dentro do símbolo</label>
    </div>`;
}

function mountBench() {
  const host = document.getElementById('bench')!;
  const draw = () => { (document.getElementById('bench-card') as HTMLElement).innerHTML = benchCard(); };
  const rebuild = () => {
    host.innerHTML = `<div class="bench"><div class="bench-ctl">${benchControls()}</div><div class="bench-view"><div id="bench-card" class="card-svg big"></div></div></div>`;
    draw();
  };
  const onEdit = (e: Event) => {
    const t = e.target as HTMLInputElement;
    const k = t.dataset.p as PieceKind | undefined;
    const f = t.dataset.f;
    if (k && f) {
      const p = (bench.pieces[k] ??= {});
      if (f === 'style') { if (t.value) p.style = t.value as StyleId; else delete p.style; rebuild(); return; }
      if (f === 'color') p.colors = [t.value];
      if (f === 'opacity') p.opacity = +t.value / 100;
      if (f === 'metal') { if (t.value) p.metal = t.value as MetalKind; else delete p.metal; }
      if (f === 'ink') p.ink = t.value;
      if (f === 'font') { if (t.value) p.font = t.value; else delete p.font; }
      draw();
      return;
    }
    const ik = t.dataset.icon as 'cost' | 'class' | 'atk' | 'def' | undefined;
    if (ik && f) {
      const c = bench.icons[ik];
      if (f === 'style') c.style = (t.value || undefined) as IconStyle | undefined;
      if (f === 'glyph') c.glyph = t.value || undefined;
      if (f === 'color') c.color = t.value;
      draw();
      return;
    }
    if (t.name === 'statMode') { bench.icons.statMode = t.value as 'placa' | 'emblema'; draw(); return; }
    if (e.type !== 'change') return;
    if (t.id === 'b-sample') bench.sample = +t.value;
    if (t.id === 'b-deck') bench.deck = t.value as DeckId;
    if (t.id === 'b-deck2') bench.deck2 = t.value as DeckId | '';
    if (t.id === 'b-style') { bench.style = t.value as StyleId; bench.pixelArt = bench.style === 'pixel'; bench.pieces = {}; }
    if (t.id === 'b-frame') bench.frame = t.checked;
    if (t.id === 'b-pixel') bench.pixelArt = t.checked;
    rebuild();
  };
  host.addEventListener('input', onEdit);
  host.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    // selects/checkboxes só disparam 'change'; cores e sliders já tratados no 'input'
    if (t.tagName === 'SELECT' || (t as HTMLInputElement).type === 'checkbox' || (t as HTMLInputElement).type === 'radio') onEdit(e);
  });
  host.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.reset) { delete bench.pieces[t.dataset.reset as PieceKind]?.colors; rebuild(); }
    if (t.dataset.inkReset) { delete bench.pieces[t.dataset.inkReset as PieceKind]?.ink; rebuild(); }
    if (t.dataset.iconReset) { delete bench.icons[t.dataset.iconReset as 'cost'].color; rebuild(); }
    if (t.id === 'b-reset') { bench.pieces = {}; bench.icons = { cost: {}, class: {}, atk: {}, def: {}, statMode: 'placa' }; rebuild(); }
  });
  rebuild();
}

// ───────────── página ─────────────


function render(deck: DeckId) {
  const app = document.getElementById('app')!;
  const styles = STYLES;
  const sampleFor = SAMPLES.find((s) => s.deck === deck && !s.also) ?? SAMPLES[0];

  const full = styles.map((st) => `
    <h3>${st.name} <small>${st.description}</small></h3>
    <div class="row">${SAMPLES.slice(0, 5).map((s) => cardEl(input(s, lookFor(st.id), uid()))).join('')}</div>`).join('');

  const table = `<table class="pieces"><thead><tr><th></th>${styles.map((s) => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>` +
    PIECE_KINDS.filter((k) => k !== 'frame').map((k) => `<tr><th>${PIECE_NAMES[k]}</th>${styles.map((s) => `<td>${pieceEl(s.id, k, deck)}</td>`).join('')}</tr>`).join('') +
    `</tbody></table>`;

  const resIds = RESOURCE_IDS.map((r) => resourceIcon(r)!);
  const resColor = (id: string) => RESOURCE_COLORS[RESOURCE_IDS[resIds.indexOf(id)]];
  const deckIds = (Object.keys(DECK) as DeckId[]);
  const clsIds = deckIds.map((d) => classIcon(d));
  const deckColor = (id: string) => DECK[deckIds[clsIds.indexOf(id)]]?.hex;

  const mixes: [string, Look][] = [
    ['Cabeçalho Ornado + regras Gótico + resto Arcano', { style: 'arcano', pieces: { header: { style: 'ornado' }, rules: { style: 'gotico' }, typeBar: { style: 'gotico' } } }],
    ['Moderno com selos de astrolábio (Arcano)', { style: 'moderno', pieces: { cost: { style: 'arcano' }, class: { style: 'arcano' }, set: { style: 'arcano' } } }],
    ['Selvagem com selos e ATK/DEF Góticos', { style: 'selvagem', pieces: { cost: { style: 'gotico' }, class: { style: 'gotico' }, stat: { style: 'gotico' } } }],
    ['Gótico com metal dourado', { style: 'gotico', pieces: Object.fromEntries(PIECE_KINDS.filter((k) => k !== 'frame').map((k) => [k, { style: 'gotico', metal: 'gold' }])) }],
    ['Ornado com regras 50% transparentes e texto claro', { style: 'ornado', pieces: { rules: { style: 'ornado', opacity: 0.5, ink: '#fff6ea' } } }],
  ];
  const emblems: [string, Look][] = [
    ['Impacto + escudo (Emblema)', { style: 'ornado', icons: { statMode: 'emblema' } }],
    ['Espadas + escudo redondo (Chapado)', { style: 'moderno', icons: { statMode: 'emblema', atk: { glyph: 'crossed-swords', style: 'chapado', color: '#f2f2f2' }, def: { glyph: 'viking-shield', style: 'chapado', color: '#3d8bff' } } }],
    ['Garras + vida (Metal gravado)', { style: 'arcano', icons: { statMode: 'emblema', atk: { glyph: 'triple-claws', color: '#ffb84a' }, def: { glyph: 'heart-drop', color: '#e0453a' } } }],
    ['Pixel com número dentro', { style: 'pixel', pixelateArt: 7, icons: { statMode: 'emblema', atk: { glyph: 'broadsword' }, def: { glyph: 'heart-drop', color: '#e0453a' } } }],
  ];
  const framed = styles.map((st) => cardEl(input(SAMPLES[4], { ...lookFor(st.id), pieces: { frame: { style: st.id } } }, uid()), `${st.name} — com moldura`)).join('');

  app.innerHTML = `
    <header class="top">
      <h1>Darkstar Forge — Mostruário de estilos</h1>
      <p>Cada peça da carta existe em vários estilos e pode ser trocada sozinha. Cor, transparência, metal, cor do texto e fonte de cada peça são ajustáveis; os símbolos têm 4 estilos de desenho.</p>
    </header>
    <section><h2>1. Monte sua carta</h2><div id="bench"></div></section>
    <section><h2>2. Símbolos (cada um em 4 estilos de desenho)</h2>
      <div class="row gl">${glyphGallery(resIds, 'Recursos (custo)', 'res', resColor)}${glyphGallery(clsIds, 'Classes e decks', 'cls', (id) => lighten(vivid(deckColor(id) ?? '#999999'), 0.3))}${glyphGallery([...ATK_CHOICES, ...DEF_CHOICES], 'Ataque e defesa (opções)', 'cbt', () => STEEL)}</div>
    </section>
    <section><h2>3. Peças lado a lado</h2>
      <label>Cor do deck: <select id="deck">${Object.entries(DECK).map(([id, d]) => `<option value="${id}"${id === deck ? ' selected' : ''}>${d.name}</option>`).join('')}</select></label>
      ${table}</section>
    <section><h2>4. Cartas completas, um estilo por vez</h2>${full}</section>
    <section><h2>5. ATK/DEF com o número dentro do símbolo</h2><div class="row">${emblems.map(([cap, look], i) => cardEl(input(SAMPLES[[0, 1, 4, 2][i]], look, uid()), cap)).join('')}</div></section>
    <section><h2>6. Misturando estilos e ajustes</h2><div class="row">${mixes.map(([cap, look], i) => cardEl(input(SAMPLES[i % 5], look, uid()), cap)).join('')}</div></section>
    <section><h2>7. Texto curto e texto longo (a caixa cresce para cima)</h2><div class="row">${styles.map((st) =>
      cardEl(input(sampleFor, lookFor(st.id), uid(), { rules: 'Investida.', flavor: undefined }), `${st.name} — curto`) +
      cardEl(input(sampleFor, lookFor(st.id), uid(), { rules: LONG_RULES }), `${st.name} — longo`)).join('')}</div></section>
    <section><h2>8. Carta híbrida (duas classes)</h2><div class="row">${styles.map((st) => cardEl(input(SAMPLES[5], lookFor(st.id), uid()), st.name)).join('')}</div></section>
    <section><h2>9. Moldura em volta da carta (opcional — o padrão é sem moldura)</h2><div class="row">${framed}</div></section>
  `;
  (document.getElementById('deck') as HTMLSelectElement).onchange = (e) => render((e.target as HTMLSelectElement).value as DeckId);
  mountBench();
}

loadCardFonts().then(() => render('red'));

/** Desenvolvimento: grava imagens em .snaps/ para conferência em alta resolução. */
const dev = window as unknown as Record<string, unknown>;
dev.__snap = async (style: StyleId, idx: number, name: string, over: Partial<ComposeInput> = {}, look?: Look) => {
  const svg = compose(input(SAMPLES[idx], look ?? lookFor(style), uid(), over));
  await fetch(`/__snap?name=${name}`, { method: 'POST', body: await rasterize(svg, 750) });
  return name;
};
dev.__snapBench = async (name: string) => {
  await fetch(`/__snap?name=${name}`, { method: 'POST', body: await rasterize(benchCard(), 750) });
  return name;
};
dev.__snapSvg = async (selector: string, name: string, width = 1200) => {
  const el = document.querySelector(selector) as SVGSVGElement;
  const { selfContained } = await import('../render/raster');
  const vb = el.viewBox.baseVal;
  const height = Math.round((width * vb.height) / vb.width);
  const src = el.outerHTML.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" `).replace(/ width="\d+"/, ` width="${width}" height="${height}"`);
  const full = await selfContained(src);
  const img = new Image(); img.src = URL.createObjectURL(new Blob([full], { type: 'image/svg+xml' })); await img.decode();
  const c = new OffscreenCanvas(width, height);
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#16120f'; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
  await fetch(`/__snap?name=${name}`, { method: 'POST', body: await c.convertToBlob() });
  return name;
};

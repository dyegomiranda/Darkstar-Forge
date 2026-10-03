/**
 * Catálogo de equipamentos do jogo, inspirado nas tabelas de armas, armaduras e itens
 * mágicos dos RPGs de mesa (D&D 5e e Pathfinder 2e), traduzido para os números da mesa:
 *
 *  - Arma: dano do golpe básico (d4 → 2, d6 → 3, d8 → 4, d10 → 5, d12/2d6 → 6) e o tipo
 *    (corpo a corpo, à distância ou mágico). Armas de duas mãos deixam a outra mão vazia;
 *    as de haste têm alcance (golpeiam corpo a corpo da retaguarda); as leves cabem na
 *    mão secundária e somam ao golpe.
 *  - Armadura: leve, média e pesada. Quanto mais pesada, mais Armadura, mais Força pede e
 *    mais atrapalha a conjuração (Mana a menos) e o fôlego (Vigor a menos).
 *  - Foco arcano, divino ou da natureza, vestes e joias: Mana, Resistência mágica,
 *    atributos (que liberam cartas) e Vida.
 *
 * Equipar não custa nada. As peças fortes pedem um atributo mínimo ou cobram algo em troca.
 * Nenhuma peça repete a outra: cada uma tem um perfil próprio.
 */
import type { Attr, GearSlot, Via } from './types';

export interface GearStats {
  weapon?: { dmg: number; via: Via; /** Duas mãos: a mão secundária fica vazia. */ hands?: 2; /** Haste: golpeia corpo a corpo também da retaguarda. */ reach?: boolean };
  armor?: number;
  resist?: number;
  hp?: number;
  strike?: number;
  vigor?: number;
  mana?: number;
  attrs?: Partial<Record<Attr, number>>;
  /** Arma leve: também cabe na mão secundária, e lá soma isto ao golpe. */
  dual?: number;
  /** Atributo mínimo para usar a peça. */
  req?: [Attr, number];
}

export interface GearDef extends GearStats {
  key: string;
  slot: GearSlot;
  name: [string, string];
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  /** Uma linha do que a peça é (vai no texto de ambientação da carta). */
  flavor: [string, string];
}

const w = (dmg: number, via: Via, more: { hands?: 2; reach?: boolean } = {}) => ({ weapon: { dmg, via, ...more } });

export const GEAR: GearDef[] = [
  // ───── armas corpo a corpo ─────
  { key: 'dagger', slot: 'weapon', name: ['Adaga', 'Dagger'], icon: 'plain-dagger', rarity: 'common', ...w(2, 'melee'), dual: 1,
    flavor: ['Leve e discreta; cabe também na outra mão.', 'Light and discreet; fits the other hand too.'] },
  { key: 'shortsword', slot: 'weapon', name: ['Espada curta', 'Shortsword'], icon: 'broad-dagger', rarity: 'common', ...w(3, 'melee'), dual: 2,
    flavor: ['A arma de quem luta com uma lâmina em cada mão.', 'The weapon of those who fight with a blade in each hand.'] },
  { key: 'mace', slot: 'weapon', name: ['Maça', 'Mace'], icon: 'spiked-mace', rarity: 'common', ...w(3, 'melee'), resist: 1,
    flavor: ['Abençoada nos templos: protege quem a empunha da magia.', 'Blessed in the temples: wards its wielder against magic.'] },
  { key: 'spear', slot: 'weapon', name: ['Lança', 'Spear'], icon: 'broadhead-arrow', rarity: 'common', ...w(3, 'melee', { reach: true }),
    flavor: ['Alcança o inimigo por cima do ombro de um aliado.', "Reaches the foe over an ally's shoulder."] },
  { key: 'longsword', slot: 'weapon', name: ['Espada longa', 'Longsword'], icon: 'broadsword', rarity: 'common', ...w(4, 'melee'), req: ['for', 2],
    flavor: ['Equilíbrio entre alcance, peso e corte.', 'A balance of reach, weight and edge.'] },
  { key: 'rapier', slot: 'weapon', name: ['Rapieira', 'Rapier'], icon: 'sword-brandish', rarity: 'uncommon', ...w(4, 'melee'), req: ['des', 3],
    flavor: ['Estocadas precisas: pede agilidade, não força.', 'Precise thrusts: it asks for agility, not strength.'] },
  { key: 'battleaxe', slot: 'weapon', name: ['Machado de batalha', 'Battleaxe'], icon: 'battle-axe', rarity: 'uncommon', ...w(5, 'melee'), req: ['for', 3],
    flavor: ['Pesado para uma mão só, mas deixa a outra livre para o escudo.', 'Heavy for one hand, but leaves the other free for a shield.'] },
  { key: 'katana', slot: 'weapon', name: ['Katana', 'Katana'], icon: 'curvy-knife', rarity: 'uncommon', ...w(5, 'melee', { hands: 2 }), req: ['des', 3],
    flavor: ['Lâmina curva de duas mãos, feita para cortes rápidos.', 'A curved two-handed blade made for quick cuts.'] },
  { key: 'greatsword', slot: 'weapon', name: ['Montante', 'Greatsword'], icon: 'two-handed-sword', rarity: 'uncommon', ...w(5, 'melee', { hands: 2 }), armor: 1, req: ['for', 3],
    flavor: ['Longa o bastante para aparar golpes.', 'Long enough to parry blows.'] },
  { key: 'halberd', slot: 'weapon', name: ['Alabarda', 'Halberd'], icon: 'axe-sword', rarity: 'uncommon', ...w(5, 'melee', { hands: 2, reach: true }), req: ['for', 3],
    flavor: ['Machado na ponta de uma haste: golpeia da segunda fileira.', 'An axe on a pole: strikes from the second row.'] },
  { key: 'greataxe', slot: 'weapon', name: ['Machado grande', 'Greataxe'], icon: 'war-axe', rarity: 'rare', ...w(6, 'melee', { hands: 2 }), req: ['for', 4],
    flavor: ['O golpe mais pesado que um guerreiro consegue dar.', 'The heaviest blow a warrior can deal.'] },
  { key: 'handwraps', slot: 'weapon', name: ['Faixas de luta', 'Fighting wraps'], icon: 'mailed-fist', rarity: 'common', ...w(4, 'melee', { hands: 2 }), req: ['des', 2],
    flavor: ['Mãos e pés como armas; o corpo leve guarda fôlego.', 'Hands and feet as weapons; a light body keeps its breath.'] },
  // ───── armas à distância ─────
  { key: 'sling', slot: 'weapon', name: ['Funda', 'Sling'], icon: 'rune-stone', rarity: 'common', ...w(2, 'ranged'),
    flavor: ['Pedras à distância, com a outra mão livre.', 'Stones from afar, with the other hand free.'] },
  { key: 'handcrossbow', slot: 'weapon', name: ['Besta de mão', 'Hand crossbow'], icon: 'crossbow', rarity: 'uncommon', ...w(3, 'ranged'), req: ['des', 2],
    flavor: ['Pequena o bastante para uma mão só.', 'Small enough for a single hand.'] },
  { key: 'shortbow', slot: 'weapon', name: ['Arco curto', 'Shortbow'], icon: 'bow-arrow', rarity: 'common', ...w(3, 'ranged', { hands: 2 }),
    flavor: ['Fácil de puxar, para qualquer um.', 'Easy to draw, for anyone.'] },
  { key: 'longbow', slot: 'weapon', name: ['Arco longo', 'Longbow'], icon: 'bowman', rarity: 'uncommon', ...w(4, 'ranged', { hands: 2 }), req: ['des', 3],
    flavor: ['Precisa de braço treinado; acerta longe e forte.', 'It needs a trained arm; hits far and hard.'] },
  { key: 'heavycrossbow', slot: 'weapon', name: ['Besta pesada', 'Heavy crossbow'], icon: 'crossbow', rarity: 'rare', ...w(5, 'ranged', { hands: 2 }), vigor: -1, req: ['for', 2],
    flavor: ['O virote atravessa escudos, mas recarregar cansa.', 'The bolt pierces shields, but reloading is tiring.'] },
  // ───── focos de conjuração ─────
  { key: 'wand', slot: 'weapon', name: ['Varinha', 'Wand'], icon: 'crystal-wand', rarity: 'common', ...w(3, 'magic'),
    flavor: ['Dispara magia com uma mão e deixa a outra para um orbe ou grimório.', 'Fires magic with one hand and leaves the other for an orb or tome.'] },
  { key: 'staff', slot: 'weapon', name: ['Cajado arcano', 'Arcane staff'], icon: 'wizard-staff', rarity: 'uncommon', ...w(4, 'magic', { hands: 2 }), mana: 1, req: ['int', 2],
    flavor: ['Guarda energia arcana para o próximo feitiço.', 'Stores arcane energy for the next spell.'] },
  { key: 'druidstaff', slot: 'weapon', name: ['Cajado de carvalho', 'Oak staff'], icon: 'crescent-staff', rarity: 'uncommon', ...w(3, 'magic', { hands: 2 }), hp: 3, attrs: { sab: 1 }, req: ['sab', 2],
    flavor: ['Ainda brota folhas: a seiva fortalece quem o carrega.', 'It still sprouts leaves: its sap strengthens the bearer.'] },
  { key: 'skullstaff', slot: 'weapon', name: ['Cajado de caveira', 'Skull staff'], icon: 'skull-staff', rarity: 'rare', ...w(4, 'magic', { hands: 2 }), mana: 2, hp: -3, req: ['car', 2],
    flavor: ['Empresta poder em troca de um pouco da sua vida.', 'Lends power in exchange for a bit of your life.'] },
  { key: 'lute', slot: 'weapon', name: ['Alaúde', 'Lute'], icon: 'pan-flute', rarity: 'uncommon', ...w(2, 'magic', { hands: 2 }), mana: 1, attrs: { car: 1 },
    flavor: ['Canções que ferem, encantam e inspiram.', 'Songs that wound, charm and inspire.'] },

  // ───── mão secundária ─────
  { key: 'buckler', slot: 'offhand', name: ['Broquel', 'Buckler'], icon: 'round-shield', rarity: 'common', armor: 1,
    flavor: ['Pequeno e leve; desvia o golpe.', 'Small and light; turns the blow aside.'] },
  { key: 'shield', slot: 'offhand', name: ['Escudo de aço', 'Steel shield'], icon: 'templar-shield', rarity: 'common', armor: 2, req: ['for', 2],
    flavor: ['O escudo do soldado.', "The soldier's shield."] },
  { key: 'towershield', slot: 'offhand', name: ['Escudo torre', 'Tower shield'], icon: 'crenulated-shield', rarity: 'rare', armor: 3, vigor: -1, req: ['for', 3],
    flavor: ['Uma parede portátil; pesa a cada passo.', 'A portable wall; it weighs on every step.'] },
  { key: 'orb', slot: 'offhand', name: ['Orbe arcano', 'Arcane orb'], icon: 'concentration-orb', rarity: 'uncommon', mana: 1,
    flavor: ['Concentra a mana dispersa no ar.', 'Gathers the mana scattered in the air.'] },
  { key: 'tome', slot: 'offhand', name: ['Grimório', 'Grimoire'], icon: 'spell-book', rarity: 'uncommon', attrs: { int: 1 },
    flavor: ['Anos de estudo numa capa de couro.', 'Years of study in a leather cover.'] },
  { key: 'holysymbol', slot: 'offhand', name: ['Símbolo sagrado', 'Holy symbol'], icon: 'holy-symbol', rarity: 'common', resist: 1, hp: 2,
    flavor: ['A fé erguida diante do mal.', 'Faith raised against evil.'] },

  // ───── cabeça ─────
  { key: 'hood', slot: 'head', name: ['Capuz', 'Hood'], icon: 'hooded-figure', rarity: 'common', attrs: { des: 1 },
    flavor: ['Esconde o rosto e o próximo passo.', 'Hides the face and the next step.'] },
  { key: 'ironhelm', slot: 'head', name: ['Elmo de ferro', 'Iron helm'], icon: 'visored-helm', rarity: 'common', armor: 1,
    flavor: ['Simples e confiável.', 'Simple and reliable.'] },
  { key: 'hornedhelm', slot: 'head', name: ['Elmo com chifres', 'Horned helm'], icon: 'horned-helm', rarity: 'uncommon', armor: 1, strike: 1, req: ['for', 2],
    flavor: ['Protege e assusta; o choque dos chifres também fere.', 'Protects and frightens; the horns hurt too.'] },
  { key: 'greathelm', slot: 'head', name: ['Elmo fechado', 'Great helm'], icon: 'black-knight-helm', rarity: 'uncommon', armor: 2, mana: -1, req: ['for', 2],
    flavor: ['Nada passa, nem a concentração do conjurador.', "Nothing gets through, not even a caster's focus."] },
  { key: 'wizardhat', slot: 'head', name: ['Chapéu de mago', 'Wizard hat'], icon: 'pointy-hat', rarity: 'common', mana: 1,
    flavor: ['Velho e remendado, guarda o conhecimento de gerações.', 'Old and patched, it keeps the lore of generations.'] },
  { key: 'headband', slot: 'head', name: ['Tiara do intelecto', 'Headband of intellect'], icon: 'jewel-crown', rarity: 'rare', attrs: { int: 1 }, resist: 1,
    flavor: ['Clareia a mente e a fecha para feitiços alheios.', 'Clears the mind and closes it to foreign spells.'] },
  { key: 'circlet', slot: 'head', name: ['Diadema da presença', 'Circlet of presence'], icon: 'imperial-crown', rarity: 'rare', attrs: { car: 1 },
    flavor: ['Todos os olhos se voltam para quem o usa.', 'Every eye turns to the one who wears it.'] },
  { key: 'mask', slot: 'head', name: ['Máscara do assassino', "Assassin's mask"], icon: 'domino-mask', rarity: 'uncommon', strike: 1, hp: -2,
    flavor: ['Quem a usa esquece a cautela.', 'Whoever wears it forgets caution.'] },

  // ───── peito ─────
  { key: 'robe', slot: 'chest', name: ['Túnica de aprendiz', "Apprentice's robe"], icon: 'angel-outfit', rarity: 'common', resist: 1, mana: 1,
    flavor: ['Bordada com runas simples de proteção.', 'Embroidered with simple warding runes.'] },
  { key: 'archrobe', slot: 'chest', name: ['Manto do arquimago', "Archmage's robe"], icon: 'wing-cloak', rarity: 'unique', resist: 2, mana: 1, attrs: { int: 1 }, req: ['int', 3],
    flavor: ['Tecido de fio de estrela: só um mestre aguenta o seu peso.', 'Woven of starthread: only a master bears its weight.'] },
  { key: 'clericvest', slot: 'chest', name: ['Vestes sacerdotais', 'Priestly vestments'], icon: 'holy-grail', rarity: 'uncommon', resist: 1, attrs: { sab: 1 },
    flavor: ['Consagradas no altar, lembram ao clérigo a quem ele serve.', 'Consecrated at the altar, they remind the cleric whom they serve.'] },
  { key: 'monkgarb', slot: 'chest', name: ['Veste de monge', "Monk's garb"], icon: 'linden-leaf', rarity: 'common', armor: 1, vigor: 1, req: ['sab', 2],
    flavor: ['Sem armadura: quem a veste se defende pelo próprio corpo, leve como o vento.', 'No armor: the wearer defends with the body itself, light as wind.'] },
  { key: 'shadowcloak', slot: 'chest', name: ['Capa das sombras', 'Shadow cloak'], icon: 'cloak-dagger', rarity: 'uncommon', armor: 1, attrs: { des: 1 },
    flavor: ['Couro escuro que se confunde com a noite.', 'Dark leather that blends with the night.'] },
  { key: 'leather', slot: 'chest', name: ['Gibão de couro', 'Leather jerkin'], icon: 'chest-armor', rarity: 'common', armor: 1, hp: 2,
    flavor: ['Armadura leve: protege sem atrapalhar.', 'Light armor: protects without hindering.'] },
  { key: 'studded', slot: 'chest', name: ['Couro batido', 'Studded leather'], icon: 'belt-armor', rarity: 'uncommon', armor: 2, req: ['des', 3],
    flavor: ['Leve e cravejada: protege quem sabe se esquivar.', 'Light and riveted: protects those who know how to dodge.'] },
  { key: 'hide', slot: 'chest', name: ['Gibão de peles', 'Hide armor'], icon: 'heart-armor', rarity: 'common', armor: 2, hp: 2, req: ['con', 2],
    flavor: ['Peles grossas, sem metal: a armadura dos druidas e bárbaros.', 'Thick hides, no metal: the armor of druids and barbarians.'] },
  { key: 'chainshirt', slot: 'chest', name: ['Camisão de malha', 'Chain shirt'], icon: 'layered-armor', rarity: 'common', armor: 2, mana: -1,
    flavor: ['Armadura média: os anéis de metal atrapalham os gestos de magia.', 'Medium armor: the metal rings hinder spell gestures.'] },
  { key: 'breastplate', slot: 'chest', name: ['Peitoral de aço', 'Breastplate'], icon: 'armor-punch', rarity: 'uncommon', armor: 3, mana: -1, req: ['for', 2],
    flavor: ['Armadura média reforçada.', 'Reinforced medium armor.'] },
  { key: 'chainmail', slot: 'chest', name: ['Cota de malha', 'Chain mail'], icon: 'shoulder-armor', rarity: 'uncommon', armor: 3, hp: 2, mana: -2, req: ['for', 3],
    flavor: ['Armadura pesada: segura bem, mas quase impede a magia.', 'Heavy armor: holds well, but nearly stops magic.'] },
  { key: 'plate', slot: 'chest', name: ['Armadura de placas', 'Plate armor'], icon: 'spiked-armor', rarity: 'rare', armor: 5, mana: -2, vigor: -1, req: ['for', 4],
    flavor: ['A melhor proteção que existe, ao preço do fôlego e da magia.', 'The best protection there is, at the price of breath and magic.'] },

  // ───── mãos ─────
  { key: 'gauntlets', slot: 'hands', name: ['Manoplas de aço', 'Steel gauntlets'], icon: 'gauntlet', rarity: 'common', armor: 1,
    flavor: ['Protegem as mãos e os antebraços.', 'Protect hands and forearms.'] },
  { key: 'ogregauntlets', slot: 'hands', name: ['Manoplas da força do ogro', 'Gauntlets of ogre power'], icon: 'thor-fist', rarity: 'rare', attrs: { for: 1 },
    flavor: ['Quem as veste aperta como um ogro.', 'Whoever wears them grips like an ogre.'] },
  { key: 'runegloves', slot: 'hands', name: ['Luvas rúnicas', 'Runic gloves'], icon: 'magic-palm', rarity: 'uncommon', resist: 1,
    flavor: ['Runas que desviam a magia hostil.', 'Runes that deflect hostile magic.'] },
  { key: 'thiefgloves', slot: 'hands', name: ['Luvas do gatuno', "Thief's gloves"], icon: 'claw-slashes', rarity: 'uncommon', strike: 1, req: ['des', 2],
    flavor: ['Dedos ágeis acham a brecha na guarda.', 'Nimble fingers find the gap in the guard.'] },

  // ───── pernas ─────
  { key: 'leatherpants', slot: 'legs', name: ['Calças de couro', 'Leather breeches'], icon: 'leg-armor', rarity: 'common', hp: 2,
    flavor: ['Couro curtido que aguenta a estrada.', 'Tanned leather that endures the road.'] },
  { key: 'greaves', slot: 'legs', name: ['Grevas de aço', 'Steel greaves'], icon: 'leg-armor', rarity: 'common', armor: 1, hp: 1, req: ['for', 2],
    flavor: ['Placas sobre as canelas e os joelhos.', 'Plates over shins and knees.'] },
  { key: 'elvenleggings', slot: 'legs', name: ['Perneiras élficas', 'Elven leggings'], icon: 'vine-leaf', rarity: 'uncommon', resist: 1,
    flavor: ['Tecidas com fios que repelem encantos.', 'Woven with threads that repel charms.'] },

  // ───── pés ─────
  { key: 'travelboots', slot: 'feet', name: ['Botas de viagem', 'Traveler boots'], icon: 'boot-stomp', rarity: 'common', vigor: 1,
    flavor: ['Gastas de tanto caminhar; o fôlego vem com elas.', 'Worn from long walks; stamina comes with them.'] },
  { key: 'ironboots', slot: 'feet', name: ['Botas de ferro', 'Iron boots'], icon: 'metal-boot', rarity: 'common', armor: 1,
    flavor: ['Pesadas e firmes.', 'Heavy and steady.'] },
  { key: 'elvenboots', slot: 'feet', name: ['Botas élficas', 'Elven boots'], icon: 'boot-kick', rarity: 'uncommon', attrs: { des: 1 },
    flavor: ['Não fazem barulho em pedra nem em folha seca.', 'Silent on stone and dry leaves alike.'] },
  { key: 'wingedboots', slot: 'feet', name: ['Botas aladas', 'Winged boots'], icon: 'angel-wings', rarity: 'unique', vigor: 1, attrs: { des: 1 }, hp: -2,
    flavor: ['Leveza demais: quem as usa sente cada golpe.', 'Too light: the wearer feels every blow.'] },

  // ───── amuleto ─────
  { key: 'healthamulet', slot: 'trinket', name: ['Amuleto da saúde', 'Amulet of health'], icon: 'intricate-necklace', rarity: 'rare', hp: 3, attrs: { con: 1 },
    flavor: ['Uma pedra vermelha que bate junto com o coração.', 'A red stone that beats along with the heart.'] },
  { key: 'periapt', slot: 'trinket', name: ['Periapto da sabedoria', 'Periapt of wisdom'], icon: 'gems', rarity: 'rare', attrs: { sab: 1 },
    flavor: ['Traz a calma de quem já viu de tudo.', 'Brings the calm of one who has seen it all.'] },
  { key: 'arcanemedallion', slot: 'trinket', name: ['Medalhão arcano', 'Arcane medallion'], icon: 'magic-swirl', rarity: 'uncommon', mana: 1,
    flavor: ['Um círculo de prata que nunca esfria.', 'A silver ring of metal that never cools.'] },
  { key: 'wardamulet', slot: 'trinket', name: ['Amuleto de proteção', 'Amulet of warding'], icon: 'heraldic-sun', rarity: 'common', resist: 1, hp: 1,
    flavor: ['Gravado com o sol: a magia sombria escorrega nele.', 'Engraved with the sun: dark magic slides off it.'] },

  // ───── anéis ─────
  { key: 'protectionring', slot: 'ring', name: ['Anel de proteção', 'Ring of protection'], icon: 'power-ring', rarity: 'rare', armor: 1, resist: 1,
    flavor: ['Um campo invisível contra lâminas e feitiços.', 'An unseen field against blades and spells.'] },
  { key: 'vigorring', slot: 'ring', name: ['Anel do vigor', 'Ring of vigor'], icon: 'pouring-chalice', rarity: 'uncommon', vigor: 1, hp: -1,
    flavor: ['Empurra o corpo além do cansaço.', 'Pushes the body past fatigue.'] },
  { key: 'archmagering', slot: 'ring', name: ['Anel do arquimago', "Archmage's ring"], icon: 'fire-ring', rarity: 'unique', mana: 2, hp: -3,
    flavor: ['Queima a mana do próprio sangue.', "Burns mana from the wearer's own blood."] },
  { key: 'bloodring', slot: 'ring', name: ['Anel de sangue', 'Blood ring'], icon: 'skull-ring', rarity: 'rare', strike: 2, hp: -3,
    flavor: ['Cada golpe cobra um pouco de quem o dá.', 'Each blow takes a little from the one who deals it.'] },
  { key: 'patronring', slot: 'ring', name: ['Anel do patrono', "Patron's ring"], icon: 'cursed-star', rarity: 'rare', mana: 1, attrs: { car: 1 }, hp: -1,
    flavor: ['O pacto aparece na pele, junto do poder.', 'The pact shows on the skin, along with the power.'] },
];

export const gearOf = (key: string): GearDef | undefined => GEAR.find((g) => g.key === key);

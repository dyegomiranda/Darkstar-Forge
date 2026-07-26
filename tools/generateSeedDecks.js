#!/usr/bin/env node
/**
 * Gera js/data/seedDecks.js — 50 cartas/deck balanceadas
 * Curva de recurso (não-MTG): start ~3, level-up no jogo
 * Conteúdo original inspirado em arquétipos PF2e / D&D
 */
"use strict";

const fs = require("fs");
const path = require("path");

// ---- Curva de mana (50 cartas) — partidas fluidas com mana inicial ~3 ----
// Custo 1:12 | 2:12 | 3:10 | 4:8 | 5:5 | 6:3  (média ~2.82)
const CURVE = [1,1,1,1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3,3,3, 4,4,4,4,4,4,4,4, 5,5,5,5,5, 6,6,6];

const COLORS = {
  red:    { id: "red",    res: "vigor",  hex: "#b92d20", hex2: "#5a1510", className: "Guerreiro/Bárbaro" },
  blue:   { id: "blue",   res: "mana",   hex: "#2f7cff", hex2: "#0e2448", className: "Mago/Feiticeiro" },
  green:  { id: "green",  res: "nature", hex: "#4d8b34", hex2: "#1a3210", className: "Druida/Guardião" },
  black:  { id: "black",  res: "souls",  hex: "#4a4a4a", hex2: "#101010", className: "Bruxo/Necromante" },
  purple: { id: "purple", res: "shadow", hex: "#6b3eb6", hex2: "#241040", className: "Ladino/Assassino" },
  white:  { id: "white",  res: "faith",  hex: "#c3a15a", hex2: "#3a3010", className: "Clérigo/Paladino" },
  silver: { id: "silver", res: "focus",  hex: "#97a1af", hex2: "#2a3038", className: "Monge/Bardo" }
};

// Score alvo ≈ custo * 3 (pointsPerCost)
function statsForCost(cost, isCreature) {
  if (!isCreature) return { attack: 0, defense: 0, showCombat: false };
  // criatura no custo N: ATK+DEF ≈ N+1 a N+3
  const total = cost + 1 + (cost >= 4 ? 1 : 0);
  const attack = Math.ceil(total / 2);
  const defense = Math.floor(total / 2) + (cost >= 3 ? 1 : 0);
  return { attack, defense: Math.max(1, defense), showCombat: true };
}

function rarityForCost(cost, idx) {
  if (cost >= 6) return "unique";
  if (cost >= 5) return idx % 2 ? "rare" : "unique";
  if (cost >= 4) return idx % 3 === 0 ? "rare" : "uncommon";
  if (cost >= 3) return idx % 4 === 0 ? "uncommon" : "common";
  return "common";
}

// ---- Arte SVG individual por carta ----
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickMotif(name, type, tags) {
  const n = (name + " " + type).toLowerCase();
  const t = tags || [];
  if (t.includes("weapon") || /espada|machado|lança|arco|adaga|martelo|clava|mangual|alabarda|cimitarra|besta|gládio|rapieira|katana|punhal|bordão|cajado/.test(n)) return "weapon";
  if (t.includes("offhand") || /escudo|broquel|pavês/.test(n)) return "shield";
  if (t.includes("head") || /elmo|capacete|capuz|diadema|coroa|tiara/.test(n)) return "helm";
  if (t.includes("chest") || /peitoral|armadura|cota|túnica|manto|couraça/.test(n)) return "armor";
  if (t.includes("hands") || /luva|manopla|bracelete/.test(n)) return "gloves";
  if (t.includes("legs") || /greva|calça|perna/.test(n)) return "legs";
  if (t.includes("feet") || /bota|sandália|sapato/.test(n)) return "boots";
  if (t.includes("amulet") || /amuleto|colar|medalhão|talismã/.test(n)) return "amulet";
  if (t.includes("ring") || /anel/.test(n)) return "ring";
  if (t.includes("resource") || /ouro|moeda|poção|bolsa|tesouro|suprimento|cristal|elixir/.test(n)) return "resource";
  if (/bola de fogo|chama|incendi|fogo|brasa|infernal/.test(n)) return "fire";
  if (/raio|relâmpago|tempestade|trovão/.test(n)) return "lightning";
  if (/gelo|congel|inverno|geada/.test(n)) return "ice";
  if (/cura|bênção|sagrado|luz|divin|oração|santific/.test(n)) return "holy";
  if (/sombra|veneno|necro|morto|esqueleto|alma|maldic|sangue/.test(n)) return "dark";
  if (/lobo|urso|fera|animal|planta|vinha|raiz|floresta|ent/.test(n)) return "nature";
  if (/dragão|wyvern|drake/.test(n)) return "dragon";
  if (/invoc|elemental|golem|familiar|espectro|fantasma|zumbi|esqueleto|mercen|guardi|soldado|escudeiro| lobisomem| lobisomem/.test(n) || t.includes("summon") || t.includes("creature") || t.includes("mercenary")) return "creature";
  if (/flecha|tiro|arco|mira/.test(n)) return "arrow";
  if (/música|canção|canto|instrumento|lira|flauta/.test(n)) return "music";
  if (/punho|soco|ki|medita|postura/.test(n)) return "fist";
  if (/escudo|bloquear|parry|defesa|barreira/.test(n)) return "shield";
  if (/investida|carga|golpe|corte|ataque|impacto/.test(n)) return "slash";
  return "spell";
}

function svgArt(name, colorHex, colorHex2, motif) {
  const h = hash(name);
  const shapes = [];
  const accent = colorHex;
  const bg1 = colorHex2;
  const bg2 = "#0a0807";

  // fundo único por carta (posições pseudo-aleatórias)
  for (let i = 0; i < 5; i++) {
    const cx = 80 + ((h >> (i * 3)) % 590);
    const cy = 100 + ((h >> (i * 5)) % 700);
    const r = 40 + ((h >> (i * 2)) % 50);
    const op = (0.12 + (i % 4) * 0.05).toFixed(2);
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" fill-opacity="${op}"/>`);
  }

  const motifSvg = {
    weapon: `<g transform="translate(375,420)" fill="${accent}" fill-opacity="0.55">
      <rect x="-14" y="-180" width="28" height="280" rx="6"/>
      <path d="M-40 100 H40 V120 H-40 Z"/>
      <path d="M-8 -200 L0 -260 L8 -200 Z"/></g>`,
    shield: `<g transform="translate(375,420)" fill="${accent}" fill-opacity="0.5" stroke="${accent}" stroke-width="6">
      <path d="M0 -160 L140 -80 L120 80 Q0 200 -120 80 L-140 -80 Z" fill-opacity="0.35"/></g>`,
    helm: `<g transform="translate(375,400)" fill="${accent}" fill-opacity="0.5">
      <ellipse cx="0" cy="-20" rx="110" ry="90"/>
      <rect x="-90" y="40" width="180" height="40" rx="8"/>
      <rect x="-40" y="-10" width="80" height="24" fill="#0a0807" fill-opacity="0.5"/></g>`,
    armor: `<g transform="translate(375,430)" fill="${accent}" fill-opacity="0.45">
      <path d="M-100 -120 L-40 -160 L40 -160 L100 -120 L90 120 L-90 120 Z"/>
      <path d="M-30 -80 L0 -40 L30 -80" fill="none" stroke="${accent}" stroke-width="8"/></g>`,
    gloves: `<g transform="translate(375,450)" fill="${accent}" fill-opacity="0.5">
      <ellipse cx="-50" cy="0" rx="55" ry="80"/><ellipse cx="50" cy="0" rx="55" ry="80"/>
      <rect x="-100" y="40" width="200" height="30" rx="6"/></g>`,
    legs: `<g transform="translate(375,460)" fill="${accent}" fill-opacity="0.45">
      <rect x="-80" y="-140" width="55" height="220" rx="12"/><rect x="25" y="-140" width="55" height="220" rx="12"/></g>`,
    boots: `<g transform="translate(375,500)" fill="${accent}" fill-opacity="0.5">
      <path d="M-110 -40 H-30 V40 H-140 Z"/><path d="M30 -40 H110 V40 H20 Z"/></g>`,
    amulet: `<g transform="translate(375,380)" fill="none" stroke="${accent}" stroke-width="10" opacity="0.7">
      <path d="M-80 -100 Q0 40 80 -100"/><circle cx="0" cy="80" r="50" fill="${accent}" fill-opacity="0.45" stroke="none"/></g>`,
    ring: `<g transform="translate(375,420)" fill="none" stroke="${accent}" stroke-width="18" opacity="0.65">
      <circle cx="0" cy="0" r="90"/><circle cx="0" cy="-90" r="22" fill="${accent}" stroke="none" fill-opacity="0.7"/></g>`,
    resource: `<g transform="translate(375,420)" fill="${accent}" fill-opacity="0.5">
      <ellipse cx="0" cy="20" rx="100" ry="70"/><rect x="-70" y="-100" width="140" height="90" rx="10"/>
      <circle cx="0" cy="-30" r="28" fill-opacity="0.8"/></g>`,
    fire: `<g transform="translate(375,430)" fill="${accent}" fill-opacity="0.55">
      <path d="M0 120 C-90 40 -70 -80 0 -160 C70 -80 90 40 0 120 Z"/>
      <path d="M0 80 C-40 30 -30 -40 0 -90 C30 -40 40 30 0 80 Z" fill="#ffcc66" fill-opacity="0.35"/></g>`,
    lightning: `<g transform="translate(375,400)" fill="${accent}" fill-opacity="0.65">
      <path d="M40 -180 L-60 20 H20 L-40 200 L100 -20 H20 Z"/></g>`,
    ice: `<g transform="translate(375,420)" fill="${accent}" fill-opacity="0.45" stroke="${accent}" stroke-width="4">
      <path d="M0 -150 L30 -30 L140 -40 L50 40 L90 150 L0 80 L-90 150 L-50 40 L-140 -40 L-30 -30 Z"/></g>`,
    holy: `<g transform="translate(375,400)" fill="${accent}" fill-opacity="0.55">
      <rect x="-22" y="-140" width="44" height="280" rx="6"/><rect x="-120" y="-22" width="240" height="44" rx="6"/>
      <circle cx="0" cy="0" r="50" fill="none" stroke="${accent}" stroke-width="8" opacity="0.5"/></g>`,
    dark: `<g transform="translate(375,400)" fill="${accent}" fill-opacity="0.5">
      <circle cx="0" cy="-20" r="90"/><circle cx="-30" cy="-30" r="14" fill="#0a0807"/><circle cx="30" cy="-30" r="14" fill="#0a0807"/>
      <path d="M-40 30 Q0 60 40 30" fill="none" stroke="#0a0807" stroke-width="8"/>
      <rect x="-12" y="70" width="24" height="120" rx="4"/></g>`,
    nature: `<g transform="translate(375,450)" fill="${accent}" fill-opacity="0.5">
      <path d="M0 120 L-20 -40 Q-80 -100 0 -160 Q80 -100 20 -40 Z"/>
      <ellipse cx="-70" cy="-20" rx="50" ry="30" transform="rotate(-30 -70 -20)"/>
      <ellipse cx="70" cy="-20" rx="50" ry="30" transform="rotate(30 70 -20)"/></g>`,
    dragon: `<g transform="translate(375,400)" fill="${accent}" fill-opacity="0.45">
      <ellipse cx="0" cy="40" rx="100" ry="70"/><path d="M-40 -20 L-120 -100 L-20 -40"/><path d="M40 -20 L120 -100 L20 -40"/>
      <circle cx="-25" cy="20" r="10" fill="#0a0807"/><circle cx="25" cy="20" r="10" fill="#0a0807"/>
      <path d="M-10 50 L0 70 L10 50" fill="#0a0807"/></g>`,
    creature: `<g transform="translate(375,420)" fill="${accent}" fill-opacity="0.5">
      <circle cx="0" cy="-80" r="70"/><rect x="-55" y="-10" width="110" height="160" rx="20"/>
      <rect x="-90" y="20" width="30" height="100" rx="10"/><rect x="60" y="20" width="30" height="100" rx="10"/>
      <circle cx="-25" cy="-90" r="10" fill="#0a0807"/><circle cx="25" cy="-90" r="10" fill="#0a0807"/></g>`,
    arrow: `<g transform="translate(375,420)" fill="${accent}" fill-opacity="0.6">
      <rect x="-8" y="-160" width="16" height="280" rx="4"/>
      <path d="M-30 -160 L0 -220 L30 -160 Z"/><path d="M-25 120 L0 90 L25 120 L0 150 Z"/></g>`,
    music: `<g transform="translate(375,400)" fill="${accent}" fill-opacity="0.55">
      <circle cx="-40" cy="80" r="40"/><circle cx="50" cy="50" r="32"/>
      <rect x="-30" y="-120" width="14" height="200"/><rect x="60" y="-140" width="12" height="190"/>
      <path d="M-16 -120 Q40 -160 72 -140" fill="none" stroke="${accent}" stroke-width="10"/></g>`,
    fist: `<g transform="translate(375,430)" fill="${accent}" fill-opacity="0.5">
      <rect x="-70" y="-40" width="140" height="120" rx="30"/>
      <rect x="-90" y="-100" width="40" height="80" rx="12"/><rect x="-40" y="-110" width="40" height="90" rx="12"/>
      <rect x="10" y="-110" width="40" height="90" rx="12"/><rect x="55" y="-90" width="35" height="70" rx="12"/></g>`,
    slash: `<g transform="translate(375,420)" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round" opacity="0.55">
      <path d="M-140 -100 Q0 20 140 140"/><path d="M-100 -140 Q20 0 160 100" opacity="0.5"/></g>`,
    spell: `<g transform="translate(375,420)" fill="none" stroke="${accent}" stroke-width="10" opacity="0.6">
      <circle cx="0" cy="0" r="100"/><circle cx="0" cy="0" r="55"/>
      <path d="M0 -130 L0 130 M-130 0 L130 0 M-90 -90 L90 90 M-90 90 L90 -90" stroke-width="6"/></g>`
  };

  const body = motifSvg[motif] || motifSvg.spell;
  const label = name.length > 28 ? name.slice(0, 26) + "…" : name;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1050" viewBox="0 0 750 1050">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="750" height="1050" fill="url(#g)"/>
  ${shapes.join("\n  ")}
  ${body}
  <text x="375" y="980" text-anchor="middle" fill="${accent}" fill-opacity="0.35" font-family="Georgia,serif" font-size="22">${escapeXml(label)}</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---- Conteúdo rico por deck ----
// Cada entrada: { name, name_en, type, type_en, subtype, subtype_en, kind, tags, mechanics, rules, rules_en, flavor, flavor_en }
// kind: creature | action | spell | ability | aura | merc

function pack(c, meta, cost, idx) {
  const isCreature = c.kind === "creature" || c.kind === "merc" || c.kind === "summon";
  const st = c.attack != null ? { attack: c.attack, defense: c.defense, showCombat: true }
    : statsForCost(cost, isCreature);
  // se não-criatura mas tem ATK definido
  if (c.showCombat) {
    st.showCombat = true;
    st.attack = c.attack ?? st.attack;
    st.defense = c.defense ?? st.defense;
  }
  const tags = c.tags || [];
  if (c.kind === "creature" && !tags.includes("creature")) tags.push("creature");
  if (c.kind === "merc" && !tags.includes("mercenary")) tags.push("mercenary");
  if (c.kind === "spell" && !tags.includes("spell")) tags.push("spell");
  if (c.kind === "action" && !tags.includes("action")) tags.push("action");
  if (c.kind === "ability" && !tags.includes("ability")) tags.push("ability");
  if (c.kind === "summon" && !tags.includes("summon")) tags.push("summon");

  const motif = pickMotif(c.name, c.type, tags);
  return {
    name: c.name,
    name_en: c.name_en || c.name,
    type: c.type,
    type_en: c.type_en || c.type,
    subtype: c.subtype || "",
    subtype_en: c.subtype_en || c.subtype || "",
    colorIds: [meta.id],
    costs: [{ resource: meta.res, amount: cost }],
    forceCost: true,
    rules: c.rules,
    rules_en: c.rules_en || c.rules,
    mechanics: c.mechanics || [],
    tags,
    flavor: c.flavor || "",
    flavor_en: c.flavor_en || c.flavor || "",
    showCombat: st.showCombat,
    attack: st.attack,
    defense: st.defense,
    rarity: c.rarity || rarityForCost(cost, idx),
    artData: svgArt(c.name, meta.hex, meta.hex2, motif)
  };
}

// Helper para regras multilinha
const R = (pt, en) => ({ rules: pt, rules_en: en || pt });
const F = (pt, en) => ({ flavor: pt, flavor_en: en || pt });

// ===================== DECKS (50 cada, ordem = curva) =====================

const RED = [
  // cost 1 x12
  { name: "Golpe Básico", name_en: "Basic Strike", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["damage_1"],
    ...R("Escolha uma criatura ou mercenário inimigo. Causa 1 de dano.\nSe você controla um mercenário com arma, causa +1 de dano em vez disso.",
      "Choose an enemy creature or mercenary. Deal 1 damage.\nIf you control a weapon mercenary, deal +1 damage instead."),
    ...F("O primeiro corte é o que abre o caminho.", "The first cut opens the path.") },
  { name: "Postura de Guarda", name_en: "Guard Stance", type: "Ação", type_en: "Action", subtype: "Defesa", kind: "action",
    tags: ["action"], mechanics: ["shield_block"],
    ...R("Até o início do seu próximo turno, a próxima fonte de dano que você sofrer é reduzida em 2.\nSe estiver com escudo equipado na ficha, reduza em 3 em vez disso.",
      "Until your next turn, the next damage you take is reduced by 2.\nIf a shield is equipped on your sheet, reduce by 3 instead."),
    ...F("Escudo alto, olhar baixo, coração firme.", "Shield high, gaze low, heart steady.") },
  { name: "Grito de Guerra", name_en: "War Cry", type: "Ação", type_en: "Action", subtype: "Tática", kind: "action",
    tags: ["action"], mechanics: ["gain_fury_1", "taunt"],
    ...R("Ganhe 1 {fury}.\nAté o fim do turno, seus mercenários e criaturas ganham +0/+1 e o oponente deve escolhê-los como alvo de ataques se possível.",
      "Gain 1 {fury}.\nUntil end of turn, your mercenaries and creatures get +0/+1 and the opponent must target them with attacks if able."),
    ...F("O eco das muralhas responde ao grito.", "The walls answer the cry.") },
  { name: "Escudeiro Leal", name_en: "Loyal Squire", type: "Mercenário", type_en: "Mercenary", subtype: "Humanoide", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["taunt"],
    ...R("Quando este mercenário entra em jogo, você pode dar +0/+1 a outra criatura ou mercenário aliado até o fim do turno.\nEle bloqueia com preferência se o oponente declarar um ataque a você.",
      "When this mercenary enters, you may give another ally creature or mercenary +0/+1 until end of turn.\nIt prefers to block if the opponent attacks you."),
    ...F("Carrega o escudo do mestre como se fosse o próprio.", "He bears his master's shield as his own.") },
  { name: "Fôlego de Aço", name_en: "Iron Breath", type: "Habilidade", type_en: "Ability", subtype: "Passiva", kind: "ability",
    tags: ["ability"], mechanics: ["second_wind"],
    ...R("Uma vez por combate: se você perdeu PV neste turno, recupere 2 PV.\nNão pode ser usada se você estiver com 0 de {vigor} restante.",
      "Once per combat: if you lost HP this turn, regain 2 HP.\nCannot be used if you have 0 {vigor} left."),
    ...F("O guerreiro respira o metal do campo de batalha.", "The warrior breathes the metal of the field.") },
  { name: "Investida Curta", name_en: "Short Charge", type: "Ação", type_en: "Action", subtype: "Movimento", kind: "action",
    tags: ["action"], mechanics: ["charge", "damage_1"],
    ...R("Escolha um aliado com combate. Ele ganha Ímpeto neste turno e causa +1 de dano no primeiro ataque.\nGaste 1 {fury} adicional: o dano extra vira +2.",
      "Choose a combat ally. It gains Haste this turn and deals +1 damage on its first attack.\nSpend 1 extra {fury}: the bonus becomes +2."),
    ...F("Três passos e o choque do aço.", "Three steps and the clash of steel.") },
  { name: "Lança de Recruta", name_en: "Recruit's Spear", type: "Criatura", type_en: "Creature", subtype: "Arma-viva", kind: "creature",
    tags: ["creature"], mechanics: ["reach", "first_strike"],
    ...R("Alcance. Iniciativa.\nEnquanto esta criatura estiver em jogo, seus ataques contra criaturas com Voo podem bloqueá-las como se tivessem Alcance.",
      "Reach. First Strike.\nWhile this is in play, your attacks can block Flying as if they had Reach."),
    ...F("A madeira treme, mas a ponta não mente.", "The wood shakes, but the tip does not lie.") },
  { name: "Provocação", name_en: "Taunt", type: "Ação", type_en: "Action", subtype: "Controle", kind: "action",
    tags: ["action"], mechanics: ["taunt"],
    ...R("Escolha uma criatura inimiga. Até o fim do próximo turno do oponente, ela deve atacar se puder e não pode atacar o jogador diretamente se houver bloqueadores.",
      "Choose an enemy creature. Until the end of the opponent's next turn, it must attack if able and cannot attack the player directly if blockers exist."),
    ...F("Palavras afiadas valem mais que espadas cegas.", "Sharp words beat dull swords.") },
  { name: "Bandagem de Campo", name_en: "Field Bandage", type: "Ação", type_en: "Action", subtype: "Cura", kind: "action",
    tags: ["action"], mechanics: ["second_wind", "heal_2"],
    ...R("Recupere 2 PV ou remova 1 dano de uma criatura/mercenário aliado.\nSe você tiver usado uma Ação de ataque neste turno, recupere 1 PV adicional.",
      "Regain 2 HP or remove 1 damage from an ally creature/mercenary.\nIf you used an attack Action this turn, regain 1 extra HP."),
    ...F("Não é magia — é disciplina e trapos limpos.", "Not magic — discipline and clean rags.") },
  { name: "Soldado de Linha", name_en: "Line Soldier", type: "Mercenário", type_en: "Mercenary", subtype: "Humanoide", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["vigilance"],
    ...R("Vigilância.\nEnquanto estiver ao lado de outro mercenário, este ganha +1/+0.",
      "Vigilance.\nWhile beside another mercenary, this gets +1/+0."),
    ...F("Formação, passo, golpe. Repetir até a vitória.", "Form, step, strike. Repeat until victory.") },
  { name: "Fúria Contida", name_en: "Held Fury", type: "Habilidade", type_en: "Ability", subtype: "Recurso", kind: "ability",
    tags: ["ability"], mechanics: ["gain_fury_1"],
    ...R("No início do seu turno, se você não gastou {fury} no turno anterior, ganhe 1 {fury}.\nMáximo de 3 {fury} gerados desta forma por combate.",
      "At the start of your turn, if you spent no {fury} last turn, gain 1 {fury}.\nMaximum 3 {fury} generated this way per combat."),
    ...F("A raiva guardada pesa mais que a armadura.", "Stored rage weighs more than armor.") },
  { name: "Corte Rasteiro", name_en: "Low Cut", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["damage_1", "pierce"],
    ...R("Causa 1 de dano a uma criatura. Este dano ignora 1 de defesa.\nSe o alvo tiver 2 DEF ou menos após o golpe, ele não pode bloquear no próximo turno.",
      "Deal 1 damage to a creature. This damage ignores 1 defense.\nIf the target has 2 DEF or less after the hit, it cannot block next turn."),
    ...F("Joelho, tendão, fim da corrida.", "Knee, tendon, end of the run.") },
  // cost 2 x12
  { name: "Golpe Poderoso", name_en: "Power Attack", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["power_attack", "damage_2"],
    ...R("Causa 2 de dano a um alvo em combate.\nVocê pode gastar 1 {fury}: o dano se torna 3, mas se o alvo sobreviver, ele causa 1 de dano de volta a você.",
      "Deal 2 damage to a combat target.\nYou may spend 1 {fury}: damage becomes 3, but if the target survives, it deals 1 damage back to you."),
    ...F("Força bruta com um preço em sangue.", "Brute force with a blood price.") },
  { name: "Investida Súbita", name_en: "Sudden Charge", type: "Ação", type_en: "Action", subtype: "Movimento", kind: "action",
    tags: ["action"], mechanics: ["charge", "haste", "damage_2"],
    ...R("Uma criatura ou mercenário seu ganha Ímpeto.\nSe atacar neste turno, causa +2 de dano no primeiro combate e depois perde Ímpeto.",
      "One of your creatures or mercenaries gains Haste.\nIf it attacks this turn, it deals +2 damage on first combat, then loses Haste."),
    ...F("Do nada ao choque em um fôlego.", "From nothing to clash in one breath.") },
  { name: "Muralha de Escudos", name_en: "Shield Wall", type: "Ação", type_en: "Action", subtype: "Formação", kind: "action",
    tags: ["action"], mechanics: ["shield_block", "taunt"],
    ...R("Até o início do seu próximo turno, todas as suas criaturas e mercenários ganham +0/+2 e Provocar.\nVocê não pode declarar ataques neste turno.",
      "Until your next turn, all your creatures and mercenaries get +0/+2 and Taunt.\nYou cannot declare attacks this turn."),
    ...F("Um muro de madeira e juramentos.", "A wall of wood and oaths.") },
  { name: "Berserker de Clã", name_en: "Clan Berserker", type: "Mercenário", type_en: "Mercenary", subtype: "Bárbaro", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["haste", "trample"],
    ...R("Ímpeto. Atropelar.\nNo fim de cada um dos seus turnos, se este mercenário atacou, ele sofre 1 de dano.",
      "Haste. Trample.\nAt the end of each of your turns, if this attacked, it takes 1 damage."),
    ...F("A fúria come o corpo que a carrega.", "Fury eats the body that carries it.") },
  { name: "Maestria de Espada", name_en: "Sword Mastery", type: "Habilidade", type_en: "Ability", subtype: "Treino", kind: "ability",
    tags: ["ability"], mechanics: ["weapon_mastery"],
    ...R("Enquanto você tiver um item com tag arma equipado na ficha, suas Ações de ataque causam +1 de dano.\nUma vez por turno: ao destruir uma criatura, ganhe 1 {fury}.",
      "While a weapon-tagged item is equipped on your sheet, your attack Actions deal +1 damage.\nOnce per turn: when you destroy a creature, gain 1 {fury}."),
    ...F("A lâmina conhece a mão antes da batalha.", "The blade knows the hand before battle.") },
  { name: "Quebra-Ossos", name_en: "Bonebreaker", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["damage_2", "pierce"],
    ...R("Causa 2 de dano a uma criatura. Ignore até 2 de defesa dela.\nSe destruir o alvo, compre 1 carta.",
      "Deal 2 damage to a creature. Ignore up to 2 of its defense.\nIf you destroy it, draw 1 card."),
    ...F("O estalo ecoa mais alto que o grito.", "The crack echoes louder than the scream.") },
  { name: "Veterano de Campanha", name_en: "Campaign Veteran", type: "Mercenário", type_en: "Mercenary", subtype: "Humanoide", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["vigilance", "first_strike"],
    ...R("Vigilância. Iniciativa.\nQuando outro mercenário seu morrer, este ganha +1/+1 até o fim da batalha.",
      "Vigilance. First Strike.\nWhen another of your mercenaries dies, this gets +1/+1 for the rest of the battle."),
    ...F("Já enterrou amigos demais para tremer.", "He has buried too many friends to shake.") },
  { name: "Segundo Fôlego", name_en: "Second Wind", type: "Ação", type_en: "Action", subtype: "Cura", kind: "action",
    tags: ["action"], mechanics: ["second_wind", "heal_2"],
    ...R("Recupere 3 PV.\nSe você estiver abaixo da metade dos PV máximos, recupere 4 PV em vez disso e ganhe 1 {vigor} neste turno.",
      "Regain 3 HP.\nIf you are below half max HP, regain 4 HP instead and gain 1 {vigor} this turn."),
    ...F("O corpo cede. A vontade não.", "The body yields. The will does not.") },
  { name: "Escudeiro de Elite", name_en: "Elite Shieldbearer", type: "Criatura", type_en: "Creature", subtype: "Guarda", kind: "creature",
    tags: ["creature"], mechanics: ["taunt", "shield_block"],
    ...R("Provocar.\nReduz em 1 o dano que você sofreria de ataques diretos enquanto esta criatura estiver em jogo.",
      "Taunt.\nReduces by 1 the damage you would take from direct attacks while this is in play."),
    ...F("Entre o rei e a lâmina, só ele.", "Between king and blade, only him.") },
  { name: "Racha-Armadura", name_en: "Armor Splitter", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["damage_2", "pierce"],
    ...R("Causa 2 de dano. O alvo perde 1 DEF permanente até o fim da batalha (mínimo 0).\nSe o alvo for um mercenário, ele também perde Vigilância se tiver.",
      "Deal 2 damage. The target loses 1 DEF permanently until end of battle (min 0).\nIf the target is a mercenary, it also loses Vigilance if it has it."),
    ...F("Placas abrem como cascas.", "Plates open like shells.") },
  { name: "Aura de Comando", name_en: "Command Aura", type: "Encantamento", type_en: "Enchantment", subtype: "Aura", kind: "aura",
    tags: ["enchantment", "ability"], mechanics: ["rage_aura"],
    ...R("Enquanto este encantamento estiver em jogo, seus mercenários ganham +1/+0.\nQuando você sobe de nível na batalha, seus mercenários ganham +0/+1 até o fim do turno.",
      "While this enchantment is in play, your mercenaries get +1/+0.\nWhen you level up in battle, your mercenaries get +0/+1 until end of turn."),
    ...F("A voz do capitão carrega mais que ordens.", "The captain's voice carries more than orders.") },
  { name: "Contra-Ataque", name_en: "Counterstrike", type: "Ação", type_en: "Action", subtype: "Reação", kind: "action",
    tags: ["action"], mechanics: ["damage_2", "first_strike"],
    ...R("Jogue apenas após um ataque inimigo ser declarado contra você ou um aliado.\nCausa 2 de dano ao atacante antes da resolução. Se ele for destruído, o ataque é anulado.",
      "Play only after an enemy attack is declared against you or an ally.\nDeal 2 damage to the attacker before resolution. If it is destroyed, the attack is canceled."),
    ...F("Quem avança sem olhar, cai sem aviso.", "Who advances without looking falls without warning.") },
  // cost 3 x10
  { name: "Fúria do Bárbaro", name_en: "Barbarian Rage", type: "Habilidade", type_en: "Ability", subtype: "Fúria", kind: "ability",
    tags: ["ability"], mechanics: ["rage_aura", "gain_fury_2", "damage_3"],
    ...R("Ganhe 2 {fury}. Até o fim do turno, suas Ações de ataque causam +1 de dano e você sofre 1 a menos de dano de combate.\nNo fim do turno, descarte 1 carta se ainda tiver 3 ou mais {fury}.",
      "Gain 2 {fury}. Until end of turn, your attack Actions deal +1 damage and you take 1 less combat damage.\nAt end of turn, discard 1 card if you still have 3 or more {fury}."),
    ...F("O mundo fica vermelho e simples.", "The world turns red and simple.") },
  { name: "Campeão de Arena", name_en: "Arena Champion", type: "Mercenário", type_en: "Mercenary", subtype: "Gladiador", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["first_strike", "trample", "lifelink"],
    ...R("Iniciativa. Atropelar. Vampirismo.\nQuando este mercenário destruir uma criatura, ganhe 1 XP de batalha (ou 1 {gold} se o modo não usar XP).",
      "First Strike. Trample. Lifelink.\nWhen this destroys a creature, gain 1 battle XP (or 1 {gold} if the mode has no XP)."),
    ...F("A areia já conhece o nome dele.", "The sand already knows his name.") },
  { name: "Investida Demolidora", name_en: "Demolishing Charge", type: "Ação", type_en: "Action", subtype: "Movimento", kind: "action",
    tags: ["action"], mechanics: ["charge", "damage_3", "trample"],
    ...R("Escolha um aliado em combate: ele ataca imediatamente com +2 de ATK e Atropelar neste combate.\nGaste 2 {fury}: o excesso de dano também afeta outra criatura adjacente.",
      "Choose a combat ally: it attacks immediately with +2 ATK and Trample for this combat.\nSpend 2 {fury}: excess damage also hits another adjacent creature."),
    ...F("O chão treme antes do impacto.", "The ground shakes before impact.") },
  { name: "Couraça de Guerra", name_en: "War Cuirass", type: "Encantamento", type_en: "Enchantment", subtype: "Proteção", kind: "aura",
    tags: ["enchantment"], mechanics: ["shield_block", "permanent_buff_1"],
    ...R("Você ganha +0/+2 como bônus de combate (conta como DEF do jogador).\nUma vez por turno, ao bloquear com um mercenário, previna 1 de dano a ele.",
      "You get +0/+2 as a combat bonus (counts as player DEF).\nOnce per turn, when a mercenary blocks, prevent 1 damage to it."),
    ...F("Placas amassadas contam vitórias.", "Dented plates count victories.") },
  { name: "Duelo Honrado", name_en: "Honorable Duel", type: "Ação", type_en: "Action", subtype: "Tática", kind: "action",
    tags: ["action"], mechanics: ["damage_3", "taunt"],
    ...R("Escolha uma criatura inimiga e uma aliada. Elas combatem uma à outra imediatamente.\nA vencedora ganha +1/+1. Se a sua vencer, compre 1 carta.",
      "Choose an enemy creature and an ally. They fight each other immediately.\nThe winner gets +1/+1. If yours wins, draw 1 card."),
    ...F("Dois guerreiros. Um chão. Nenhuma plateia necessária.", "Two warriors. One ground. No audience needed.") },
  { name: "Legionário de Ferro", name_en: "Iron Legionnaire", type: "Criatura", type_en: "Creature", subtype: "Soldado", kind: "creature",
    tags: ["creature"], mechanics: ["vigilance", "taunt", "regenerate_1"],
    ...R("Vigilância. Provocar.\nNo início do seu turno, se este não atacou no turno anterior, recupera 1 DEF perdida (até o máximo impresso).",
      "Vigilance. Taunt.\nAt the start of your turn, if this did not attack last turn, it recovers 1 lost DEF (up to printed max)."),
    ...F("A legião não recua — reorganiza.", "The legion does not retreat — it reforms.") },
  { name: "Quebra-Linha", name_en: "Line Breaker", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["damage_3", "aoe_damage"],
    ...R("Causa 2 de dano a uma criatura e 1 de dano a cada outra criatura inimiga.\nSe destruir o alvo principal, ganhe 1 {fury}.",
      "Deal 2 damage to a creature and 1 damage to each other enemy creature.\nIf you destroy the main target, gain 1 {fury}."),
    ...F("A falange se abre como um livro rasgado.", "The phalanx opens like a torn book.") },
  { name: "Capitão de Companheiros", name_en: "Company Captain", type: "Mercenário", type_en: "Mercenary", subtype: "Líder", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["weapon_mastery", "taunt"],
    ...R("Outros mercenários seus têm +1/+1.\nQuando este capitão entra, você pode contratar (jogar) um mercenário de custo 2 ou menos da mão pagando 1 {gold} a menos (mínimo 0).",
      "Your other mercenaries get +1/+1.\nWhen this captain enters, you may hire (play) a mercenary of cost 2 or less from hand for 1 less {gold} (min 0)."),
    ...F("Ele paga o soldo e cobra a coragem.", "He pays the wage and collects courage.") },
  { name: "Último Empurrão", name_en: "Final Push", type: "Ação", type_en: "Action", subtype: "Ataque", kind: "action",
    tags: ["action"], mechanics: ["damage_3", "spend_fury"],
    ...R("Causa 3 de dano. Para cada {fury} gasta além do custo (máx. 2), cause +1 de dano.\nSe isto destruir um alvo, você sobe 1 nível de batalha se a regra de XP estiver ativa.",
      "Deal 3 damage. For each {fury} spent beyond the cost (max 2), deal +1 damage.\nIf this destroys a target, you gain 1 battle level if XP rules are active."),
    ...F("Tudo ou nada — e quase sempre tudo.", "All or nothing — and almost always all.") },
  { name: "Juramento de Aço", name_en: "Oath of Steel", type: "Encantamento", type_en: "Enchantment", subtype: "Voto", kind: "aura",
    tags: ["enchantment"], mechanics: ["permanent_buff_1", "lifelink"],
    ...R("Suas Ações de ataque ganham Vampirismo (curam 1 PV quando causam dano).\nSe você perder 5 ou mais PV em um único turno, sacrifique este encantamento e recupere 3 PV.",
      "Your attack Actions gain Lifelink (heal 1 HP when they deal damage).\nIf you lose 5 or more HP in a single turn, sacrifice this and regain 3 HP."),
    ...F("O aço lembra o juramento melhor que a boca.", "Steel remembers the oath better than the mouth.") },
  // cost 4 x8
  { name: "Carga do Rinoceronte", name_en: "Rhino Charge", type: "Ação", type_en: "Action", subtype: "Movimento", kind: "action",
    tags: ["action"], mechanics: ["charge", "damage_4", "trample"],
    ...R("Um aliado com combate ganha +3 ATK, Atropelar e ataca imediatamente.\nApós o combate, ele sofre 1 de dano e fica esgotado (não ataca no próximo turno).",
      "A combat ally gets +3 ATK, Trample, and attacks immediately.\nAfter combat, it takes 1 damage and is exhausted (cannot attack next turn)."),
    ...F("Não há trincheira que segure esse peso.", "No trench holds that weight.") },
  { name: "General de Campo", name_en: "Field General", type: "Mercenário", type_en: "Mercenary", subtype: "Comandante", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["vigilance", "rage_aura", "draw_1"],
    ...R("Vigilância. Seus mercenários têm +1/+1 e Iniciativa.\nQuando você sobe de nível, compre 1 carta.",
      "Vigilance. Your mercenaries have +1/+1 and First Strike.\nWhen you level up, draw 1 card."),
    ...F("Mapas, cornetas e o cheiro de vitória.", "Maps, horns, and the smell of victory.") },
  { name: "Tempestade de Aço", name_en: "Steel Storm", type: "Ação", type_en: "Action", subtype: "Ataque em área", kind: "action",
    tags: ["action"], mechanics: ["damage_4", "aoe_damage"],
    ...R("Causa 2 de dano a cada criatura e mercenário inimigo.\nGaste qualquer quantidade de {fury}: cause +1 de dano a um alvo escolhido por {fury} gasta (máx. 3).",
      "Deal 2 damage to each enemy creature and mercenary.\nSpend any amount of {fury}: deal +1 damage to one chosen target per {fury} spent (max 3)."),
    ...F("Lâminas giram como um moinho de guerra.", "Blades spin like a war mill.") },
  { name: "Baluarte Imortal", name_en: "Undying Bulwark", type: "Criatura", type_en: "Creature", subtype: "Defensor", kind: "creature",
    tags: ["creature"], mechanics: ["taunt", "regenerate_1", "shield_block"],
    ...R("Provocar. Regenerar 1.\nA primeira vez que este seria destruído a cada batalha, ele permanece com 1 DEF e você perde 1 {vigor}.",
      "Taunt. Regenerate 1.\nThe first time this would be destroyed each battle, it remains at 1 DEF and you lose 1 {vigor}."),
    ...F("A muralha aprendeu a sangrar sem cair.", "The wall learned to bleed without falling.") },
  { name: "Execução Marcial", name_en: "Martial Execution", type: "Ação", type_en: "Action", subtype: "Finalização", kind: "action",
    tags: ["action"], mechanics: ["damage_4", "pierce"],
    ...R("Causa 4 de dano a uma criatura danificada. Ignore toda a defesa dela.\nSe isto a destruir, ganhe 2 XP (ou 2 {gold}) e 1 {fury}.",
      "Deal 4 damage to a damaged creature. Ignore all its defense.\nIf this destroys it, gain 2 XP (or 2 {gold}) and 1 {fury}."),
    ...F("O golpe que encerra debates.", "The strike that ends arguments.") },
  { name: "Bando de Mercenários", name_en: "Mercenary Band", type: "Mercenário", type_en: "Mercenary", subtype: "Tropa", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["hire_gold", "trample"],
    ...R("Atropelar. Conta como três mercenários para efeitos de formação.\nCusto alternativo: pague 2 {gold} em vez do custo de {vigor}.",
      "Trample. Counts as three mercenaries for formation effects.\nAlternate cost: pay 2 {gold} instead of the {vigor} cost."),
    ...F("Contrato assinado em sangue e moedas.", "Contract signed in blood and coins.") },
  { name: "Domínio da Batalha", name_en: "Battlefield Dominance", type: "Encantamento", type_en: "Enchantment", subtype: "Tática", kind: "aura",
    tags: ["enchantment"], mechanics: ["rage_aura", "draw_1", "gain_resource_1"],
    ...R("No início do seu turno, ganhe 1 {vigor} se controla 2 ou mais unidades de combate.\nQuando uma unidade inimiga morre, compre 1 carta (máx. 1 por turno).",
      "At the start of your turn, gain 1 {vigor} if you control 2 or more combat units.\nWhen an enemy unit dies, draw 1 card (max 1 per turn)."),
    ...F("Quem controla o chão controla o destino.", "Who controls the ground controls fate.") },
  { name: "Colosso de Guerra", name_en: "War Colossus", type: "Criatura", type_en: "Creature", subtype: "Gigante de batalha", kind: "creature",
    tags: ["creature"], mechanics: ["trample", "haste", "damage_4"],
    ...R("Ímpeto. Atropelar.\nCusta 1 {vigor} adicional para cada criatura que você já controla (máx. +2).\nQuando ataca, causa 1 de dano a cada criatura bloqueadora antes do combate.",
      "Haste. Trample.\nCosts 1 extra {vigor} for each creature you already control (max +2).\nWhen it attacks, deal 1 damage to each blocking creature before combat."),
    ...F("A legenda andando em placas de aço.", "Legend walking in steel plates.") },
  // cost 5 x5
  { name: "Avatar da Guerra", name_en: "Avatar of War", type: "Criatura", type_en: "Creature", subtype: "Avatar", kind: "creature",
    tags: ["creature"], mechanics: ["trample", "lifelink", "rage_aura"],
    ...R("Atropelar. Vampirismo.\nOutras unidades de combate suas têm +2/+1.\nNo fim do turno em que entrou, se não atacou, cause 3 de dano a um alvo à sua escolha.",
      "Trample. Lifelink.\nYour other combat units get +2/+1.\nAt end of the turn it entered, if it did not attack, deal 3 damage to a target of your choice."),
    ...F("A guerra ganhou rosto e braços.", "War grew a face and arms.") },
  { name: "Fúria Primordial", name_en: "Primal Fury", type: "Ação", type_en: "Action", subtype: "Ultimate", kind: "action",
    tags: ["action"], mechanics: ["damage_5", "spend_fury", "aoe_damage"],
    ...R("Gaste toda a sua {fury} (mín. 1). Cause 3 de dano + 1 por {fury} gasta a uma criatura, e 2 de dano a todas as outras inimigas.\nVocê não pode ganhar {fury} no próximo turno.",
      "Spend all your {fury} (min 1). Deal 3 damage + 1 per {fury} spent to a creature, and 2 damage to all other enemies.\nYou cannot gain {fury} next turn."),
    ...F("Depois disso, só cinzas e silêncio.", "After this, only ash and silence.") },
  { name: "Senhor da Batalha", name_en: "Battlelord", type: "Mercenário", type_en: "Mercenary", subtype: "Herói", kind: "merc",
    tags: ["mercenary", "creature"], mechanics: ["first_strike", "vigilance", "weapon_mastery", "draw_1"],
    ...R("Iniciativa. Vigilância. Maestria de arma.\nUma vez por turno, quando você joga uma Ação de ataque, copie-a (o custo não é pago de novo).\nÚnica: só uma cópia desta carta pode estar no seu deck.",
      "First Strike. Vigilance. Weapon Mastery.\nOnce per turn, when you play an attack Action, copy it (cost not paid again).\nUnique: only one copy of this card may be in your deck."),
    ...F("Reinos caem; o senhor da batalha permanece.", "Realms fall; the battlelord remains.") },
  { name: "Cerco Implacável", name_en: "Relentless Siege", type: "Encantamento", type_en: "Enchantment", subtype: "Campanha", kind: "aura",
    tags: ["enchantment"], mechanics: ["damage_3", "permanent_buff_1"],
    ...R("No início de cada um dos seus turnos, cause 1 de dano a cada unidade inimiga.\nSuas unidades ganham +1/+1 enquanto o oponente controla 3 ou mais unidades.\nSe o oponente não controla unidades, sacrifique isto e cause 4 de dano a ele.",
      "At the start of each of your turns, deal 1 damage to each enemy unit.\nYour units get +1/+1 while the opponent controls 3 or more units.\nIf the opponent controls no units, sacrifice this and deal 4 damage to them."),
    ...F("O cerco não pergunta se você está pronto.", "The siege does not ask if you are ready.") },
  { name: "Lâmina do Conquistador", name_en: "Conqueror's Blade", type: "Ação", type_en: "Action", subtype: "Arma lendária", kind: "action",
    tags: ["action"], mechanics: ["damage_5", "pierce", "lifelink"],
    ...R("Causa 5 de dano a um alvo. Ignore toda a defesa. Você recupera PV igual à metade do dano causado (arredondado para baixo).\nSe destruir um chefe ou o último defensor inimigo, você ganha 1 nível de batalha.",
      "Deal 5 damage to a target. Ignore all defense. You regain HP equal to half the damage dealt (rounded down).\nIf this destroys a boss or the last enemy defender, you gain 1 battle level."),
    ...F("Reis ajoelham-se ao ouvir o nome da lâmina.", "Kings kneel when they hear the blade's name.") },
  // cost 6 x3
  { name: "Cataclismo de Guerra", name_en: "War Cataclysm", type: "Ação", type_en: "Action", subtype: "Ultimate", kind: "action",
    tags: ["action"], mechanics: ["damage_6", "aoe_damage", "trample"],
    ...R("Causa 4 de dano a cada unidade inimiga e 3 de dano ao jogador oponente.\nDestrua todos os seus encantamentos. Você não pode jogar Ações no próximo turno.\nÚnica.",
      "Deal 4 damage to each enemy unit and 3 damage to the opposing player.\nDestroy all your enchantments. You cannot play Actions next turn.\nUnique."),
    ...F("Quando a guerra termina assim, ninguém canta.", "When war ends like this, no one sings.") },
  { name: "Titã de Ferro", name_en: "Iron Titan", type: "Criatura", type_en: "Creature", subtype: "Construto de guerra", kind: "creature",
    tags: ["creature", "summon"], mechanics: ["trample", "vigilance", "regenerate_1", "taunt"],
    ...R("Atropelar. Vigilância. Regenerar 1. Provocar.\nNão pode ser alvo de magias de custo 2 ou menos.\nQuando esta criatura destrói outra, você ganha 1 nível ou 3 {gold}.\nÚnica.",
      "Trample. Vigilance. Regenerate 1. Taunt.\nCannot be targeted by spells of cost 2 or less.\nWhen this destroys another, you gain 1 level or 3 {gold}.\nUnique."),
    ...F("Forjado para durar mais que impérios.", "Forged to outlast empires.") },
  { name: "Coroação do Conquistador", name_en: "Conqueror's Coronation", type: "Encantamento", type_en: "Enchantment", subtype: "Vitória", kind: "aura",
    tags: ["enchantment"], mechanics: ["draw_2", "gain_resource_2", "permanent_buff_1"],
    ...R("Quando entra: compre 2 cartas e ganhe 2 {vigor}.\nVocê tem +2 PV máximos. Suas unidades têm +1/+1.\nSe seus PV chegarem a 0 enquanto isto estiver em jogo, em vez disso fique com 1 PV e sacrifique este encantamento.\nÚnica.",
      "When it enters: draw 2 cards and gain 2 {vigor}.\nYou have +2 max HP. Your units have +1/+1.\nIf your HP would reach 0 while this is in play, instead set HP to 1 and sacrifice this.\nUnique."),
    ...F("A coroa pesa o tanto do sangue derramado.", "The crown weighs as much as the blood spilled.") }
];

// Due to length limits I'll generate other decks programmatically from templates
// while keeping RED fully handcrafted as reference quality, and expand others with rich banks.

function makeDeck(colorKey, entries) {
  const meta = COLORS[colorKey];
  if (entries.length !== 50) {
    throw new Error(`${colorKey}: expected 50 cards, got ${entries.length}`);
  }
  return entries.map((c, i) => pack(c, meta, CURVE[i], i));
}

// ---- Template builders for other colors with unique names + rich text ----
function buildClassDeck(colorKey, cards) {
  return makeDeck(colorKey, cards);
}

// I'll include full lists for all colors in the generator file via a separate data approach
// Loading from inline modules for blue, green, etc.

function loadOtherDecks() {
  // Dynamically require the rest from companion file if exists, else build here
  return null;
}

// Continue writing remaining decks as compact but rich definitions
const { BLUE, GREEN, BLACK, PURPLE, WHITE, SILVER, RESOURCES, EQUIPMENT } = require("./seedContent.js");

function main() {
  const out = {
    deck_red: makeDeck("red", RED),
    deck_blue: makeDeck("blue", BLUE),
    deck_green: makeDeck("green", GREEN),
    deck_black: makeDeck("black", BLACK),
    deck_purple: makeDeck("purple", PURPLE),
    deck_white: makeDeck("white", WHITE),
    deck_silver: makeDeck("silver", SILVER),
    deck_resources: RESOURCES.map((c, i) => {
      const meta = { id: "silver", res: "gold", hex: "#e0b040", hex2: "#3a3010" };
      const cost = c.cost != null ? c.cost : 0;
      const packed = pack({ ...c, kind: c.kind || "resource", tags: c.tags || ["resource"] }, meta, cost, i);
      packed.colorIds = ["silver"];
      packed.category = "resource";
      packed.costs = [{ resource: c.resource || "gold", amount: cost }];
      packed.showCombat = false;
      packed.attack = 0;
      packed.defense = 0;
      packed.artData = svgArt(c.name, "#e0b040", "#2a2010", pickMotif(c.name, c.type, ["resource"]));
      return packed;
    }),
    deck_equipment: EQUIPMENT.map((c, i) => {
      const meta = { id: "white", res: "gold", hex: "#c3a15a", hex2: "#2a2010" };
      const cost = c.cost != null ? c.cost : CURVE[Math.min(i, 49)];
      const packed = pack({
        ...c,
        kind: "equipment",
        tags: c.tags || ["equipment"],
        showCombat: c.showCombat,
        attack: c.attack,
        defense: c.defense
      }, meta, cost, i);
      packed.colorIds = ["white"];
      packed.category = "equipment";
      packed.costs = [{ resource: "gold", amount: cost }];
      packed.artData = svgArt(c.name, "#c3a15a", "#2a2010", pickMotif(c.name, c.type, c.tags));
      return packed;
    })
  };

  // verify curves
  for (const [k, arr] of Object.entries(out)) {
    if (arr.length !== 50) throw new Error(`${k} length ${arr.length}`);
    const hist = {};
    arr.forEach((c) => {
      const a = c.costs[0].amount;
      hist[a] = (hist[a] || 0) + 1;
    });
    console.log(k, "curve", hist, "sample", arr[0].name, "|", arr[17].name, "|", arr[40].name);
  }

  const target = path.join(__dirname, "..", "js", "data", "seedDecks.js");
  const header = "/* 50 cards/deck — nomes reais, textos ricos, curva balanceada, arte individual */\n";
  fs.writeFileSync(target, header + "var SeedDecks = " + JSON.stringify(out) + ";\n");
  console.log("Wrote", target, "bytes", fs.statSync(target).size);
}

main();

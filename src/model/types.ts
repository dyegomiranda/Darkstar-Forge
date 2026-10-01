/**
 * Modelo de dados do Darkstar Forge (uma fonte da verdade, versionada).
 *
 * Projeto → edições → decks → cartas. Cada carta pertence a UM deck (deckId).
 * Texto só em `text[idioma]`. Aparência: o deck define o tema (look) e a
 * carta guarda apenas o que difere dele.
 */
import type { Look } from '../render/compose';

export type Lang = 'pt-BR' | 'en-US';
export const LANGS: Lang[] = ['pt-BR', 'en-US'];

/** Cores de deck = identidades de classe. */
export type ColorId = 'red' | 'blue' | 'green' | 'black' | 'purple' | 'white' | 'silver' | 'orange' | 'gear';
export type ResourceId = 'vigor' | 'fury' | 'mana' | 'nature' | 'souls' | 'shadow' | 'faith' | 'focus' | 'gold';
export type RarityId = 'common' | 'uncommon' | 'rare' | 'unique';

export interface CardText { name: string; type: string; subtype: string; rules: string; flavor: string }

export interface CardArt {
  /** Imagem guardada no banco de mídia (id = hash do conteúdo). */
  mediaId?: string;
  /** Zoom (1 = cobre a carta). */
  zoom: number;
  /** Deslocamento em px da carta (750×1050). */
  x: number;
  y: number;
  mirror: boolean;
  /** Arte provisória: um símbolo da biblioteca sobre um fundo na cor da classe. */
  icon?: string;
}

/** Uma parte do custo. `show`: número ao lado do símbolo ou o símbolo repetido (como no MTG). */
export interface CostPart { resource: ResourceId; amount: number; show?: 'number' | 'repeat' }

export interface Card {
  id: string;
  deckId: string;
  /** Posição na coleção (número do colecionador). */
  n: number;
  text: Record<Lang, CardText>;
  /** 1 cor = mono; 2 = híbrida (duas classes). */
  colors: ColorId[];
  /** Custos (recurso + quantidade). Lista vazia = sem custo. Total = soma. */
  cost: CostPart[];
  stats: { atk: number; def: number } | null;
  rarity: RarityId;
  /** Mecânicas da tabela de pontuação (definem o custo sugerido). */
  mechanics: string[];
  tags: string[];
  /** 'auto' = custo segue a pontuação; 'manual' = o usuário fixou. */
  costMode: 'auto' | 'manual';
  rarityMode: 'auto' | 'manual';
  art: CardArt;
  /** Ajustes de aparência só desta carta (por cima do tema do deck). */
  look?: Partial<Look>;
  /** O que a carta faz na Mesa de teste (protótipo do jogo). */
  game?: import('../game/types').CardGame;
  createdAt: number;
  updatedAt: number;
}

export type DeckKind = 'class' | 'resources' | 'equipment';

export interface Deck {
  id: string;
  editionId: string;
  name: Record<Lang, string>;
  kind: DeckKind;
  colors: ColorId[];
  /** Tema visual padrão das cartas do deck. */
  look: Look;
  order: number;
}

export interface Edition {
  id: string;
  name: string;
  /** Texto curto do rodapé (ex.: "1ª Ed."). */
  code: string;
  /** Logo da edição (mídia). */
  setMediaId?: string;
  /** Verso das cartas desta edição (igual para todas). */
  back?: CardBack;
  /** Tamanho do deck nesta coleção (padrão: 50). */
  deckSize?: number;
}

/** Verso (costas) das cartas de uma edição. */
export interface CardBack {
  /** Estilo da moldura, do medalhão e da faixa do título (os mesmos das frentes). */
  style: import('../render/elements').StyleId;
  /** 1 a 3 cores. */
  colors: string[];
  blend: import('../render/palette').BlendMode;
  metal?: import('../render/palette').MetalKind;
  /** Arte de fundo (opcional). */
  art?: { mediaId: string; zoom: number; x: number; y: number; opacity: number };
  pattern: 'nenhum' | 'raios' | 'losangos' | 'estrelas' | 'circulos';
  frame: boolean;
  /** O que vai no centro. */
  emblem: 'logo' | 'simbolo' | 'nenhum';
  icon: string;
  iconStyle: import('../render/icons/render').IconStyle;
  /** Tamanho do emblema (fração da largura da carta). */
  emblemSize: number;
  /** Medalhão atrás do emblema. */
  medallion: boolean;
  showTitle: boolean;
  title: string;
}

export type Stat = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type Slot = 'mainHand' | 'offHand' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'amulet' | 'ring1' | 'ring2';

export interface Character {
  id: string;
  name: string;
  raceId: string;
  classColors: ColorId[];
  level: number;
  hp: number;
  stats: Record<Stat, number>;
  slots: Partial<Record<Slot, string>>;
  notes: string;
  portraitMediaId?: string;
  /** Dados do herói na Mesa de teste (deck, atributos de jogo, arma, equipamento). Com isso ele pode entrar em partida. */
  play?: import('../game/types').HeroBase;
  /** Boneco em pixel art montado no criador (peças do LPC): vira a miniatura animada e o retrato. */
  avatar?: import('../avatar/lpc').Avatar;
  /** Herói pronto do Protótipo (usa o retrato que vem com o app enquanto não houver outro). */
  preset?: string;
}

export interface Project {
  /** Versão do formato (migrações). */
  version: number;
  name: string;
  lang: Lang;
  editions: Edition[];
  decks: Deck[];
  characters: Character[];
  /** Temas salvos pelo usuário. */
  themes: { id: string; name: string; look: Look }[];
  /** Coleções de exemplo já adicionadas (não são readicionadas se o usuário apagar). */
  seeded?: string[];
}

/** 2 = custo como lista (vários recursos por carta). */
export const PROJECT_VERSION = 2;

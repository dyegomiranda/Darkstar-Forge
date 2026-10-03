/**
 * Vida do herói, sempre pela mesma conta (como nos RPGs de mesa: a ancestralidade, o dado de
 * vida da classe e a Constituição). Ninguém digita a vida: ela sai da ficha, e o equipamento
 * soma ou tira por cima.
 *
 *   vida = 14 + vida da ancestralidade (6 a 10) + vida da classe (6 a 9) + 2 × CON
 */
import type { ColorId } from '../model/types';

export const LIFE_BASE = 14;
/** Vida por classe (o dado de vida: bárbaro e guerreiro aguentam mais; mago, menos). */
export const CLASS_HP: Record<ColorId, number> = { red: 9, white: 8, silver: 8, green: 7, purple: 7, black: 7, blue: 9, orange: 7, gear: 7 };

export const lifeOf = (ancestryHp: number, color: ColorId, con: number): number => LIFE_BASE + ancestryHp + (CLASS_HP[color] ?? 8) + 2 * Math.max(0, con);

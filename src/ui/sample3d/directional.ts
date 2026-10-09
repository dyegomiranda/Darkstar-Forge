import { spriteFacing } from './layout';

/** Atlas rows are explicit. They are never inferred from an LPC convention. */
export const SAMPLE_DIRECTIONS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'] as const;
export type SampleDirection = typeof SAMPLE_DIRECTIONS[number];
export type SampleEquipment = 'armor' | 'helmet' | 'weapon';
export interface Point { x: number; y: number }
export interface SpritePose {
  head: Point;
  chest: Point;
  hand: Point;
  /** Polygon removes the original head only when the fitted helmet/head variant is used. */
  headMask: Point[];
}
export interface DirectionalManifest {
  version: 1;
  rig: 'human-adult-sample-v1';
  size: number;
  foot: Point;
  directions: readonly SampleDirection[];
  walk: { file: string; frames: number; stride: number };
  idle: { file: string; frames: number };
  cover: { idle: string; walk: string };
  gear: Record<SampleEquipment, { file: string; width: number; height: number; pivot: Point }>;
  poses: SpritePose[][];
  idlePoses: SpritePose[];
}
/** Camera azimuth, rather than camera position, remains correct while inspecting an off-centre actor. */
export function sampleDirection(worldYaw: number, cameraYaw: number): SampleDirection {
  return spriteFacing(worldYaw, cameraYaw);
}
/** Crossing a view boundary must not jump the walk cycle or change equipment. */
export function sampleWalkFrame(distance: number, frames: number, stride: number): number {
  return Math.floor(Math.max(0, distance) / stride * frames) % frames;
}
export function validateDirectionalManifest(m: DirectionalManifest): void {
  if (m.version !== 1 || m.rig !== 'human-adult-sample-v1') throw new Error('Base visual incompatível.');
  if (m.directions.length !== 8 || new Set(m.directions).size !== 8 || SAMPLE_DIRECTIONS.some(d => !m.directions.includes(d))) throw new Error('A amostra exige as oito vistas completas.');
  if (!Number.isInteger(m.size) || m.size < 64 || m.foot.x <= 0 || m.foot.x >= m.size || m.foot.y <= 0 || m.foot.y >= m.size) throw new Error('Pivô dos pés inválido.');
  if (m.walk.frames < 4 || m.walk.stride <= 0 || m.idle.frames !== 1 || m.poses.length !== 8 || m.idlePoses.length !== 8) throw new Error('Animações incompletas.');
  const point = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x < m.size && p.y >= 0 && p.y < m.size;
  for (const row of m.poses) {
    if (row.length !== m.walk.frames) throw new Error('Faltam encaixes de quadros.');
    for (const pose of row) if (![pose.head, pose.chest, pose.hand, ...pose.headMask].every(point) || pose.headMask.length < 3) throw new Error('Encaixe fora do quadro.');
  }
  for (const key of ['armor','helmet','weapon'] as const) {
    const g=m.gear[key]; if (!g) throw new Error('Faltam vistas da peça: '+key);
    if (g.width <= 0 || g.height <= 0 || g.pivot.x < 0 || g.pivot.y < 0 || g.pivot.x > g.width || g.pivot.y > g.height) throw new Error('Peça sem pivô válido.');
  }
}

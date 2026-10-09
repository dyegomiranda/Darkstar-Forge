/** Combat coordinates belong to the arena. A camera never changes these positions. */
export type Team = 'player' | 'enemy';
export type Rank = 'front' | 'back';
export type CameraView = 'classic' | 'isometric';
export interface ArenaSlot { id: string; team: Team; rank: Rank; column: number; x: number; y: number; z: number }
export const SLOT_SPACING = 2.35;
export const ARENA_SLOTS: readonly ArenaSlot[] = (['player','enemy'] as const).flatMap(team =>
  (['front','back'] as const).flatMap(rank => [0,1,2].map(column => ({
    id: `${team}-${rank}-${column}`, team, rank, column, x: (column-1)*SLOT_SPACING, y:.096,
    z: (team === 'player' ? 1 : -1)*(rank === 'front' ? 1.28 : 3.48),
  }))),
);
export function cameraPose(view: CameraView, rotation = 0): { x: number; y: number; z: number } {
  const angle = (view === 'isometric' ? Math.PI/4 : 0)+rotation;
  return { x: Math.sin(angle)*26, y: view === 'isometric' ? 24 : 27, z: Math.cos(angle)*26 };
}
/** World-facing direction in the camera plane; used to select real sprite views, never mirror fronts into backs. */
export function spriteFacing(worldYaw: number, cameraYaw: number): 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw' {
  const row = Math.round((worldYaw-cameraYaw)/(Math.PI/4));
  return (['s','se','e','ne','n','nw','w','sw'] as const)[((row%8)+8)%8];
}

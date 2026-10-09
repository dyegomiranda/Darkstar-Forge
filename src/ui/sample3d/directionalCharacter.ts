import * as T from 'three';
import { SAMPLE_DIRECTIONS, sampleDirection, sampleWalkFrame, validateDirectionalManifest, type DirectionalManifest, type SampleEquipment, type SampleDirection, type SpritePose } from './directional';

const BASE = 'art/sample3d/directional/';
const resource = (name: string) => new URL(BASE + name, document.baseURI).href;
export interface DirectionalAssets {
  manifest: DirectionalManifest;
  idle: HTMLImageElement;
  walk: HTMLImageElement;
  cover: { idle: HTMLImageElement; walk: HTMLImageElement };
  gear: Record<SampleEquipment, HTMLImageElement>;
}
export async function loadDirectionalAssets(): Promise<DirectionalAssets> {
  const response = await fetch(resource('manifest.json'));
  if (!response.ok) throw new Error('Não foi possível carregar a base do personagem.');
  const manifest = await response.json() as DirectionalManifest;
  validateDirectionalManifest(manifest);
  const load = async (file: string) => { const image = new Image(); image.src = resource(file); await image.decode(); return image; };
  const [idle, walk, helmet, armor, weapon, idleCover, walkCover] = await Promise.all([load(manifest.idle.file), load(manifest.walk.file), load(manifest.gear.helmet.file), load(manifest.gear.armor.file), load(manifest.gear.weapon.file),load(manifest.cover.idle),load(manifest.cover.walk)]);
  if (walk.width !== manifest.size * manifest.walk.frames || walk.height !== manifest.size * 8 || idle.width !== manifest.size || idle.height !== manifest.size * 8) throw new Error('Dimensões da animação incompatíveis.');
  const gear = { helmet, armor, weapon };
  for (const key of Object.keys(gear) as SampleEquipment[]) {
    const def = manifest.gear[key], image = gear[key];
    if (image.width !== def.width * 8 || image.height !== def.height) throw new Error('Faltam vistas de equipamento: ' + key);
  }
  return { manifest, idle, walk, gear, cover:{idle:idleCover,walk:walkCover} };
}
/** All layers use the exact same pose. No piece is stretched to imitate a new anatomy. */
export function composeDirectionalFrame(ctx: CanvasRenderingContext2D, assets: DirectionalAssets, direction: number, frame: number, walking: boolean, enabled: Readonly<Record<SampleEquipment, boolean>>, destinationX = 0, destinationY = 0): void {
  const m = assets.manifest, size = m.size;
  const source = walking ? assets.walk : assets.idle;
  const pose: SpritePose = walking ? m.poses[direction][frame] : m.idlePoses[direction];
  ctx.save(); ctx.translate(destinationX, destinationY); ctx.imageSmoothingEnabled = false;
  const drawGear = (key: SampleEquipment) => {
    if (!enabled[key]) return;
    const def = m.gear[key], pivot = key === 'helmet' ? pose.head : key === 'armor' ? pose.chest : pose.hand;
    ctx.drawImage(assets.gear[key], direction * def.width, 0, def.width, def.height, Math.round(pivot.x - def.pivot.x), Math.round(pivot.y - def.pivot.y), def.width, def.height);
  };
  // Anatomical right hand is behind the torso when viewed from the left of the character.
  const weaponBehind = ['se','e','ne'].includes(m.directions[direction]);
  if (weaponBehind) drawGear('weapon');
  ctx.drawImage(source, frame * size, direction * size, size, size, 0, 0, size, size);
  if (enabled.helmet) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath();
    pose.headMask.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
    ctx.drawImage(walking?assets.cover.walk:assets.cover.idle,frame*size,direction*size,size,size,0,0,size,size);ctx.restore();
  }
  drawGear('armor');
  if (enabled.helmet) drawGear('helmet');
  if (!weaponBehind) drawGear('weapon');
  ctx.restore();
}
export class DirectionalCharacter {
  readonly visual: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  private textures: { idle: T.CanvasTexture; walk: T.CanvasTexture };
  private enabled: Record<SampleEquipment, boolean> = { armor: true, helmet: true, weapon: true };
  private equipped = false;
  private distance = 0;
  private direction: SampleDirection = 's';
  private frame = 0;
  private walking = false;
  constructor(readonly assets: DirectionalAssets) {
    this.textures = this.buildTextures();
    const size = assets.manifest.size, height = 2.65;
    const geometry = new T.PlaneGeometry(height, height);
    geometry.translate(0, (assets.manifest.foot.y / size - .5) * height, 0);
    this.visual = new T.Mesh(geometry, new T.MeshBasicMaterial({ map: this.textures.idle, transparent: true, alphaTest: .25, side: T.DoubleSide, toneMapped: false }));
    this.update(false, 0, 0, 0, new T.Quaternion());
  }
  private buildTextures() {
    const build = (walking: boolean) => {
      const m = this.assets.manifest, frames = walking ? m.walk.frames : 1;
      const canvas = document.createElement('canvas'); canvas.width = m.size * frames; canvas.height = m.size * 8;
      const ctx = canvas.getContext('2d')!;
      const enabled = this.equipped ? this.enabled : { armor: false, helmet: false, weapon: false };
      // Compose into isolated cells so a blade/mask cannot write into a neighbouring pose.
      const tile = document.createElement('canvas'); tile.width = tile.height = m.size; const tc = tile.getContext('2d')!;
      for (let row = 0; row < 8; row++) for (let frame = 0; frame < frames; frame++) {
        tc.clearRect(0, 0, m.size, m.size); composeDirectionalFrame(tc, this.assets, row, frame, walking, enabled);
        ctx.drawImage(tile, frame * m.size, row * m.size);
      }
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
      texture.magFilter = texture.minFilter = T.NearestFilter; texture.generateMipmaps = false;
      texture.repeat.set(1 / frames, 1 / 8); return texture;
    };
    return { idle: build(false), walk: build(true) };
  }
  setEquipment(on: boolean) { if (on !== this.equipped) { this.equipped = on; this.rebuild(); } }
  setGear(key: SampleEquipment, on: boolean) { if (this.enabled[key] !== on) { this.enabled[key] = on; this.rebuild(); } }
  private rebuild() {
    const previous = this.textures; this.textures = this.buildTextures(); this.applyFrame();
    previous.idle.dispose(); previous.walk.dispose();
  }
  update(walking: boolean, travelled: number, worldYaw: number, cameraYaw: number, quaternion: T.Quaternion) {
    this.distance += travelled; this.walking = walking;
    const next = sampleDirection(worldYaw, cameraYaw);
    // Tiny hysteresis avoids view flicker when orbit slows near a sector boundary.
    const currentAngle = SAMPLE_DIRECTIONS.indexOf(this.direction) * Math.PI / 4;
    const delta = T.MathUtils.euclideanModulo(worldYaw - cameraYaw - currentAngle + Math.PI, Math.PI * 2) - Math.PI;
    if (next === this.direction || Math.abs(delta) > Math.PI / 8 + .025) this.direction = next;
    this.frame = walking ? sampleWalkFrame(this.distance, this.assets.manifest.walk.frames, this.assets.manifest.walk.stride) : 0;
    this.applyFrame(); this.visual.quaternion.copy(quaternion);
  }
  private applyFrame() {
    const texture = this.walking ? this.textures.walk : this.textures.idle;
    const count = this.walking ? this.assets.manifest.walk.frames : 1;
    texture.offset.set(this.frame / count, 1 - (this.assets.manifest.directions.indexOf(this.direction) + 1) / 8);
    this.visual.material.map = texture;
  }
  snapshot() { return { rig: this.assets.manifest.rig, direction: this.direction, frame: this.frame, walking: this.walking, equipped: this.equipped, gear: { ...this.enabled } }; }
  dispose() { this.textures.idle.dispose(); this.textures.walk.dispose(); this.visual.geometry.dispose(); this.visual.material.dispose(); }
}

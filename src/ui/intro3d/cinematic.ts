import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VoidAura, BladeTrail } from './vfx';
import { INTRO_DURATION, STRIKE_AT, ease, introFrame } from './timeline';

export interface IntroSnapshot { ready: boolean; mode: 'cinema' | 'model'; time: number; phase: string; meshes: number; triangles: number; clips: string[]; effects: boolean; fps: number; }
/** Reusable world-space model + separate weapon/VFX. The UI lettering is kept sharp. */
export class DjaboCinematic {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);
  readonly controls: OrbitControls;
  readonly actor = new THREE.Group();
  private stage = new THREE.Group();
  private target: THREE.WebGLRenderTarget;
  private screenScene = new THREE.Scene();
  private screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private screenMaterial: THREE.ShaderMaterial;
  private screenGeometry = new THREE.PlaneGeometry(2, 2);
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private character?: THREE.Group;
  private sword?: THREE.Group;
  private bodyAura = new VoidAura('body');
  private swordAura = new VoidAura('blade');
  private trail = new BladeTrail();
  private clock = 0;
  private previousClip = '';
  private disposed = false;
  private ready = false;
  private playing = true;
  private mode: 'cinema' | 'model' = 'cinema';
  private effects = true;
  private pixel = 2;
  private width = 1;
  private height = 1;
  private owned = new Set<THREE.Material>();
  private lights: THREE.Light[] = [];
  private frames = 0;
  private fps = 0;
  private fpsTime = 0;
  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x07050c);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.screenMaterial = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { source: { value: this.target.texture }, time: { value: 0 }, emergence: { value: 0 }, cut: { value: 0 }, pixelSize: { value: new THREE.Vector2(1, 1) } },
      vertexShader: 'varying vec2 uvScene; void main(){ uvScene=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `
        uniform sampler2D source; uniform float time; uniform float emergence; uniform float cut;
        varying vec2 uvScene;
        void main() {
          vec2 uv=uvScene;
          float line=uv.y-(0.23+uv.x*0.55);
          // A screen-space rupture accompanies the actual blade trail, without a full-screen white flash.
          float rift=exp(-abs(line)*420.)*cut;
          vec3 c=texture2D(source,uv).rgb;
          float backlight=exp(-length((uv-vec2(0.36,0.48))*vec2(2.7,1.4))*4.);
          c+=vec3(0.012,0.010,0.017)*backlight;
          float vignette=1.-smoothstep(0.38,0.83,length((uv-0.5)*vec2(1.,0.8)));
          c*=mix(0.25,1.,vignette)*emergence;
          c+=vec3(0.56,0.19,0.96)*rift*0.65;
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.screenScene.add(new THREE.Mesh(this.screenGeometry, this.screenMaterial));
    this.scene.add(this.stage);
    this.stage.add(this.actor, this.trail.mesh);
    this.actor.add(this.bodyAura.group);
    this.bodyAura.group.position.z = -0.09;
    this.actor.position.set(-0.8, 0, 0);
    const key = new THREE.DirectionalLight(0xc7d5ed, 2.8); key.position.set(-2, 4, 5);
    const rim = new THREE.DirectionalLight(0xa767e5, 3.2); rim.position.set(2, 2.4, -3);
    const red = new THREE.PointLight(0xdd1735, 1.9, 5, 2); red.position.set(-1.4, 1.4, 0.3);
    const ambient = new THREE.HemisphereLight(0xb2bdd2, 0x15101e, 1.4);
    this.scene.add(key, rim, red, ambient); this.lights = [key, rim, red, ambient];
    this.camera.position.set(-0.4, 1.25, 5.5); this.camera.lookAt(0, 1.03, 0);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(-0.8, 1, 0);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 2.3; this.controls.maxDistance = 8;
    this.controls.minPolarAngle = Math.PI * 0.22; this.controls.maxPolarAngle = Math.PI * 0.65;
    this.controls.enablePan = false; this.controls.enabled = false;
  }
  async load() {
    const loader = new GLTFLoader();
    const loaded = await Promise.all([
      loader.loadAsync(new URL('art/djabo-intro/djabo.glb', document.baseURI).href),
      loader.loadAsync(new URL('art/djabo-intro/katana.glb', document.baseURI).href),
    ]);
    if (this.disposed) { for (const g of loaded) this.releaseGroup(g.scene); return; }
    const [body, blade] = loaded;
    this.character = body.scene; this.character.scale.setScalar(2);
    this.actor.add(body.scene);
    this.mixer = new THREE.AnimationMixer(body.scene);
    for (const clip of body.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.materials(body.scene); this.materials(blade.scene, true);
    let hand: THREE.Bone | undefined;
    body.scene.traverse(o => { if (o instanceof THREE.Bone && o.name.replace(/[^A-Za-z]/g,'') === 'DEFhandR') hand = o; });
    if (!hand) throw new Error('O modelo Djabo não contém o encaixe da mão direita.');
    this.sword = blade.scene;
    // The exported weapon is normalized to one meter; grip origin and +Y blade axis are explicit.
    blade.scene.scale.setScalar(0.56);
    blade.scene.rotation.set(Math.PI / 2, 0, 0);
    blade.scene.position.set(0,0.035,0);
    hand.add(blade.scene);
    blade.scene.add(this.swordAura.group);
    this.renderer.compile(this.scene, this.camera);
    this.ready = true; this.clock = 0; this.pose(0);
  }
  private materials(group: THREE.Group, weapon = false) {
    group.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const originals = Array.isArray(o.material) ? o.material : [o.material];
      const replacement = originals.map(original => {
        const old = original as THREE.MeshStandardMaterial;
        const material = new THREE.MeshStandardMaterial({ vertexColors: !!o.geometry.getAttribute('color'), color: 0xffffff, metalness: weapon ? 0.55 : 0.38, roughness: weapon ? 0.42 : 0.57, side: THREE.FrontSide });
        material.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            #ifdef USE_COLOR
              float redChannel = smoothstep(0.14, 0.4, vColor.r - max(vColor.g, vColor.b));
              totalEmissiveRadiance += vColor.rgb * redChannel * 1.25;
            #endif
          `);
        };
        material.customProgramCacheKey = () => 'djabo-red-channels-v1';
        if (old.map) { material.map = old.map; old.map = null; }
        original.dispose(); this.owned.add(material); return material;
      });
      o.material = replacement.length === 1 ? replacement[0] : replacement;
      o.frustumCulled = false;
    });
  }
  resize(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width)); this.height = Math.max(1, Math.floor(height));
    const scale = Math.min(1, Math.sqrt(2200000 / (this.width * this.height)));
    this.renderer.setSize(Math.round(this.width * scale), Math.round(this.height * scale), false);
    this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.target.setSize(Math.ceil(this.width * scale / this.pixel), Math.ceil(this.height * scale / this.pixel));
    this.camera.aspect = this.width / this.height; this.camera.updateProjectionMatrix();
  }
  private pose(t: number) {
    // Evaluate both actions at their absolute timeline time. Smooth weights also work when scrubbing.
    const strikeClip = this.actions.get('Golpe');
    const guard = this.mode === 'model' ? this.actions.get('Parado') : (this.actions.get('Guarda') ?? this.actions.get('Parado'));
    const duration = strikeClip?.getClip().duration ?? 1.54;
    const local = t - STRIKE_AT;
    const attackWeight = (this.mode === 'model' ? 0 : 1) * ease(local / 0.12) * (1 - ease((local - duration + 0.18) / 0.24));
    this.actions.forEach(a => a.setEffectiveWeight(0));
    if (guard) { guard.enabled = true; guard.play(); guard.time = t % Math.max(0.01, guard.getClip().duration); guard.setEffectiveWeight(1 - attackWeight); }
    if (strikeClip) { strikeClip.enabled = true; strikeClip.setLoop(THREE.LoopOnce,1); strikeClip.clampWhenFinished = true; strikeClip.play(); strikeClip.time = THREE.MathUtils.clamp(local,0,duration-.001); strikeClip.setEffectiveWeight(attackWeight); }
    this.mixer?.update(0);
    this.actor.updateMatrixWorld(true);
  }
  update(dt: number) {
    if (this.disposed || !this.ready) return;
    if (this.playing) this.clock = Math.min(INTRO_DURATION, this.clock + Math.min(dt, 0.06));
    const f = introFrame(this.clock);
    this.pose(this.clock);
    this.actor.rotation.y = this.mode === 'model' ? 0 : 0.2 - f.emerge * 0.13 + Math.sin(f.strike * Math.PI) * 0.12;
    this.actor.position.x = this.mode === 'model' ? 0 : -0.72 - f.reveal * 0.16;
    this.bodyAura.update(this.clock, this.effects ? f.energy * 0.8 : 0);
    this.swordAura.update(this.clock, this.effects ? f.energy : 0);
    this.actor.updateMatrixWorld(true);
    if (this.sword && this.effects && this.playing && this.clock >= STRIKE_AT && this.clock < STRIKE_AT + 1.35) {
      const grip = this.sword.localToWorld(new THREE.Vector3(0, 0.22, 0));
      const tip = this.sword.localToWorld(new THREE.Vector3(0, 0.98, 0));
      this.trail.update(this.clock, grip, tip);
    } else this.trail.update(this.clock);
    if (!this.effects) this.trail.clear();
    if (this.mode === 'cinema') {
      const wide = this.width < this.height ? 1.5 : 1;
      const pull = ease((this.clock - 0.9) / 1.5);
      this.camera.position.set(-0.68 + pull * 0.42, 1.76 - pull * 0.52, (2.25 + pull * 2.9 + f.reveal * 0.12) * wide);
      this.camera.lookAt(this.width < this.height ? -0.5 : -0.72 + pull * 0.72, 1.7 - pull * 0.65, 0);
    } else this.controls.update();
    this.screenMaterial.uniforms.emergence.value = this.mode === 'model' ? 1 : f.emerge;
    this.screenMaterial.uniforms.cut.value = this.effects && this.mode === 'cinema' ? f.cut : 0;
    this.screenMaterial.uniforms.time.value = this.clock;
    this.renderer.setRenderTarget(this.target); this.renderer.clear(); this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null); this.renderer.render(this.screenScene, this.screenCamera);
    this.frames++; this.fpsTime += dt;
    if (this.fpsTime >= 0.5) { this.fps = Math.round(this.frames / this.fpsTime); this.frames = 0; this.fpsTime = 0; }
  }
  replay() { this.clock = 0; this.playing = true; this.previousClip = ''; this.trail.clear(); this.setMode('cinema'); }
  seek(seconds: number) { this.clock = Math.max(0, Math.min(INTRO_DURATION, seconds)); this.previousClip = ''; this.trail.clear(); this.pose(this.clock); }
  pause(paused: boolean) { this.playing = !paused; }
  setEffects(on: boolean) { this.effects = on; }
  setPixel(pixel: number) { this.pixel = THREE.MathUtils.clamp(pixel, 1, 4); this.resize(this.width, this.height); }
  setMode(mode: 'cinema' | 'model') {
    this.mode = mode; this.controls.enabled = mode === 'model';
    if (mode === 'model') { this.actor.position.x = 0; this.controls.target.set(0, 1, 0); this.camera.position.set(0.3, 1.2, 4.6); this.controls.update(); }
  }
  front() { this.camera.position.set(0, 1.1, 4.5); this.controls.target.set(0, 1.0, 0); this.controls.update(); }
  snapshot(): IntroSnapshot {
    let meshes = 0, triangles = 0;
    this.actor.traverse(o => { if (o instanceof THREE.Mesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position')?.count ?? 0) / 3; } });
    return { ready: this.ready, mode: this.mode, time: this.clock, phase: introFrame(this.clock).phase, meshes, triangles, clips: [...this.actions.keys()], effects: this.effects, fps: this.fps };
  }
  private releaseGroup(group: THREE.Group) {
    group.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        const material = m as THREE.MeshStandardMaterial;
        material.map?.dispose(); if (!this.owned.has(m)) m.dispose();
      }
    });
  }
  dispose() {
    this.disposed = true; this.controls.dispose(); this.mixer?.stopAllAction(); if (this.character) this.mixer?.uncacheRoot(this.character);
    if (this.character) this.releaseGroup(this.character); if (this.sword) this.releaseGroup(this.sword);
    this.owned.forEach(m => m.dispose()); this.bodyAura.dispose(); this.swordAura.dispose(); this.trail.dispose();
    this.target.dispose(); this.screenMaterial.dispose(); this.screenGeometry.dispose(); this.renderer.dispose(); this.scene.clear();
  }
}

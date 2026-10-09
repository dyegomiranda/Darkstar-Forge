import * as THREE from 'three';

/** Spatial, deforming ink ribbons; independent from the reconstructed character meshes. */
export class VoidAura {
  readonly group = new THREE.Group();
  private materials: THREE.ShaderMaterial[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private ribbons: THREE.Mesh[] = [];
  constructor(kind: 'body' | 'blade') {
    const blade = kind === 'blade';
    const count = blade ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.PlaneGeometry(1, 1, 5, 36);
      const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
        uniforms: { time: { value: 0 }, strength: { value: 0 }, seed: { value: i * 2.731 }, blade: { value: blade ? 1 : 0 } },
        vertexShader: `
          uniform float time; uniform float seed; uniform float blade;
          varying vec2 uvInk; varying float drift;
          void main() {
            uvInk = uv; float h = uv.y;
            float bend = sin(h * 5.5 - time * 1.5 + seed) * 0.11 + sin(h * 12. - time * 0.8 + seed * 1.7) * 0.035;
            vec3 p = position;
            p.x *= (0.14 + 0.18 * sin(h * 3.14159)) * (1. - h * 0.55);
            p.x += bend * h;
            p.z += cos(h * 5. - time * 1.2 + seed) * h * 0.12;
            p.y = h * mix(0.8, 0.38, blade);
            drift = bend;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
          }`,
        fragmentShader: `
          uniform float time; uniform float seed; uniform float strength; uniform float blade;
          varying vec2 uvInk; varying float drift;
          float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
          float noise(vec2 p) { vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
          float fbm(vec2 p) { return noise(p)*0.55 + noise(p*2.13)*0.28 + noise(p*4.2)*0.13; }
          void main() {
            vec2 p = vec2(uvInk.x * 3. + seed, uvInk.y * 4. - time * 0.7);
            float n = fbm(p);
            float edge = abs(uvInk.x - 0.5) * 2.;
            float shape = 1. - smoothstep(0.42 + n * 0.32, 0.84, edge);
            float fade = smoothstep(0.,0.10,uvInk.y) * (1. - smoothstep(0.52,1.,uvInk.y));
            float ink = smoothstep(0.18,0.65,n) * shape * fade * strength;
            if (ink < 0.012) discard;
            vec3 black = vec3(0.018,0.012,0.028);
            vec3 edgeColor = mix(vec3(0.065,0.047,0.085),vec3(0.54,0.10,0.95),blade);
            float sheen = pow(n, 3.) * 0.5 + pow(edge, 5.) * 0.2;
            gl_FragColor = vec4(mix(black,edgeColor,sheen), ink * mix(0.9,0.85,blade));
          }`,
      });
      const mesh = new THREE.Mesh(geometry, material);
      if (blade) {
        mesh.position.set(0, i / count * 0.75 + 0.22, 0);
        mesh.rotation.y = i * 2.399;
      } else {
        const angle = i * 2.399;
        const radius = i % 3 === 0 ? 0.24 : 0.16;
        mesh.position.set(Math.sin(angle) * radius, 0.12 + (i % 5) * 0.28, Math.cos(angle) * radius);
        mesh.rotation.y = angle;
      }
      mesh.renderOrder = 2;
      this.materials.push(material); this.geometries.push(geometry); this.ribbons.push(mesh);
      this.group.add(mesh);
    }
  }
  update(time: number, strength: number) {
    this.materials.forEach((m, i) => { m.uniforms.time.value = time; m.uniforms.strength.value = strength * (0.8 + 0.2 * Math.sin(time * 0.7 + i)); });
  }
  dispose() { this.materials.forEach(m => m.dispose()); this.geometries.forEach(g => g.dispose()); this.group.clear(); }
}

/** The mesh records actual world positions of the blade, so the trail follows the motion. */
export class BladeTrail {
  readonly mesh: THREE.Mesh;
  private geometry = new THREE.BufferGeometry();
  private points: { a: THREE.Vector3; b: THREE.Vector3; time: number }[] = [];
  private material = new THREE.MeshBasicMaterial({ color: 0x8b3ddd, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  constructor() { this.mesh = new THREE.Mesh(this.geometry, this.material); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; }
  update(t: number, start?: THREE.Vector3, tip?: THREE.Vector3) {
    if (start && tip) this.points.push({ a: start.clone(), b: tip.clone(), time: t });
    this.points = this.points.filter(p => t - p.time < 0.24).slice(-20);
    const v: number[] = [], colors: number[] = [];
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i - 1], q = this.points[i];
      const opacity = Math.max(0, 1 - (t - q.time) / 0.24);
      for (const x of [p.a,p.b,q.b,p.a,q.b,q.a]) { v.push(x.x,x.y,x.z); colors.push(opacity,opacity,opacity); }
    }
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.material.vertexColors = true;
    this.mesh.visible = v.length > 0;
  }
  clear() { this.points = []; this.mesh.visible = false; }
  dispose() { this.geometry.dispose(); this.material.dispose(); }
}

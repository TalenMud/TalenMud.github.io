import * as THREE from 'three';
import { createStarfield, createSpaceStars } from '../components/Stars.js';

// ── Portal wormhole shader ─────────────────────────────────────────────────
const PORTAL_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const PORTAL_FRAG = `
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}

void main() {
  // Correct UVs for door aspect ratio (1.6 wide : 2.6 tall ≈ 0.615)
  vec2 uv = (vUv - 0.5) * vec2(0.62, 1.0);
  float angle = atan(uv.y, uv.x);
  float dist  = length(uv);

  float n = noise(uv * 4.0 + uTime * 0.28) * 0.5
          + noise(uv * 9.0 - uTime * 0.45) * 0.25
          + noise(uv * 18.0 + uTime * 0.18) * 0.12;

  float swirl = angle + n * 3.2 + uTime * 0.65;
  float bands = sin(swirl * 3.0 + dist * 10.0 - uTime * 1.6) * 0.5 + 0.5;

  vec3 col = mix(vec3(0.25, 0.0, 0.55), vec3(0.65, 0.15, 0.95), bands);
  col += vec3(0.08, 0.0, 0.25) * (1.0 - dist * 2.5);
  col += vec3(0.3, 0.1, 0.6) * pow(max(0.0, 1.0 - dist * 3.0), 3.0);

  float alpha = smoothstep(0.52, 0.28, dist);
  gl_FragColor = vec4(col, alpha * 0.97);
}`;

// ── Planet shaders ─────────────────────────────────────────────────────────
const PLANET_VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const PLANET1_FRAG = `  // blue-purple gas giant
uniform float uTime;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
float h(float n) { return fract(sin(n)*43758.5453); }
float noise2(vec2 p) {
  vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i.x+i.y*57.0),h(i.x+1.0+i.y*57.0),f.x),
             mix(h(i.x+(i.y+1.0)*57.0),h(i.x+1.0+(i.y+1.0)*57.0),f.x),f.y);
}
void main() {
  float n = noise2(vec2(vUv.x*5.0 + uTime*0.008, vUv.y*3.5));
  float bands = sin(vUv.y*11.0 + n*2.0) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.03,0.05,0.28), vec3(0.12,0.06,0.48), bands);
  col = mix(col, vec3(0.35,0.45,0.85), noise2(vUv*7.0)*0.25);
  float rim = 1.0 - max(0.0, dot(vNormal, vViewDir));
  col += vec3(0.1,0.25,0.75) * pow(rim, 2.8) * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`;

const PLANET2_FRAG = `  // warm orange/rust ringed planet
uniform float uTime;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
float h(float n) { return fract(sin(n)*43758.5453); }
float noise2(vec2 p) {
  vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i.x+i.y*57.0),h(i.x+1.0+i.y*57.0),f.x),
             mix(h(i.x+(i.y+1.0)*57.0),h(i.x+1.0+(i.y+1.0)*57.0),f.x),f.y);
}
void main() {
  float n = noise2(vec2(vUv.x*4.0 + uTime*0.006, vUv.y*6.0));
  float bands = sin(vUv.y*9.0 + n*1.8) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.45,0.18,0.04), vec3(0.72,0.38,0.12), bands);
  col = mix(col, vec3(0.85,0.62,0.3), noise2(vUv*6.0)*0.3);
  float rim = 1.0 - max(0.0, dot(vNormal, vViewDir));
  col += vec3(0.6,0.3,0.1) * pow(rim, 3.0) * 0.7;
  gl_FragColor = vec4(col, 1.0);
}`;

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDoorPortal(uniforms) {
  const W = 1.6, H = 2.6, R = W / 2, thick = 0.14, depth = 0.16;
  const yBot = -H / 2, yArch = H / 2 - R;

  // Frame ring shape (outer arch with inner hole cutout)
  const shape = new THREE.Shape();
  shape.moveTo(-(W/2 + thick), yBot);
  shape.lineTo(-(W/2 + thick), yArch);
  shape.absarc(0, yArch, R + thick, Math.PI, 0, false);
  shape.lineTo( (W/2 + thick), yBot);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-W/2, yBot - 0.02);
  hole.lineTo(-W/2, yArch);
  hole.absarc(0, yArch, R, Math.PI, 0, false);
  hole.lineTo( W/2, yBot - 0.02);
  hole.closePath();
  shape.holes.push(hole);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x8b2fc9,
    emissive: 0x6600aa,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.7,
  });
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }),
    frameMat
  );
  frame.position.z = -depth / 2;

  // Outer glow ring (another slightly larger arch, additive)
  const glowShape = new THREE.Shape();
  glowShape.moveTo(-(W/2 + thick + 0.06), yBot);
  glowShape.lineTo(-(W/2 + thick + 0.06), yArch);
  glowShape.absarc(0, yArch, R + thick + 0.06, Math.PI, 0, false);
  glowShape.lineTo( (W/2 + thick + 0.06), yBot);
  glowShape.closePath();
  const glowHole = new THREE.Path();
  glowHole.moveTo(-(W/2 + thick), yBot - 0.02);
  glowHole.lineTo(-(W/2 + thick), yArch);
  glowHole.absarc(0, yArch, R + thick, Math.PI, 0, false);
  glowHole.lineTo( (W/2 + thick), yBot - 0.02);
  glowHole.closePath();
  glowShape.holes.push(glowHole);

  const glowMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(glowShape),
    new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
  );

  // Portal surface (interior)
  const interior = new THREE.Shape();
  interior.moveTo(-W/2, yBot);
  interior.lineTo(-W/2, yArch);
  interior.absarc(0, yArch, R, Math.PI, 0, false);
  interior.lineTo( W/2, yBot);
  interior.closePath();

  const portalMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(interior, 32),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: PORTAL_VERT,
      fragmentShader: PORTAL_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  portalMesh.position.z = 0.01;

  // Halo plane behind the whole door
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x5500bb,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.4), haloMat);
  halo.position.z = -0.3;

  const group = new THREE.Group();
  group.add(halo, glowMesh, frame, portalMesh);
  return { group, portalMesh, halo };
}

function buildAstronaut() {
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.6, metalness: 0.1 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x111133, roughness: 0.3, metalness: 0.5 });
  const gold  = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xaa8800, emissiveIntensity: 0.4, roughness: 0.4 });

  const g = new THREE.Group();

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.16), white);
  g.add(body);

  // Backpack
  const bp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.7 }));
  bp.position.set(0, 0, -0.12);
  g.add(bp);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), white);
  helmet.position.y = 0.22;
  g.add(helmet);

  // Visor
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
  visor.position.set(0, 0.22, 0.1);
  visor.rotation.x = 0.3;
  g.add(visor);

  // Gold visor trim ring
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 24, Math.PI), gold);
  trim.position.set(0, 0.21, 0.09);
  trim.rotation.x = -0.4;
  g.add(trim);

  // Arms
  [[-1, 0.35], [1, -0.35]].forEach(([side, rot]) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.24, 8), white);
    arm.position.set(side * 0.15, 0.02, 0);
    arm.rotation.z = side * 0.5;
    arm.rotation.x = 0.2;
    g.add(arm);
    // Glove
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    glove.position.set(side * 0.2, -0.08, 0.04);
    g.add(glove);
  });

  // Legs
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.24, 8), white);
    leg.position.set(side * 0.065, -0.26, 0);
    leg.rotation.z = side * 0.1;
    g.add(leg);
    // Boot
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.14), new THREE.MeshStandardMaterial({ color: 0xddddee, roughness: 0.8 }));
    boot.position.set(side * 0.068, -0.4, 0.02);
    g.add(boot);
  });

  // Shoulder patches (gold)
  [-1, 1].forEach(side => {
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 8), gold);
    patch.position.set(side * 0.115, 0.1, 0.04);
    patch.rotation.x = Math.PI / 2;
    g.add(patch);
  });

  g.scale.setScalar(0.85);
  return g;
}

function buildPlanet(fragShader, radius, uniforms) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: PLANET_VERT,
      fragmentShader: fragShader,
    })
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────

export class LandingScene {
  constructor(renderer, overlay) {
    this.renderer = renderer;
    this.overlay  = overlay;
    this.scene    = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03091a);
    this.camera   = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 1.2, 8);

    this.portalUniforms  = { uTime: { value: 0 } };
    this.planet1Uniforms = { uTime: { value: 0 } };
    this.planet2Uniforms = { uTime: { value: 0 } };

    this._built   = false;
    this._onEnter = null;
    this._astronautT = 0;
  }

  init() {
    if (this._built) return;
    this._built = true;

    // Background & lighting
    this.scene.fog = new THREE.FogExp2(0x03091a, 0.004);
    this.scene.add(new THREE.AmbientLight(0x0a1530, 2.5));
    const portalLight = new THREE.PointLight(0x9933ff, 5, 22);
    portalLight.position.set(0, 0, 1);
    this.scene.add(portalLight);
    const rimLight = new THREE.DirectionalLight(0x2244aa, 0.6);
    rimLight.position.set(-5, 3, 5);
    this.scene.add(rimLight);

    // Starfield (twinkling)
    this.starfield = createStarfield(2500);
    this.scene.add(this.starfield);

    // Yellow 3D star shapes
    this.spaceStars = createSpaceStars(16);
    this.scene.add(this.spaceStars);

    // Moon
    const moonGeo = new THREE.SphereGeometry(18, 64, 48);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.92, metalness: 0.0 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(0, -20, -2);
    this.scene.add(moon);

    // Moon craters (slightly darker spheres offset into surface)
    const craterMat = new THREE.MeshStandardMaterial({ color: 0x6a7888, roughness: 1 });
    [[2, -1.9, 1.5, 0.35], [-2.5, -2.0, 0.5, 0.25], [0.5, -2.1, -0.8, 0.18], [-1.0, -1.95, 2.0, 0.22]].forEach(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), craterMat);
      c.position.set(x, y, z);
      this.scene.add(c);
    });

    // Moon rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a8898, roughness: 1 });
    [[-3.2, -2.55, 0.2], [2.8, -2.7, -0.8], [-1.8, -2.6, 1.4], [4.2, -2.65, 0.3], [-0.5, -2.62, -1.2]].forEach(([x, y, z]) => {
      const rock = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.18, 7, 5), rockMat);
      rock.position.set(x, y, z);
      rock.scale.set(1, 0.7 + Math.random() * 0.4, 1);
      this.scene.add(rock);
    });

    // Door portal
    const { group, portalMesh, halo } = buildDoorPortal(this.portalUniforms);
    group.position.set(0, -0.1, 0);
    this.scene.add(group);
    this.portalMesh = portalMesh;
    this.halo = halo;

    // Planet 1 — blue/purple gas giant, upper left
    this.planet1 = buildPlanet(PLANET1_FRAG, 2.8, this.planet1Uniforms);
    this.planet1.position.set(-14, 5, -30);
    this.planet1.rotation.z = 0.15;
    this.scene.add(this.planet1);

    // Planet 2 — orange/rust with rings, right side
    this.planet2 = buildPlanet(PLANET2_FRAG, 2.1, this.planet2Uniforms);
    this.planet2.position.set(16, -3, -24);
    this.scene.add(this.planet2);

    // Rings for planet 2
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc87832,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    [4.2, 5.0, 5.7].forEach((r, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.34, 0.06 + i * 0.03, 4, 80), ringMat);
      ring.position.copy(this.planet2.position);
      ring.rotation.x = 1.2;
      ring.rotation.z = 0.2;
      this.scene.add(ring);
    });

    // Astronaut — floating in distance
    this.astronaut = buildAstronaut();
    this.astronaut.position.set(-6.5, 1.5, -10);
    this.astronaut.rotation.y = 0.8;
    this.scene.add(this.astronaut);

    this._buildUI();
    this._setupRaycaster();
  }

  _buildUI() {
    this.ui = document.createElement('div');
    this.ui.id = 'landing-ui';
    this.ui.innerHTML = `
      <h1>
        <span class="yo">Yo</span><span class="neutral">, I'm </span><span class="talen">Talen</span>
      </h1>
      <button id="enter-btn">✦ Enter ✦</button>
    `;
    this.ui.style.display = 'none';
    this.overlay.appendChild(this.ui);
    document.getElementById('enter-btn').addEventListener('click', () => {
      if (this._onEnter) this._onEnter();
    });
  }

  _setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._clickHandler = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.intersectObject(this.portalMesh).length && this._onEnter) this._onEnter();
    };
  }

  onEnter(fn) { this._onEnter = fn; }

  enter() {
    this.ui.style.display = 'flex';
    window.addEventListener('click', this._clickHandler);
  }

  exit() {
    this.ui.style.display = 'none';
    window.removeEventListener('click', this._clickHandler);
  }

  update(delta) {
    const t = this.portalUniforms.uTime.value += delta;
    this.planet1Uniforms.uTime.value += delta;
    this.planet2Uniforms.uTime.value += delta;

    // Twinkling stars
    this.starfield.material.uniforms.uTime.value += delta;

    // Halo pulse
    const s = 1 + Math.sin(t * 1.4) * 0.05;
    this.halo.scale.set(s, s, 1);

    // 3D stars spin
    this.spaceStars.children.forEach(star => {
      star.rotation.y += star.userData.spinSpeed * delta;
      star.rotation.x += star.userData.spinSpeed * delta * 0.4;
    });

    // Planet slow rotation
    this.planet1.rotation.y += delta * 0.04;
    this.planet2.rotation.y += delta * 0.06;

    // Astronaut float
    this._astronautT += delta;
    this.astronaut.position.y = 1.5 + Math.sin(this._astronautT * 0.5) * 0.18;
    this.astronaut.rotation.z = Math.sin(this._astronautT * 0.3) * 0.06;
    this.astronaut.rotation.y = 0.8 + Math.sin(this._astronautT * 0.2) * 0.08;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

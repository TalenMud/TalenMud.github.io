import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createStarfield } from '../components/Stars.js';

const PROJECTS = [
  {
    name: 'Cliniclar',
    color: 0x00c8ff,
    logo: 'assets/CliniclarLogo.jpeg',
    screenshot: 'assets/Cliniclar_Screenshot.png',
    badge: '2nd Best Medical AI — HackEurope',
    desc: 'AI-powered clinical documentation that transcribes doctor–patient conversations into structured medical notes in real time — reducing admin burden and letting clinicians focus on care.',
    url: 'https://cliniclar.vercel.app/',
  },
  { name: 'Coming Soon', color: 0x8855ff, desc: 'Details coming soon.' },
  { name: 'Coming Soon', color: 0xff5577, desc: 'Details coming soon.' },
  { name: 'Coming Soon', color: 0x44ee88, desc: 'Details coming soon.' },
  { name: 'Coming Soon', color: 0xffaa33, desc: 'Details coming soon.' },
];

function hexToCSS(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

function shiftColor(hex) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8)  & 0xff;
  const b =  hex        & 0xff;
  return `rgb(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+40)})`;
}

function makeVinylTexture(color, logoUrl) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const tex = new THREE.CanvasTexture(canvas);

  function draw(logoImg) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let r = 20; r < cx - 10; r += 4) {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, cx - 58, cy - 58, 116, 116);
      ctx.restore();
    } else {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 58);
      grad.addColorStop(0, hexToCSS(color));
      grad.addColorStop(1, shiftColor(color));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    tex.needsUpdate = true;
  }

  draw(null);
  if (logoUrl) {
    const img = new Image();
    img.onload = () => draw(img);
    img.src = logoUrl;
  }
  return tex;
}

function makeCaseTexture(color, logoUrl) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);

  function draw(logoImg) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, size, size);
    if (logoImg) {
      const pad = 16;
      ctx.drawImage(logoImg, pad, pad, size - pad * 2, size - pad * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, size, size);
    } else {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, 'rgba(0,0,0,0.5)');
      grad.addColorStop(1, `${hexToCSS(color)}22`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.strokeStyle = hexToCSS(color);
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);
    ctx.strokeStyle = `${hexToCSS(color)}44`;
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, size - 28, size - 28);
    tex.needsUpdate = true;
  }

  draw(null);
  if (logoUrl) {
    const img = new Image();
    img.onload = () => draw(img);
    img.src = logoUrl;
  }
  return tex;
}

export class ProjectsScene {
  constructor(renderer, overlay) {
    this.renderer = renderer;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';

    this._built = false;
    this._records = [];
    this._hoveredRecord = null;
    this._activeRecord = null;
    this._mouse = new THREE.Vector2();
    this._raycaster = new THREE.Raycaster();
    this._breathT = 0;

    // FPS look
    this._yaw = 0;
    this._pitch = 0;
    this._pointerLocked = false;
    this._lastTouch = null;

    this._flyState = null;
    this._platterVinyl = null;
    this._asteroids = [];
    this._spaceshipT = 0;
  }

  init() {
    if (this._built) return;
    this._built = true;

    this.scene.background = new THREE.Color(0x0b1530);
    this.scene.fog = new THREE.FogExp2(0x0b1530, 0.002);

    this.scene.add(new THREE.AmbientLight(0x1a2f5e, 4.5));
    const keyLight = new THREE.DirectionalLight(0xaabbff, 1.8);
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x3322aa, 5, 40);
    fillLight.position.set(-4, 2, -2);
    this.scene.add(fillLight);

    this.starfield = createStarfield(4000);
    this.scene.add(this.starfield);
    this._buildNebula();
    this._buildAsteroids();
    this._loadRecordPlayer();
    this._loadPlanets();
    this._loadSpaceship();
    this._buildRecords();
    this._buildUI();
    this._bindEvents();
  }

  _buildNebula() {
    // Large inverted sphere for nebula atmosphere
    this.scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(85, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0x0e0620, side: THREE.BackSide, transparent: true, opacity: 0.9 })
    ));
  }

  _buildAsteroids() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e2e3a, roughness: 1.0, metalness: 0.0 });
    const configs = [
      { pos: [-13, 3, -16], scale: 0.55, rx: 0.4, ry: 0.6 },
      { pos: [11, -4, -20], scale: 0.38, rx: -0.3, ry: 0.9 },
      { pos: [-5, 6, -22],  scale: 0.7,  rx: 0.8, ry: -0.4 },
    ];
    configs.forEach(({ pos, scale, rx, ry }) => {
      const geo = new THREE.IcosahedronGeometry(scale, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData.rot = { x: rx * 0.12, y: ry * 0.18 };
      this.scene.add(mesh);
      this._asteroids.push(mesh);
    });
  }

  _loadSpaceship() {
    const loader = new GLTFLoader();
    loader.load('assets/space_exploration_wlp_series_8.glb', (gltf) => {
      this._spaceship = gltf.scene;
      this._spaceship.scale.set(1.2, 1.2, 1.2);
      this.scene.add(this._spaceship);
    });
  }

  _loadPlanets() {
    const loader = new GLTFLoader();
    loader.load('assets/toy_cartoon_planets.glb', (gltf) => {
      const configs = [
        { pos: [-18, 6, -45],  scale: 5.0, rotDir:  1 },
        { pos: [ 20, -8, -55], scale: 3.5, rotDir: -1 },
        { pos: [  4, 10, -38], scale: 2.5, rotDir:  1 },
      ];
      this._planets = configs.map(({ pos, scale, rotDir }) => {
        const p = gltf.scene.clone();
        p.position.set(...pos);
        p.scale.setScalar(scale);
        p.userData.rotDir = rotDir;
        this.scene.add(p);
        return p;
      });
    });
  }

  _loadRecordPlayer() {
    const loader = new GLTFLoader();
    loader.load('assets/turntable.glb', (gltf) => {
      this.playerGroup = gltf.scene;
      this.playerGroup.position.set(3.5, -1.5, -5);
      this.playerGroup.rotation.y = -0.4;
      this.playerGroup.scale.set(2.2, 2.2, 2.2);

      gltf.scene.traverse((node) => {
        if (node.name && node.name.toLowerCase().includes('platter')) {
          this.platter = node;
        }
      });

      if (!this.platter) {
        this.platter = new THREE.Mesh();
        this.platter.rotation = new THREE.Euler();
      }

      this.scene.add(this.playerGroup);
    });
  }

  _buildRecords() {
    const count = PROJECTS.length;
    const radius = 5.5;

    PROJECTS.forEach((proj, i) => {
      // i=0 (Cliniclar) at front-centre: angle=0 → (0,0,-radius)
      const angle = (i / count) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;
      const baseY = Math.sin(i * 1.9 + 0.4) * 1.0;

      const group = new THREE.Group();
      group.position.set(x, baseY, z);
      group.lookAt(0, baseY, 0); // face inward toward camera

      group.userData = {
        index: i,
        project: proj,
        state: 'idle',
        baseY,
        bobPhase: (i / count) * Math.PI * 2,
      };

      const caseGeo = new THREE.BoxGeometry(1.0, 1.0, 0.06);
      const caseMat = new THREE.MeshStandardMaterial({
        map: makeCaseTexture(proj.color, proj.logo),
        roughness: 0.7,
        metalness: 0.1,
        emissive: new THREE.Color(proj.color),
        emissiveIntensity: 0.06,
      });
      const caseBox = new THREE.Mesh(caseGeo, caseMat);
      group.add(caseBox);
      group.userData.caseBox = caseBox;

      const vinylGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 48);
      const vinylMat = new THREE.MeshStandardMaterial({
        map: makeVinylTexture(proj.color, proj.logo),
        roughness: 0.4,
        metalness: 0.6,
      });
      const vinyl = new THREE.Mesh(vinylGeo, vinylMat);
      vinyl.rotation.x = Math.PI / 2;
      vinyl.position.set(0, -0.5, 0.03);
      vinyl.scale.set(0.01, 0.01, 0.01);
      group.add(vinyl);
      group.userData.vinyl = vinyl;
      group.userData.targetVinylY = -0.5;
      group.userData.targetVinylS = 0.01;

      this.scene.add(group);
      this._records.push(group);
    });
  }

  _buildUI() {
    this.uiEl = document.createElement('div');
    this.uiEl.id = 'projects-ui';
    this.uiEl.style.display = 'none';

    // Crosshair
    this._crosshair = document.createElement('div');
    this._crosshair.id = 'crosshair';
    this.uiEl.appendChild(this._crosshair);

    // Lock hint
    this._lockHint = document.createElement('div');
    this._lockHint.id = 'lock-hint';
    this._lockHint.textContent = 'CLICK TO LOOK AROUND  ·  ESC TO RELEASE';
    this.uiEl.appendChild(this._lockHint);

    this.tooltip = document.createElement('div');
    this.tooltip.id = 'record-tooltip';
    this.uiEl.appendChild(this.tooltip);

    this.card = document.createElement('div');
    this.card.id = 'project-card';
    this.card.innerHTML = `
      <button id="close-card">✕</button>
      <img class="project-screenshot" src="" alt="project screenshot" />
      <div class="card-body">
        <span class="project-badge"></span>
        <h2 class="project-title"></h2>
        <p class="project-desc"></p>
        <button class="play-btn">▶ &nbsp;PLAY</button>
      </div>
    `;
    this.uiEl.appendChild(this.card);

    this._stopBtn = document.createElement('button');
    this._stopBtn.id = 'stop-btn';
    this._stopBtn.innerHTML = '&#9632; &nbsp;STOP';
    this._stopBtn.style.opacity = '0';
    this._stopBtn.style.pointerEvents = 'none';
    this.uiEl.appendChild(this._stopBtn);

    this.overlay.appendChild(this.uiEl);

    document.getElementById('close-card').addEventListener('click', () => this._closeCard());
    this.card.querySelector('.play-btn').addEventListener('click', () => {
      if (this._activeRecord) this._playRecord(this._activeRecord);
    });
    this._stopBtn.addEventListener('click', () => this._stopRecord());
  }

  _bindEvents() {
    // FPS pointer lock
    this._onPointerLockChange = () => {
      this._pointerLocked = document.pointerLockElement === this.renderer.domElement;
      this._crosshair.classList.toggle('active', this._pointerLocked);
      this._lockHint.textContent = this._pointerLocked
        ? 'ESC TO RELEASE MOUSE'
        : 'CLICK TO LOOK AROUND  ·  ESC TO RELEASE';
      this._lockHint.style.opacity = '1';
    };

    this._onPointerMove = (e) => {
      if (!this._pointerLocked) {
        // Update mouse for non-locked raycasting
        this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.tooltip.style.left = e.clientX + 'px';
        this.tooltip.style.top = e.clientY + 'px';
        return;
      }
      const sens = 0.0018;
      this._yaw   -= e.movementX * sens;
      this._pitch -= e.movementY * sens;
      this._pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this._pitch));
    };

    this._canvasClickHandler = () => {
      if (!this._pointerLocked) {
        this.renderer.domElement.requestPointerLock();
        return;
      }
      if (this.card.classList.contains('visible')) return;
      if (this._flyState) return;
      if (this._hoveredRecord) this._activateRecord(this._hoveredRecord);
    };

    // Touch drag (mobile fallback)
    this._onTouchStart = (e) => {
      if (e.touches.length === 1) {
        this._lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    this._onTouchMove = (e) => {
      if (e.touches.length !== 1 || !this._lastTouch) return;
      const dx = e.touches[0].clientX - this._lastTouch.x;
      const dy = e.touches[0].clientY - this._lastTouch.y;
      this._yaw   -= dx * 0.003;
      this._pitch -= dy * 0.003;
      this._pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this._pitch));
      this._lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    this._onTouchEnd = () => { this._lastTouch = null; };
  }

  _activateRecord(group) {
    if (group.userData.state === 'active') return;
    if (this._activeRecord && this._activeRecord !== group) {
      this._activeRecord.userData.state = 'idle';
    }
    group.userData.state = 'active';
    this._activeRecord = group;

    const proj = group.userData.project;

    const screenshot = this.card.querySelector('.project-screenshot');
    if (proj.screenshot) {
      screenshot.src = proj.screenshot;
      screenshot.style.display = 'block';
    } else {
      screenshot.style.display = 'none';
    }

    const badge = this.card.querySelector('.project-badge');
    if (proj.badge) {
      badge.textContent = proj.badge;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }

    this.card.querySelector('.project-title').textContent = proj.name;
    this.card.querySelector('.project-desc').textContent = proj.desc || '';
    this.card.querySelector('.play-btn').style.display = proj.url ? 'block' : 'none';

    this.card.classList.add('visible');
    this.tooltip.style.opacity = '0';

    // Release pointer lock so the user can interact with the card
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _closeCard() {
    this.card.classList.remove('visible');
    if (this._activeRecord) {
      this._activeRecord.userData.state = 'idle';
      this._activeRecord = null;
    }
  }

  _playRecord(group) {
    const proj = group.userData.project;
    if (!proj.url) return;

    this.card.classList.remove('visible');

    const vinyl = group.userData.vinyl;
    const worldPos = new THREE.Vector3();
    vinyl.getWorldPosition(worldPos);
    const worldQuat = new THREE.Quaternion();
    vinyl.getWorldQuaternion(worldQuat);

    group.remove(vinyl);
    this.scene.add(vinyl);
    vinyl.position.copy(worldPos);
    vinyl.quaternion.copy(worldQuat);
    vinyl.scale.set(1, 1, 1);

    const targetPos = new THREE.Vector3(3.5, -1.0, -5);

    this._flyState = {
      mesh: vinyl,
      group,
      startPos: worldPos.clone(),
      targetPos,
      t: 0,
      url: proj.url,
      opened: false,
    };

    this._stopBtn.style.transition = 'opacity 0.4s';
    this._stopBtn.style.opacity = '1';
    this._stopBtn.style.pointerEvents = 'auto';
  }

  _stopRecord() {
    if (this._platterVinyl) {
      this.scene.remove(this._platterVinyl);
      this._platterVinyl = null;
    }
    if (this._flyState) {
      this.scene.remove(this._flyState.mesh);
      this._flyState = null;
    }

    const group = this._activeRecord;
    if (group) {
      const proj = group.userData.project;
      const vinylGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 48);
      const vinylMat = new THREE.MeshStandardMaterial({
        map: makeVinylTexture(proj.color, proj.logo),
        roughness: 0.4, metalness: 0.6,
      });
      const newVinyl = new THREE.Mesh(vinylGeo, vinylMat);
      newVinyl.rotation.x = Math.PI / 2;
      newVinyl.position.set(0, -0.5, 0.03);
      newVinyl.scale.set(0.01, 0.01, 0.01);
      group.add(newVinyl);
      group.userData.vinyl = newVinyl;
      group.userData.targetVinylY = -0.5;
      group.userData.targetVinylS = 0.01;
      group.userData.state = 'idle';
      this._activeRecord = null;
    }

    this._stopBtn.style.opacity = '0';
    this._stopBtn.style.pointerEvents = 'none';
  }

  enter() {
    this.uiEl.style.display = 'block';
    this._lockHint.style.opacity = '1';
    this.renderer.domElement.addEventListener('click', this._canvasClickHandler);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('mousemove', this._onPointerMove);
    document.addEventListener('touchstart', this._onTouchStart, { passive: true });
    document.addEventListener('touchmove', this._onTouchMove, { passive: true });
    document.addEventListener('touchend', this._onTouchEnd);
  }

  exit() {
    this.uiEl.style.display = 'none';
    this.card.classList.remove('visible');
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this._pointerLocked = false;
    this._crosshair.classList.remove('active');
    this.renderer.domElement.removeEventListener('click', this._canvasClickHandler);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('mousemove', this._onPointerMove);
    document.removeEventListener('touchstart', this._onTouchStart);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
  }

  update(delta) {
    this._breathT += delta;

    this.starfield.material.uniforms.uTime.value += delta;

    // Apply FPS camera rotation
    this.camera.rotation.y = this._yaw;
    this.camera.rotation.x = this._pitch;
    // Gentle breathing bob
    this.camera.position.y = Math.sin(this._breathT * 0.4) * 0.04;

    if (this.playerGroup) {
      this.playerGroup.position.y = -1.5 + Math.sin(this._breathT * 0.5) * 0.06;
      this.platter.rotation.y += delta * 1.2;
    }

    // Vinyl fly-to-player
    if (this._flyState) {
      const fs = this._flyState;
      fs.t += delta * 0.65;
      const t = Math.min(1, fs.t);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      fs.mesh.position.lerpVectors(fs.startPos, fs.targetPos, ease);
      fs.mesh.position.y += Math.sin(t * Math.PI) * 2.5;
      fs.mesh.rotation.x = (Math.PI / 2) * (1 - ease);
      fs.mesh.rotation.y += delta * 4;

      if (t >= 1) {
        if (!fs.opened) {
          fs.opened = true;
          window.open(fs.url, '_blank');
        }
        this._platterVinyl = fs.mesh;
        this._flyState = null;
      }
    }

    // Spin vinyl on platter
    if (this._platterVinyl && this.playerGroup) {
      const py = this.playerGroup.position.y;
      this._platterVinyl.position.set(3.5, py + 0.1, -5);
      this._platterVinyl.rotation.x = 0;
      this._platterVinyl.rotation.y += delta * 2.2;
    }

    // Planet slow rotation
    if (this._planets) {
      this._planets.forEach(p => { p.rotation.y += delta * 0.03 * p.userData.rotDir; });
    }

    // Asteroids tumble
    this._asteroids.forEach(a => {
      a.rotation.x += a.userData.rot.x * delta;
      a.rotation.y += a.userData.rot.y * delta;
    });

    // Asteroid+rocket drifts slowly in far distance
    if (this._spaceship) {
      this._spaceshipT += delta * 0.025;
      this._spaceship.position.x = Math.sin(this._spaceshipT) * 35;
      this._spaceship.position.z = -80 + Math.cos(this._spaceshipT) * 12;
      this._spaceship.position.y = -2 + Math.sin(this._spaceshipT * 0.6) * 4;
      this._spaceship.rotation.y = this._spaceshipT * 0.4;
      this._spaceship.rotation.x = Math.sin(this._spaceshipT * 0.3) * 0.15;
    }

    // Raycaster — from screen centre when locked, else from mouse
    if (this._pointerLocked) {
      this._raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    } else {
      this._raycaster.setFromCamera(this._mouse, this.camera);
    }

    const meshes = this._records.map(g => g.userData.caseBox);
    const hits = this._raycaster.intersectObjects(meshes);

    let newHover = null;
    if (hits.length) {
      const hitMesh = hits[0].object;
      newHover = this._records.find(g => g.userData.caseBox === hitMesh) || null;
    }

    this._records.forEach(group => {
      const vinyl   = group.userData.vinyl;
      const caseBox = group.userData.caseBox;
      const isHovered = group === newHover;
      const isActive  = group.userData.state === 'active';

      if (!isActive) {
        group.userData.state = isHovered ? 'hovered' : 'idle';
      }

      // Vertical bob — records stay facing inward, just float up/down
      if (!isActive) {
        group.position.y = group.userData.baseY + Math.sin(this._breathT * 0.5 + group.userData.bobPhase) * 0.14;
      }

      if (isActive) {
        group.userData.targetVinylY = 0.9;
        group.userData.targetVinylS = 1.0;
      } else if (isHovered) {
        group.userData.targetVinylY = 0.52;
        group.userData.targetVinylS = 1.0;
      } else {
        group.userData.targetVinylY = -0.5;
        group.userData.targetVinylS = 0.01;
      }

      const targetBoxS = isHovered ? 1.1 : 1.0;

      const lf = Math.min(1, delta * 10);
      vinyl.position.y += (group.userData.targetVinylY - vinyl.position.y) * lf;
      const cs = vinyl.scale.x + (group.userData.targetVinylS - vinyl.scale.x) * lf;
      vinyl.scale.set(cs, cs, cs);
      const bs = caseBox.scale.x + (targetBoxS - caseBox.scale.x) * Math.min(1, delta * 8);
      caseBox.scale.set(bs, bs, bs);
    });

    this._hoveredRecord = newHover;

    // Show tooltip at screen centre when locked, else follow mouse
    if (newHover && newHover.userData.state !== 'active') {
      this.tooltip.style.opacity = '1';
      this.tooltip.textContent = newHover.userData.project.name;
      if (this._pointerLocked) {
        this.tooltip.style.left = (window.innerWidth / 2) + 'px';
        this.tooltip.style.top  = (window.innerHeight / 2 - 48) + 'px';
      }
    } else {
      this.tooltip.style.opacity = '0';
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

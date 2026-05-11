import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createStarfield } from '../components/Stars.js';

const PROJECTS = [
  { name: 'Project Alpha',   color: 0xe85d04, label: '#e85d04' },
  { name: 'Project Beta',    color: 0x00b4d8, label: '#00b4d8' },
  { name: 'Project Gamma',   color: 0x80b918, label: '#80b918' },
  { name: 'Project Delta',   color: 0xf72585, label: '#f72585' },
  { name: 'Project Epsilon', color: 0xffd60a, label: '#ffd60a' },
];

function makeVinylTexture(color) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;

  // Black vinyl body
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.fill();

  // Groove rings
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let r = 20; r < cx - 10; r += 4) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Colored label circle
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 56);
  grad.addColorStop(0, hexToCSS(color));
  grad.addColorStop(1, shiftColor(color));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI * 2);
  ctx.fill();

  // Center hole
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function shiftColor(hex) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8)  & 0xff;
  const b =  hex        & 0xff;
  return `rgb(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+40)})`;
}

function hexToCSS(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

function makeCaseTexture(color) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, size, size);

  // Subtle gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, `${hexToCSS(color)}22`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Thin colored border
  ctx.strokeStyle = hexToCSS(color);
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);

  // Inner lines decoration
  ctx.strokeStyle = `${hexToCSS(color)}44`;
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, size - 28, size - 28);

  return new THREE.CanvasTexture(canvas);
}

export class ProjectsScene {
  constructor(renderer, overlay) {
    this.renderer = renderer;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 0, 0);
    this._built = false;
    this._records = [];
    this._hoveredRecord = null;
    this._activeRecord = null;
    this._mouse = new THREE.Vector2();
    this._raycaster = new THREE.Raycaster();
    this._breathT = 0;
    this._targetRotX = 0;
    this._targetRotY = 0;
  }

  init() {
    if (this._built) return;
    this._built = true;

    this.scene.background = new THREE.Color(0x03091a);
    this.scene.fog = new THREE.FogExp2(0x03091a, 0.006);

    this.scene.add(new THREE.AmbientLight(0x0a1835, 2.0));
    const keyLight = new THREE.DirectionalLight(0xaabbff, 0.8);
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x3322aa, 2, 30);
    fillLight.position.set(-4, 2, -2);
    this.scene.add(fillLight);

    this.starfield = createStarfield(2000);
    this.scene.add(this.starfield);
    this._loadRecordPlayer();
    this._buildRecords();
    this._buildUI();
    this._bindEvents();
  }

  _loadRecordPlayer() {
    const loader = new GLTFLoader();
    loader.load('assets/turntable.glb', (gltf) => {
      this.playerGroup = gltf.scene;
      this.playerGroup.position.set(2.8, -0.5, -4);
      this.playerGroup.rotation.y = -0.5;

      // Find the platter mesh by name for rotation animation
      gltf.scene.traverse((node) => {
        if (node.name && node.name.toLowerCase().includes('platter')) {
          this.platter = node;
        }
      });

      // Fallback: if no platter found by name, create a dummy one
      if (!this.platter) {
        this.platter = new THREE.Mesh();
        this.platter.rotation = new THREE.Euler();
      }

      this.scene.add(this.playerGroup);
    });
  }

  _buildRecordPlayer() {
    // Kept for compatibility, but now loading from GLB instead
    console.log('Record player loaded from GLB');
  }

  _buildRecords() {
    PROJECTS.forEach((proj, i) => {
      const goldenAngle = 2.399963;
      const theta = i * goldenAngle;
      const radius = 3 + (i % 2) * 0.8;
      const height = (i - 2) * 0.9;

      const group = new THREE.Group();
      group.position.set(
        Math.cos(theta) * radius,
        height,
        -5 + Math.sin(theta) * radius * 0.6
      );
      group.userData = { index: i, project: proj, state: 'idle' }; // idle | hovered | active

      // Album case (flat box)
      const caseGeo = new THREE.BoxGeometry(1.0, 1.0, 0.06);
      const caseMat = new THREE.MeshStandardMaterial({
        map: makeCaseTexture(proj.color),
        roughness: 0.7,
        metalness: 0.1,
      });
      const caseBox = new THREE.Mesh(caseGeo, caseMat);
      group.add(caseBox);
      group.userData.caseBox = caseBox;

      // Vinyl disc — starts tucked inside case, smoothly peeks out on hover
      const vinylGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 48);
      const vinylMat = new THREE.MeshStandardMaterial({
        map: makeVinylTexture(proj.color),
        roughness: 0.4,
        metalness: 0.6,
      });
      const vinyl = new THREE.Mesh(vinylGeo, vinylMat);
      vinyl.rotation.x = Math.PI / 2; // face forward
      vinyl.position.set(0, -0.5, 0.03); // tucked behind/inside case bottom
      vinyl.scale.set(0.01, 0.01, 0.01); // near-invisible
      group.add(vinyl);
      group.userData.vinyl = vinyl;
      // Animation targets
      group.userData.targetVinylY = -0.5;
      group.userData.targetVinylS = 0.01;

      // Slow drift rotation for each group
      group.userData.driftAxis = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.1
      ).normalize();
      group.userData.driftSpeed = 0.15 + Math.random() * 0.1;

      this.scene.add(group);
      this._records.push(group);
    });
  }

  _buildUI() {
    this.uiEl = document.createElement('div');
    this.uiEl.id = 'projects-ui';
    this.uiEl.style.display = 'none';

    this.tooltip = document.createElement('div');
    this.tooltip.id = 'record-tooltip';
    this.uiEl.appendChild(this.tooltip);

    this.card = document.createElement('div');
    this.card.id = 'project-card';
    this.card.innerHTML = `
      <button id="close-card">✕</button>
      <h2 class="project-title"></h2>
      <p class="project-desc">Coming soon — details will be added here.</p>
    `;
    this.uiEl.appendChild(this.card);

    this.overlay.appendChild(this.uiEl);

    document.getElementById('close-card').addEventListener('click', () => this._closeCard());
  }

  _bindEvents() {
    this._mouseMoveHandler = (e) => {
      this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.1;
      this._targetRotX = (e.clientY / window.innerHeight - 0.5) * -0.06;
      this.tooltip.style.left = e.clientX + 'px';
      this.tooltip.style.top = e.clientY + 'px';
    };
    this._clickHandler = (e) => {
      if (this._hoveredRecord) this._activateRecord(this._hoveredRecord);
    };
  }

  _activateRecord(group) {
    if (group.userData.state === 'active') return;
    group.userData.state = 'active';
    this._activeRecord = group;

    const vinyl = group.userData.vinyl;

    // Animate vinyl flying to the record player
    const startPos = group.position.clone();
    const startRot = group.rotation.clone();

    // Pull vinyl out of case first (scale up)
    vinyl.scale.set(1, 1, 1);
    vinyl.position.set(0, 0.8, 0.03);

    let t = 0;
    group.userData.flyAnim = { t: 0, active: true };

    // Show project card
    const title = this.card.querySelector('.project-title');
    title.textContent = group.userData.project.name;
    this.card.classList.add('visible');
    this.tooltip.style.opacity = '0';
  }

  _closeCard() {
    this.card.classList.remove('visible');
    if (this._activeRecord) {
      this._activeRecord.userData.state = 'idle';
      this._activeRecord = null;
    }
  }

  enter() {
    this.uiEl.style.display = 'block';
    window.addEventListener('mousemove', this._mouseMoveHandler);
    window.addEventListener('click', this._clickHandler);
  }

  exit() {
    this.uiEl.style.display = 'none';
    this.card.classList.remove('visible');
    window.removeEventListener('mousemove', this._mouseMoveHandler);
    window.removeEventListener('click', this._clickHandler);
  }

  update(delta) {
    this._breathT += delta;

    // Twinkling stars
    this.starfield.material.uniforms.uTime.value += delta;

    // Camera breathing + parallax
    this.camera.rotation.x += (this._targetRotX - this.camera.rotation.x) * 0.05;
    this.camera.rotation.y += (this._targetRotY - this.camera.rotation.y) * 0.05;
    this.camera.position.y = Math.sin(this._breathT * 0.4) * 0.04;

    // Player bob
    if (this.playerGroup) {
      this.playerGroup.position.y = -0.5 + Math.sin(this._breathT * 0.5) * 0.06;
      this.platter.rotation.y += delta * 1.2;
    }

    // Raycaster hover
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = this._records.map(g => g.userData.caseBox);
    const hits = this._raycaster.intersectObjects(meshes);

    let newHover = null;
    if (hits.length) {
      const hitMesh = hits[0].object;
      newHover = this._records.find(g => g.userData.caseBox === hitMesh) || null;
    }

    // Update hover state flags, then lerp everything smoothly
    this._records.forEach(group => {
      const vinyl    = group.userData.vinyl;
      const caseBox  = group.userData.caseBox;
      const isHovered = group === newHover;
      const isActive  = group.userData.state === 'active';

      // Update state machine
      if (!isActive) {
        group.userData.state = isHovered ? 'hovered' : 'idle';
      }

      // Set animation targets based on state
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

      const targetBoxS = isHovered ? 1.07 : 1.0;

      // Smooth lerp — spring-like feel
      const lf = Math.min(1, delta * 10);
      vinyl.position.y  += (group.userData.targetVinylY - vinyl.position.y) * lf;
      const cs = vinyl.scale.x + (group.userData.targetVinylS - vinyl.scale.x) * lf;
      vinyl.scale.set(cs, cs, cs);
      const bs = caseBox.scale.x + (targetBoxS - caseBox.scale.x) * Math.min(1, delta * 8);
      caseBox.scale.set(bs, bs, bs);

      // Gentle drift rotation (only when not active)
      if (!isActive) {
        group.rotation.y += group.userData.driftSpeed * delta * 0.25;
        group.rotation.x += group.userData.driftSpeed * delta * 0.12;
      }
    });

    this._hoveredRecord = newHover;
    this.tooltip.style.opacity = newHover && newHover.userData.state !== 'active' ? '1' : '0';
    if (newHover) this.tooltip.textContent = newHover.userData.project.name;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

import * as THREE from 'three';

export class HyperspaceScene {
  constructor(renderer, overlay) {
    this.renderer = renderer;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 0, 0);
    this._built = false;
    this._onComplete = null;
    this._active = false;
    this._t = 0;
  }

  init() {
    if (this._built) return;
    this._built = true;

    // Streak lines — radiate from center outward
    const STREAK_COUNT = 350;
    this.streaks = [];

    for (let i = 0; i < STREAK_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        -1 - Math.random() * 2 // bias forward
      ).normalize();

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

      const hue = Math.random() > 0.6 ? 0xffffff : 0x88ccff;
      const mat = new THREE.LineBasicMaterial({
        color: hue,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.streaks.push({ line, dir, speed: 2 + Math.random() * 5 });
    }

    // Flash overlay div
    this.flash = document.createElement('div');
    this.flash.id = 'hyperspace-flash';
    this.overlay.appendChild(this.flash);
  }

  onComplete(fn) { this._onComplete = fn; }

  enter() {
    this._active = true;
    this._t = 0;
    this.streaks.forEach(s => {
      const pos = s.line.geometry.attributes.position.array;
      pos.fill(0);
      s.line.geometry.attributes.position.needsUpdate = true;
      s.line.material.opacity = 0;
    });
    this.flash.style.opacity = '0';
  }

  exit() {
    this._active = false;
    this.flash.style.opacity = '0';
  }

  update(delta) {
    if (!this._active) return;
    this._t += delta;
    const t = this._t;

    // 0–0.3s: ramp up
    // 0.3–1.8s: full streaks
    // 1.8–2.1s: flash
    // 2.1–2.5s: fade out, complete

    const ramp = Math.min(1, t / 0.3);
    const fadeOut = t > 2.1 ? Math.max(0, 1 - (t - 2.1) / 0.4) : 1;

    this.streaks.forEach(s => {
      const len = ramp * s.speed * Math.min(1, t / 0.5);
      const pos = s.line.geometry.attributes.position.array;
      pos[0] = s.dir.x * 0.01;
      pos[1] = s.dir.y * 0.01;
      pos[2] = s.dir.z * 0.01;
      pos[3] = s.dir.x * len;
      pos[4] = s.dir.y * len;
      pos[5] = s.dir.z * len;
      s.line.geometry.attributes.position.needsUpdate = true;
      s.line.material.opacity = ramp * 0.7 * fadeOut;
    });

    // Flash at 1.8–2.1s
    if (t > 1.7 && t < 2.2) {
      const flashT = (t - 1.7) / 0.5;
      const flashVal = Math.sin(flashT * Math.PI);
      this.flash.style.opacity = String(flashVal * 0.9);
    } else {
      this.flash.style.opacity = '0';
    }

    if (t >= 2.5 && this._onComplete) {
      this._active = false;
      this._onComplete();
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

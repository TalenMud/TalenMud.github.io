import * as THREE from 'three';
import { createStarfield } from '../components/Stars.js';

const SOCIALS = [
  { icon: '⌥', label: 'GitHub',    href: '#' },
  { icon: '◈', label: 'Instagram', href: '#' },
  { icon: '◇', label: 'LinkedIn',  href: '#' },
  { icon: '✦', label: 'Email',     href: '#' },
];

export class FindMeScene {
  constructor(renderer, overlay) {
    this.renderer = renderer;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 0, 5);
    this._built = false;
    this._t = 0;
  }

  init() {
    if (this._built) return;
    this._built = true;

    this.scene.add(createStarfield(1800));
    this.scene.add(new THREE.AmbientLight(0x112233, 2));

    this._buildUI();
  }

  _buildUI() {
    this.uiEl = document.createElement('div');
    this.uiEl.id = 'findme-ui';
    this.uiEl.style.display = 'none';

    const h = document.createElement('h2');
    h.textContent = 'find me';
    this.uiEl.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'social-grid';

    SOCIALS.forEach(({ icon, label, href }) => {
      const a = document.createElement('a');
      a.className = 'social-card';
      a.href = href;
      a.target = '_blank';
      a.innerHTML = `<span class="social-icon">${icon}</span><span>${label}</span>`;
      grid.appendChild(a);
    });

    this.uiEl.appendChild(grid);
    this.overlay.appendChild(this.uiEl);
    this.cards = Array.from(grid.querySelectorAll('.social-card'));
  }

  enter() {
    this.uiEl.style.display = 'flex';
    this._t = 0;
    // Stagger card appearance
    this.cards.forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(20px)';
      c.style.transition = `opacity 0.4s ${0.1 + i * 0.08}s, transform 0.4s ${0.1 + i * 0.08}s`;
      requestAnimationFrame(() => {
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      });
    });
  }

  exit() {
    this.uiEl.style.display = 'none';
  }

  update(delta) {
    this._t += delta;
    // Gentle card float via CSS is handled by individual transitions
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

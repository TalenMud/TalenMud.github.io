import * as THREE from 'three';
import { LandingScene }    from './scenes/LandingScene.js';
import { HyperspaceScene } from './scenes/HyperspaceScene.js';
import { ProjectsScene }   from './scenes/ProjectsScene.js';
import { FindMeScene }     from './scenes/FindMeScene.js';
import { QuickNav }        from './components/QuickNav.js';

class SceneManager {
  constructor() {
    this.canvas   = document.getElementById('webgl');
    this.overlay  = document.getElementById('overlay');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x03091a, 1);

    this.clock    = new THREE.Clock();
    this.current  = null;
    this.history  = [];
    this._transitioning = false;

    this.scenes = {
      landing:    new LandingScene(this.renderer, this.overlay),
      hyperspace: new HyperspaceScene(this.renderer, this.overlay),
      projects:   new ProjectsScene(this.renderer, this.overlay),
      findme:     new FindMeScene(this.renderer, this.overlay),
    };

    // Wire up scene transitions
    this.scenes.landing.onEnter(() => this.transition('projects'));
    this.scenes.hyperspace.onComplete(() => {
      this._swapTo('projects');
    });

    // Fade overlay
    this.fadeEl = document.createElement('div');
    this.fadeEl.id = 'scene-fade';
    document.body.appendChild(this.fadeEl);

    // Init all scenes
    Object.values(this.scenes).forEach(s => s.init());

    this.quickNav = new QuickNav(this);

    window.addEventListener('resize', () => this._onResize());
    this._animate();
    this.go('landing');
  }

  go(name) {
    if (this._transitioning) return;
    if (this.current) {
      if (this.current !== name) this.history.push(this.current);
      this.scenes[this.current].exit();
      this.quickNav.hide();
    }
    this.current = name;
    this.scenes[name].enter();
    if (name !== 'landing') this.quickNav.show();
    else this.quickNav.hide();
  }

  _swapTo(name) {
    if (this.current) this.scenes[this.current].exit();
    this.current = name;
    this.scenes[name].enter();
    if (name !== 'landing') this.quickNav.show();
    else this.quickNav.hide();
    this._transitioning = false;
  }

  goBack() {
    if (this.history.length === 0) return;
    const prev = this.history.pop();
    if (this.current) this.scenes[this.current].exit();
    this.current = prev;
    this.scenes[prev].enter();
    if (prev !== 'landing') this.quickNav.show();
    else this.quickNav.hide();
  }

  transition(dest) {
    if (this._transitioning) return;
    this._transitioning = true;

    // Exit current scene but keep renderer running
    if (this.current && this.current !== 'hyperspace') {
      this.history.push(this.current);
      this.scenes[this.current].exit();
      this.quickNav.hide();
    }
    this.current = 'hyperspace';
    this.scenes.hyperspace.enter();
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.current) {
      const scene = this.scenes[this.current];
      scene.update(delta);
      this.renderer.render(scene.scene, scene.camera);
    }
  }

  _onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    Object.values(this.scenes).forEach(s => s.onResize?.());
  }
}

new SceneManager();

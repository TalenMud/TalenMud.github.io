export class QuickNav {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.open = false;
    this._build();
  }

  _build() {
    const nav = document.createElement('div');
    nav.id = 'quick-nav';

    const opts = document.createElement('div');
    opts.id = 'quick-nav-options';

    const buttons = [
      { label: 'back',    action: () => this.sm.goBack() },
      { label: 'home',    action: () => this.sm.go('landing') },
      { label: 'cv',      action: () => window.open('cv.pdf', '_blank') },
      { label: 'find me', action: () => this.sm.go('findme') },
    ];

    buttons.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.className = 'nav-opt';
      btn.textContent = label;
      btn.addEventListener('click', (e) => { e.stopPropagation(); action(); this._collapse(); });
      opts.appendChild(btn);
    });

    const toggle = document.createElement('button');
    toggle.id = 'quick-nav-toggle';
    toggle.textContent = 'quick nav →';
    toggle.addEventListener('click', (e) => { e.stopPropagation(); this._toggle(); });

    nav.appendChild(opts);
    nav.appendChild(toggle);
    document.body.appendChild(nav);

    document.addEventListener('click', () => this._collapse());
    this.el = nav;
    this.optsEl = opts;
  }

  _toggle() {
    this.open ? this._collapse() : this._expand();
  }

  _expand() {
    this.open = true;
    this.optsEl.classList.add('open');
  }

  _collapse() {
    this.open = false;
    this.optsEl.classList.remove('open');
  }

  show() { this.el.style.display = 'flex'; }
  hide() { this.el.style.display = 'none'; this._collapse(); }
}

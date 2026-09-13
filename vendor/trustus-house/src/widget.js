/* TrustUsConsult house interface. Build with: node build.mjs */
(() => {
  'use strict';
  if (customElements.get('trustus-house')) return;
  const assets = /*__ASSETS__*/null;
  const clone = value => JSON.parse(JSON.stringify(value));
  let instanceCount = 0;

  class TrustUsHouse extends HTMLElement {
    constructor() {
      super();
      this._prefix = 'trustus-' + (++instanceCount) + '-';
      this._config = clone(assets.config);
      this._selected = null;
      this._hovered = null;
      this._lastPreview = null;
      this._discovered = false;
      this._touch = false;
      this._pinned = false;
      this._timer = null;
      this._listeners = [];
      this._connected = false;
      this.ready = new Promise(resolve => { this._resolveReady = resolve; });
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = assets.css;
      root.append(style);
      const layout = document.createElement('div');
      layout.className = 'layout';
      // Both markup fragments are bundled local artwork, never user content.
      layout.innerHTML = '<div class="art">' + assets.svg + '</div>' +
        '<div class="rail"><div class="invitation" aria-hidden="true">' +
        '<div class="hook"><span></span><strong></strong><small></small></div>' +
        '<svg class="hook-arrow" viewBox="0 0 110 55" aria-hidden="true"><path d="M5 8 C37 45 72 47 99 26 M81 29 L101 25 97 43" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="card-slot"><div class="card" role="tooltip" data-visible="false" aria-hidden="true">' +
        '<div class="kicker"><span class="lamp"></span><span class="kicker-text"></span><span class="counter"></span></div>' +
        '<h2></h2><p class="description"></p><div class="skills"></div><div class="card-footer"><span></span><span aria-hidden="true">↗</span></div>' +
        '</div></div></div>';
      root.append(layout);
      this._layout = layout;
      this._svg = root.querySelector('.tuc-house');
      this._card = root.querySelector('.card');
      this._invitation = root.querySelector('.invitation');
      this._card.id = this._prefix + 'tooltip';
      this._windows = Array.from(this._svg.querySelectorAll('.tuc-window[data-domain]'));
      this._ids = this._windows.map(el => el.dataset.domain);
      this._prefixSvgIds();
      this._paint();
    }

    connectedCallback() {
      if (this._connected) return;
      // Support configuration assigned before the browser upgrades this element.
      if (Object.prototype.hasOwnProperty.call(this, 'config')) {
        const config = this.config;
        delete this.config;
        this.configure(config);
      }
      this._connected = true;
      const root = this.shadowRoot;
      this._listen(root, 'pointerdown', event => { this._touch = event.pointerType !== 'mouse'; });
      this._listen(root, 'pointerover', event => {
        const group = this._target(event.target);
        if (group && event.pointerType === 'mouse') {
          this._pinned = false;
          this.preview(group.dataset.domain);
        }
      });
      this._listen(this._layout, 'pointerenter', () => this._keepOpen());
      this._listen(this._layout, 'pointerleave', event => {
        if (event.pointerType === 'mouse') this._scheduleClose();
      });
      this._listen(root, 'focusin', event => {
        const group = this._target(event.target);
        if (group) this.preview(group.dataset.domain);
      });
      this._listen(root, 'focusout', event => {
        if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) {
          this._pinned = false;
          this._scheduleClose();
        }
      });
      this._listen(root, 'click', event => {
        const group = this._target(event.target);
        if (!group) return;
        this._pinned = this._touch;
        this.preview(group.dataset.domain);
        this._choose(group.dataset.domain, this._touch ? 'touch' : 'pointer');
      });
      this._listen(root, 'keydown', event => {
        const group = this._target(event.target);
        if (group && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          this._touch = false;
          this.preview(group.dataset.domain);
          this._choose(group.dataset.domain, 'keyboard');
        }
      });
      this._listen(document, 'keydown', event => { if (event.key === 'Escape') this.dismiss(); });
      this._listen(document, 'pointerdown', event => {
        if (!event.composedPath().includes(this)) this.dismiss();
      });
      this._paint();
      this._resolveReady(this);
      this._emit('ready', { version: assets.version });
    }

    disconnectedCallback() {
      this._keepOpen();
      this._listeners.splice(0).forEach(remove => remove());
      this._connected = false;
      this._hovered = null;
      this._pinned = false;
      this._paint();
    }

    get config() { return clone(this._config); }
    set config(value) { this.configure(value); }

    configure(overrides = {}) {
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new TypeError('Configuration must be an object.');
      const next = clone(this._config);
      if (overrides.domains !== undefined) {
        if (!Array.isArray(overrides.domains)) throw new TypeError('domains must be an array.');
        const seen = new Set();
        for (const change of overrides.domains) {
          if (!change || !this._ids.includes(change.id) || seen.has(change.id)) throw new RangeError('Invalid or duplicate domain id.');
          seen.add(change.id);
          const domain = next.domains.find(d => d.id === change.id);
          for (const key of ['name', 'short', 'description', 'href']) {
            if (change[key] !== undefined) {
              if (typeof change[key] !== 'string') throw new TypeError(key + ' must be a string.');
              domain[key] = change[key];
            }
          }
          if (change.skills !== undefined) {
            if (!Array.isArray(change.skills) || change.skills.some(s => typeof s !== 'string')) throw new TypeError('skills must contain strings.');
            domain.skills = [...change.skills];
          }
          if (domain.href) this._safeUrl(domain.href);
        }
      }
      if (overrides.relationships !== undefined) {
        if (!Array.isArray(overrides.relationships) || overrides.relationships.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(id => !this._ids.includes(id)))) {
          throw new TypeError('relationships must be pairs of known domain IDs.');
        }
        next.relationships = clone(overrides.relationships);
      }
      if (overrides.copy !== undefined) {
        if (!overrides.copy || typeof overrides.copy !== 'object' || Array.isArray(overrides.copy)) throw new TypeError('copy must be an object.');
        for (const [key, value] of Object.entries(overrides.copy)) {
          if (!(key in next.copy) || typeof value !== 'string') throw new TypeError('Unknown copy field or non-string value: ' + key);
          next.copy[key] = value;
        }
      }
      this._config = next;
      this._paint();
      return this;
    }

    preview(id) {
      if (id === null) { this.dismiss(); return; }
      this._valid(id);
      this._keepOpen();
      const changed = this._hovered !== id;
      this._hovered = id;
      this._lastPreview = id;
      this._discovered = true;
      this._paint();
      if (changed) this._emit('preview', { domainId: id, domain: this._domain(id) });
    }

    // Programmatic selection never navigates. A user activation may follow href.
    select(id) { this._choose(id, 'api'); }

    dismiss() {
      this._keepOpen();
      const changed = this._hovered !== null;
      this._hovered = null;
      this._pinned = false;
      this._paint();
      if (changed) this._emit('preview', { domainId: null, domain: null });
    }

    reset() {
      this.dismiss();
      this._selected = null;
      this._lastPreview = null;
      this._discovered = false;
      this._paint();
      this._emit('reset', {});
    }

    focusWindow(id = this._ids[0]) {
      this._valid(id);
      this._windows.find(el => el.dataset.domain === id).focus({ preventScroll: true });
    }

    getState() { return { selected: this._selected, hovered: this._hovered, discovered: this._discovered }; }

    _choose(id, source) {
      this._valid(id);
      this._selected = id;
      this._paint();
      const domain = this._domain(id);
      const proceed = this._emit('select', { domainId: id, domain, source }, true);
      if (proceed && source !== 'api' && domain.href) window.location.assign(this._safeUrl(domain.href));
    }

    _paint() {
      const active = this._hovered ?? this._selected;
      const related = new Set(this._config.relationships.flatMap(([a, b]) => a === active ? [b] : b === active ? [a] : []));
      const copy = this._config.copy;
      const coarse = matchMedia('(hover: none)').matches;
      this._svg.setAttribute('aria-label', copy.houseLabel);
      for (const el of this._windows) {
        const domain = this._config.domains.find(d => d.id === el.dataset.domain);
        el.classList.toggle('is-active', domain.id === active);
        el.classList.toggle('is-neighbour', related.has(domain.id));
        el.setAttribute('aria-pressed', String(domain.id === this._selected));
        el.setAttribute('aria-label', domain.name + '. ' + domain.description + ' ' + copy.actionLabel);
        if (domain.id === this._hovered) el.setAttribute('aria-describedby', this._card.id);
        else el.removeAttribute('aria-describedby');
      }
      const hook = this.shadowRoot.querySelector('.hook');
      hook.querySelector('span').textContent = copy.psst;
      hook.querySelector('strong').textContent = copy.invitation;
      hook.querySelector('small').textContent = coarse ? copy.touchHint : copy.hoverHint;
      this._invitation.classList.toggle('is-discovered', this._discovered);
      this._card.dataset.visible = String(this._hovered !== null);
      this._card.setAttribute('aria-hidden', String(this._hovered === null));
      if (this._lastPreview !== null) {
        const domain = this._domain(this._lastPreview);
        this._card.querySelector('.kicker-text').textContent = copy.kicker;
        this._card.querySelector('.counter').textContent = String(this._ids.indexOf(domain.id) + 1).padStart(2, '0') + ' / ' + this._ids.length;
        this._card.querySelector('h2').textContent = domain.name;
        this._card.querySelector('.description').textContent = domain.description;
        this._card.querySelector('.skills').replaceChildren(...domain.skills.map(skill => {
          const span = document.createElement('span'); span.textContent = skill; return span;
        }));
        this._card.querySelector('.card-footer > span').textContent = coarse ? copy.touchFooter : copy.footer;
      }
    }

    _prefixSvgIds() {
      const ids = new Map();
      this._svg.querySelectorAll('[id]').forEach(el => { const old = el.id; ids.set(old, this._prefix + old); el.id = ids.get(old); });
      this._svg.querySelectorAll('*').forEach(el => {
        for (const attribute of Array.from(el.attributes)) {
          let value = attribute.value.replace(/url\(#([^)]*)\)/g, (match, id) => ids.has(id) ? 'url(#' + ids.get(id) + ')' : match);
          if ((attribute.localName === 'href') && value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
          if (value !== attribute.value) {
            if (attribute.namespaceURI) el.setAttributeNS(attribute.namespaceURI, attribute.name, value);
            else el.setAttribute(attribute.name, value);
          }
        }
      });
    }

    _safeUrl(href) { const url = new URL(href, document.baseURI); if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Domain href must be a relative URL or an HTTP(S) URL.'); return url.href; }
    _domain(id) { return clone(this._config.domains.find(d => d.id === id)); }
    _valid(id) { if (!this._ids.includes(id)) throw new RangeError('Unknown domain ID: ' + id); }
    _target(el) { return el instanceof Element ? el.closest('.tuc-window[data-domain]') : null; }
    _keepOpen() { clearTimeout(this._timer); this._timer = null; }
    _scheduleClose() { if (!this._pinned) { this._keepOpen(); this._timer = setTimeout(() => this.dismiss(), 180); } }
    _listen(el, type, listener) { el.addEventListener(type, listener); this._listeners.push(() => el.removeEventListener(type, listener)); }
    _emit(type, detail, cancelable = false) { return this.dispatchEvent(new CustomEvent('trustus:' + type, { detail, bubbles: true, composed: true, cancelable })); }
  }

  customElements.define('trustus-house', TrustUsHouse);
})();

/* ============================================================================
 * dom.js — Ayudas mínimas de DOM (sin dependencias)
 * ----------------------------------------------------------------------------
 * Decisión de seguridad: `Dom.h()` escapa TODO valor interpolado. Cuando hace
 * falta insertar marcado propio (por ejemplo un SVG de icono) se marca
 * explícitamente con `Dom.raw()`. Así evitamos inyecciones por datos remotos.
 * ========================================================================== */
(function () {
  'use strict';

  var RAW = '__adoptaRawHtml__';

  /* Marca una cadena como HTML de confianza */
  function raw(html) {
    return { __html: String(html == null ? '' : html), [RAW]: true };
  }
  function isRaw(value) {
    return !!(value && typeof value === 'object' && value[RAW] === true);
  }

  function escape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Convierte un valor interpolado en texto seguro para HTML */
  function valueToHtml(value) {
    if (isRaw(value)) { return value.__html; }
    if (value === null || value === undefined || value === false) { return ''; }
    if (Array.isArray(value)) { return value.map(valueToHtml).join(''); }
    return escape(value);
  }

  /* Plantilla etiquetada:
   *   h`<div class="x">${texto}</div>`
   * Los valores se escapan salvo que se envuelvan en Dom.raw(). */
  function h(strings) {
    var values = Array.prototype.slice.call(arguments, 1);
    var out = '';
    for (var i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i < values.length) { out += valueToHtml(values[i]); }
    }
    return out;
  }

  /* Crea un elemento a partir de HTML (primer nodo) */
  function el(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html).trim();
    return tpl.content.firstElementChild;
  }

  /* Crea un fragmento con varios nodos */
  function frag(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html);
    return tpl.content;
  }

  function qs(selector, scope) { return (scope || document).querySelector(selector); }
  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* Delegación de eventos: un solo listener para muchos elementos */
  function delegate(scope, eventName, selector, handler) {
    if (!scope) { return function () {}; }
    var listener = function (event) {
      var target = event.target.closest(selector);
      if (!target || !scope.contains(target)) { return; }
      handler(event, target);
    };
    scope.addEventListener(eventName, listener);
    return function () { scope.removeEventListener(eventName, listener); };
  }

  function on(scope, eventName, handler, options) {
    if (!scope) { return function () {}; }
    scope.addEventListener(eventName, handler, options);
    return function () { scope.removeEventListener(eventName, handler, options); };
  }

  function toggleClass(node, className, force) {
    if (!node) { return; }
    node.classList.toggle(className, !!force);
  }

  function setText(node, text) {
    if (node) { node.textContent = String(text == null ? '' : text); }
  }

  /* Sustituye el contenido de un contenedor */
  function mount(container, html) {
    if (!container) { return null; }
    container.innerHTML = '';
    var node = el(html);
    if (node) { container.appendChild(node); }
    return node;
  }

  /* --- Esqueletos de carga ---------------------------------------------- */
  function skeletonCard() {
    return h`<div class="skeleton skeleton--card" aria-hidden="true"></div>`;
  }

  function skeletonGrid(count) {
    var n = count || 8;
    var items = '';
    for (var i = 0; i < n; i++) { items += skeletonCard(); }
    return h`<div class="pet-grid" aria-hidden="true">${raw(items)}</div>`;
  }

  /* --- Scroll ------------------------------------------------------------ */
  function scrollToTop(smooth) {
    window.scrollTo({ top: 0, behavior: smooth === false ? 'auto' : 'smooth' });
  }

  /* Lleva un elemento a la vista respetando la barra de navegación fija */
  function scrollIntoView(node, block) {
    if (!node) { return; }
    node.scrollIntoView({ behavior: 'smooth', block: block || 'start' });
  }

  /* Espera a que un selector exista en el DOM.
   * Necesario porque una promesa puede resolverse antes de que el router haya
   * pintado la vista (microtarea frente a pintado); evita consultas prematuras. */
  function waitFor(selector, timeout) {
    var limit = typeof timeout === 'number' ? timeout : 3000;
    var step = 40;
    var waited = 0;

    return new Promise(function (resolve) {
      (function attempt() {
        var node = qs(selector);
        if (node) { resolve(node); return; }
        waited += step;
        if (waited >= limit) { resolve(null); return; }
        window.setTimeout(attempt, step);
      })();
    });
  }

  window.Dom = {
    h: h,
    raw: raw,
    isRaw: isRaw,
    escape: escape,
    el: el,
    frag: frag,
    qs: qs,
    qsa: qsa,
    on: on,
    delegate: delegate,
    toggleClass: toggleClass,
    setText: setText,
    mount: mount,
    waitFor: waitFor,
    skeletonCard: skeletonCard,
    skeletonGrid: skeletonGrid,
    scrollToTop: scrollToTop,
    scrollIntoView: scrollIntoView
  };
})();

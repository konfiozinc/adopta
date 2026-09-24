/* ============================================================================
 * a11y.js — Accesibilidad: foco, trampas de foco, scroll bloqueado, títulos
 * ========================================================================== */
(function () {
  'use strict';

  var FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function focusable(scope) {
    return window.Dom.qsa(FOCUSABLE, scope).filter(function (node) {
      return node.offsetParent !== null || node === document.activeElement;
    });
  }

  /* --------------------------------------------------------------------------
   * Trampa de foco: mantiene el Tabulador dentro de un contenedor (modales y
   * hojas inferiores). Devuelve una función para liberarla.
   * ------------------------------------------------------------------------ */
  function trapFocus(container, options) {
    var opts = options || {};
    var previouslyFocused = document.activeElement;

    function onKeydown(event) {
      if (event.key !== 'Tab') { return; }
      var nodes = focusable(container);
      if (!nodes.length) { event.preventDefault(); return; }
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeydown, true);

    /* Foco inicial: el primer elemento útil o el contenedor */
    var initial = opts.initialFocus
      ? (typeof opts.initialFocus === 'string' ? window.Dom.qs(opts.initialFocus, container) : opts.initialFocus)
      : null;
    var target = initial || focusable(container)[0] || container;
    window.setTimeout(function () {
      try { target.focus({ preventScroll: false }); } catch (error) { /* noop */ }
    }, 60);

    return function release() {
      document.removeEventListener('keydown', onKeydown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus({ preventScroll: true }); } catch (error) { /* noop */ }
      }
    };
  }

  /* --------------------------------------------------------------------------
   * Bloqueo del scroll del documento (con compensación de la barra).
   * ------------------------------------------------------------------------ */
  var lockCount = 0;

  function lockScroll() {
    lockCount += 1;
    if (lockCount > 1) { return; }
    var scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) { document.body.style.paddingRight = scrollbar + 'px'; }
  }

  function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) { return; }
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  /* --------------------------------------------------------------------------
   * Anuncia un mensaje a lectores de pantalla sin mover el foco.
   * ------------------------------------------------------------------------ */
  function announce(message, assertive) {
    var region = document.getElementById('a11y-announcer');
    if (!region) {
      region = document.createElement('div');
      region.id = 'a11y-announcer';
      region.className = 'sr-only';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      document.body.appendChild(region);
    }
    region.textContent = '';
    window.setTimeout(function () { region.textContent = String(message || ''); }, 60);
  }

  /* Título del documento por vista (importante en SPA) */
  function setTitle(text) {
    document.title = text ? text + ' · Adopta' : 'Adopta · Tu próximo compañero te espera';
  }

  /* Foco programático robusto */
  function focus(node) {
    if (!node) { return; }
    try { node.focus({ preventScroll: true }); } catch (error) { /* noop */ }
  }

  /* Marca el destino de navegación actual para lectores de pantalla */
  function setCurrent(items, isCurrent) {
    items.forEach(function (item) {
      var active = isCurrent(item);
      item.classList.toggle('is-active', active);
      if (active) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }

  window.A11y = {
    focusable: focusable,
    trapFocus: trapFocus,
    lockScroll: lockScroll,
    unlockScroll: unlockScroll,
    announce: announce,
    setTitle: setTitle,
    focus: focus,
    setCurrent: setCurrent
  };
})();

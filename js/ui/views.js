/* ============================================================================
 * views.js — Registro de vistas y ciclo de vida
 * ----------------------------------------------------------------------------
 * Cada página registra aquí su render y su montaje (listeners de la vista).
 * El router avisa cuando una vista se reemplaza para poder liberar listeners,
 * temporizadores y suscripciones al estado (evita fugas de memoria).
 * ========================================================================== */
(function () {
  'use strict';

  var registry = {};
  var activeScope = null;   /* contenedor de limpiezas de la vista en curso */
  var currentName = null;

  /* Registra una vista: { render(params) -> html|Promise, mount(root, params) } */
  function define(name, handlers) {
    registry[name] = handlers || {};
  }

  function get(name) { return registry[name] || null; }

  /* El ciclo de vida de cada montaje vive en un contenedor aislado, de modo que
   * una re-renderización de la misma ruta no reutilice limpiezas antiguas. */
  function setScope(scope) {
    activeScope = scope || null;
    if (activeScope) { activeScope.teardown = null; }
    return activeScope;
  }

  function currentScope() { return activeScope; }

  /* Registra una limpieza que se ejecutará al salir de la vista actual */
  function onLeave(callback) {
    if (typeof callback !== 'function') { return; }
    if (!activeScope) { return; }   /* sin ámbito activo no hay nada que limpiar */

    var previous = activeScope.teardown;
    activeScope.teardown = function () {
      if (typeof previous === 'function') { previous(); }
      callback();
    };
  }

  /* Ejecuta y descarta las limpiezas registradas */
  function teardown(scope) {
    var target = scope || activeScope;
    if (!target || typeof target.teardown !== 'function') { return; }
    try {
      target.teardown();
    } catch (error) {
      if (window.console) { window.console.error('[Adopta] Error al limpiar la vista', error); }
    }
    target.teardown = null;
    if (target === activeScope) { activeScope = null; }
  }

  /* Página de error genérica (se muestra si una vista lanza una excepción) */
  function error(detail) {
    return window.Dom.h`
      <div class="empty" style="margin-top:var(--s-8)">
        <span class="empty__art">${window.Dom.raw(window.Icon.render('info'))}</span>
        <h3>Algo no salió como esperábamos</h3>
        <p>No pudimos cargar esta sección. Intenta de nuevo; si el problema continúa, vuelve al inicio.</p>
        ${detail ? window.Dom.raw('<p style="font-size:var(--fs-xs);color:var(--c-text-mute)">' + window.Dom.escape(String(detail)) + '</p>') : ''}
        <div class="empty__actions">
          <a class="btn btn--primary" href="#/">${window.Dom.raw(window.Icon.render('home'))} Ir al inicio</a>
          <button class="btn btn--ghost" type="button" onclick="location.reload()">Recargar</button>
        </div>
      </div>`;
  }

  window.Views = {
    define: define,
    get: get,
    onLeave: onLeave,
    setScope: setScope,
    currentScope: currentScope,
    teardown: teardown,
    error: error,
    setCurrent: function (name) { currentName = name; },
    current: function () { return currentName; }
  };
})();

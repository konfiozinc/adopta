/* ============================================================================
 * storage.js — Persistencia local con espacio de nombres y recuperación
 * ----------------------------------------------------------------------------
 * Todo el estado de la demo vive en localStorage bajo la clave
 * `adopta:v1`. Si el navegador bloquea el almacenamiento (modo privado,
 * file:// restringido…), la app sigue funcionando en memoria.
 * ========================================================================== */
(function () {
  'use strict';

  var NAMESPACE = 'adopta:v1';
  var memory = {};          /* Respaldo cuando localStorage no está disponible */
  var available = null;     /* Se resuelve en la primera llamada */

  function canUseLocalStorage() {
    if (available !== null) { return available; }
    try {
      var probe = '__adopta_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      available = true;
    } catch (error) {
      available = false;
    }
    return available;
  }

  function key(name) { return NAMESPACE + ':' + name; }

  function get(name, fallback) {
    var raw;
    if (canUseLocalStorage()) {
      try { raw = window.localStorage.getItem(key(name)); }
      catch (error) { raw = null; }
    } else {
      raw = Object.prototype.hasOwnProperty.call(memory, name) ? memory[name] : null;
    }
    if (raw === null || raw === undefined) { return fallback; }
    try {
      return JSON.parse(raw);
    } catch (error) {
      /* Dato corrupto: se descarta en lugar de romper la app */
      remove(name);
      return fallback;
    }
  }

  function set(name, value) {
    var serialized = JSON.stringify(value);
    if (canUseLocalStorage()) {
      try {
        window.localStorage.setItem(key(name), serialized);
        return true;
      } catch (error) {
        /* Cuota superada: se degrada a memoria */
        memory[name] = serialized;
        return false;
      }
    }
    memory[name] = serialized;
    return false;
  }

  function remove(name) {
    if (canUseLocalStorage()) {
      try { window.localStorage.removeItem(key(name)); } catch (error) { /* noop */ }
    }
    delete memory[name];
  }

  /* Borra únicamente las claves de Adopta (no toca otros datos del sitio) */
  function clearAll() {
    if (canUseLocalStorage()) {
      try {
        var toRemove = [];
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(NAMESPACE) === 0) { toRemove.push(k); }
        }
        toRemove.forEach(function (k) { window.localStorage.removeItem(k); });
      } catch (error) { /* noop */ }
    }
    memory = {};
  }

  /* Exportar / importar el estado completo (útil para migrar a backend) */
  function exportAll() {
    var dump = {};
    if (canUseLocalStorage()) {
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(NAMESPACE + ':') === 0) {
            dump[k.slice(NAMESPACE.length + 1)] = JSON.parse(window.localStorage.getItem(k));
          }
        }
      } catch (error) { /* noop */ }
    } else {
      Object.keys(memory).forEach(function (name) { dump[name] = JSON.parse(memory[name]); });
    }
    return dump;
  }

  window.Storage = {
    get: get,
    set: set,
    remove: remove,
    clearAll: clearAll,
    exportAll: exportAll,
    isPersistent: canUseLocalStorage,
    namespace: NAMESPACE
  };
})();

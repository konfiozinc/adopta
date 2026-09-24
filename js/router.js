/* ============================================================================
 * router.js — Enrutador SPA basado en hash
 * ----------------------------------------------------------------------------
 * Se usa hash (#/ruta) a propósito: funciona en GitHub Pages, en cualquier
 * subcarpeta y abriendo el archivo con doble clic (file://), sin necesidad de
 * configuración de servidor ni reescrituras.
 *
 * Rutas registradas:
 *   #/                     Inicio
 *   #/mascotas             Catálogo con filtros
 *   #/mascotas/:id         Detalle de una mascota
 *   #/solicitudes          Historial de solicitudes
 *   #/cuenta               Cuenta y ajustes
 * ========================================================================== */
(function () {
  'use strict';

  var routes = [];
  var notFoundHandler = null;
  var currentRoute = null;
  var currentParams = null;
  var container = null;
  var navigationToken = 0;

  /* --------------------------------------------------------------------------
   * Registro de rutas
   * ------------------------------------------------------------------------ */
  function register(pattern, handler) {
    routes.push({
      pattern: pattern,
      parts: pattern.split('/').filter(Boolean),
      handler: handler
    });
  }

  function fallback(handler) { notFoundHandler = handler; }

  /* --------------------------------------------------------------------------
   * Parseo del hash
   * ------------------------------------------------------------------------ */
  function parseHash(hash) {
    var raw = String(hash == null ? window.location.hash : hash);
    raw = raw.replace(/^#/, '');
    if (!raw || raw === '/') { return { path: '/', query: {} }; }

    var queryIndex = raw.indexOf('?');
    var query = {};
    var path = raw;

    if (queryIndex !== -1) {
      path = raw.slice(0, queryIndex);
      raw.slice(queryIndex + 1).split('&').forEach(function (pair) {
        if (!pair) { return; }
        var bits = pair.split('=');
        query[decodeURIComponent(bits[0])] = decodeURIComponent(bits.slice(1).join('=') || '');
      });
    }

    path = '/' + path.split('/').filter(Boolean).join('/');
    return { path: path, query: query };
  }

  function match(path) {
    var segments = path.split('/').filter(Boolean);
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      if (route.parts.length !== segments.length) { continue; }
      var params = {};
      var ok = true;
      for (var j = 0; j < route.parts.length; j++) {
        var part = route.parts[j];
        if (part.charAt(0) === ':') {
          params[part.slice(1)] = decodeURIComponent(segments[j]);
        } else if (part !== segments[j]) {
          ok = false;
          break;
        }
      }
      if (ok) { return { route: route, params: params }; }
    }
    return null;
  }

  /* --------------------------------------------------------------------------
   * Navegación
   * ------------------------------------------------------------------------ */
  function navigate(path, options) {
    var opts = options || {};
    var target = String(path || '/');
    if (target.charAt(0) !== '/') { target = '/' + target; }
    var nextHash = '#' + target;

    if (window.location.hash === nextHash && !opts.force) {
      return resolve();
    }
    if (opts.replace) {
      window.location.replace(window.location.pathname + window.location.search + nextHash);
      /* `replace` no dispara hashchange en algunos navegadores: se resuelve a mano */
      window.setTimeout(resolve, 0);
    } else {
      window.location.hash = nextHash;
    }
    return Promise.resolve();
  }

  function back(fallbackPath) {
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(fallbackPath || '/');
  }

  /* --------------------------------------------------------------------------
   * Resolución de la ruta actual: renderiza la vista y avisa del resultado
   * ------------------------------------------------------------------------ */
  function resolve() {
    var parsed = parseHash();
    var found = match(parsed.path);
    var token = ++navigationToken;

    var handler = found ? found.route.handler : notFoundHandler;
    var params = Object.assign({}, found ? found.params : {}, { query: parsed.query, path: parsed.path });

    currentRoute = parsed.path;
    currentParams = params;

    if (window.App && window.App.setLoading) { window.App.setLoading(true); }

    var result;
    try {
      result = handler ? handler(params) : null;
    } catch (error) {
      if (window.console) { window.console.error('[Adopta] Error al renderizar ' + parsed.path, error); }
      result = null;
    }

    /* Las vistas pueden ser síncronas (string) o asíncronas (Promise) */
    return Promise.resolve(result)
      .then(function (html) {
        if (token !== navigationToken) { return null; }   /* navegación superada */
        if (typeof html === 'string') { paint(html); }
        if (window.App && window.App.setLoading) { window.App.setLoading(false); }
        return html;
      })
      .catch(function (error) {
        if (window.console) { window.console.error('[Adopta] Vista con error', error); }
        if (window.App && window.App.setLoading) { window.App.setLoading(false); }
        paint(window.Views ? window.Views.error(error) : '<div class="empty"><h3>Ocurrió un error</h3></div>');
        return null;
      });
  }

  /* Pinta el HTML de la vista dentro del contenedor principal */
  function paint(html) {
    if (!container) { container = document.getElementById('vista'); }
    if (!container) { return; }
    container.innerHTML = html;
    container.setAttribute('tabindex', '-1');
    afterPaint();
  }

  /* Tareas posteriores al pintado: iconos, imágenes, foco y anuncio */
  function afterPaint() {
    window.Icon.inject(container);
    window.Media.hydrateImages(container);
    if (window.App && window.App.afterRender) { window.App.afterRender(); }
  }

  /* --------------------------------------------------------------------------
   * Arranque
   * ------------------------------------------------------------------------ */
  function start() {
    container = document.getElementById('vista');
    window.addEventListener('hashchange', resolve);
    if (!window.location.hash) {
      /* Sin hash inicial: se normaliza a #/ sin ensuciar el historial */
      window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/');
    }
    return resolve();
  }

  /* Ruta activa (para marcar la navegación) */
  function current() { return currentRoute || '/'; }

  /* ¿La ruta actual es "mascotas" o su detalle? Útil para el estado activo */
  function isWithin(basePath) {
    var path = current();
    if (basePath === '/') { return path === '/'; }
    return path === basePath || path.indexOf(basePath + '/') === 0;
  }

  window.Router = {
    register: register,
    fallback: fallback,
    start: start,
    navigate: navigate,
    back: back,
    resolve: resolve,
    current: current,
    currentParams: function () { return currentParams; },
    isWithin: isWithin,
    parseHash: parseHash
  };
})();

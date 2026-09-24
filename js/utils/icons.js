/* ============================================================================
 * icons.js — Set de iconos SVG inline
 * ----------------------------------------------------------------------------
 * Sin dependencias externas (nada de Font Awesome ni similar): cada icono es
 * un SVG en línea. Se evitan peticiones de red y se mantiene el control total
 * del grosor y color (los iconos heredan `currentColor`).
 *
 * Uso en el código:
 *   Icon.render('heart')                  -> string SVG
 *   Icon.inject();                        -> hidrata todos los [data-icon]
 * ========================================================================== */
(function () {
  'use strict';

  /* Cada entrada es el contenido interno de un <svg viewBox="0 0 24 24">.
   * Se usan trazos (stroke) para un look moderno y consistente. */
  var PATHS = {
    /* --- Navegación principal --- */
    home:
      '<path d="M3 10.6 12 3.5l9 7.1V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    heart:
      '<path d="M12 20.4S3.8 15.3 3.8 9.6A4.55 4.55 0 0 1 12 6.7a4.55 4.55 0 0 1 8.2 2.9c0 5.7-8.2 10.8-8.2 10.8z"/>',
    /* Icono de solicitudes: bandeja/documento (antes era una "chispa", poco clara) */
    clipboard:
      '<path d="M9 3.8h6a1 1 0 0 1 1 1V6H8V4.8a1 1 0 0 1 1-1z"/>' +
      '<path d="M8 6H6.8A1.8 1.8 0 0 0 5 7.8v11.4A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.8-1.8V7.8A1.8 1.8 0 0 0 17.2 6H16"/>' +
      '<path d="M8.5 11.5h7M8.5 15h4.5"/>',
    user:
      '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2c.9-3.7 3.8-5.6 7.2-5.6s6.3 1.9 7.2 5.6"/>',

    /* --- Acciones --- */
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.6 15.6 4.1 4.1"/>',
    filter: '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    chevronLeft: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevronRight: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    chevronDown: '<path d="M6 9.5 12 15.5l6-6"/>',
    arrowRight: '<path d="M4.5 12h14M13 6.5 18.5 12 13 17.5"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    check: '<path d="M5 12.8 9.5 17.3 19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.4 2.6 2.6 5-5.2"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2.1"/>',
    shield: '<path d="M12 3.7 5.5 6.2v5.1c0 4 2.8 7.3 6.5 8.9 3.7-1.6 6.5-4.9 6.5-8.9V6.2z"/><path d="m9.2 12 2 2 3.6-3.7"/>',
    sparkles: '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z"/><path d="M18.6 4v3M20 5.5h-3"/>',
    location: '<path d="M12 21s6.5-5.4 6.5-10.3A6.5 6.5 0 0 0 5.5 10.7C5.5 15.6 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>',
    calendar: '<rect x="4" y="5.6" width="16" height="14.4" rx="2.4"/><path d="M4 10.2h16M9 3.6v3.6M15 3.6v3.6"/>',
    scale: '<path d="M12 4.6v14.8M7 19.4h10"/><path d="M5 8.5h14M5 8.5 2.8 14h4.4zM19 8.5 16.8 14h4.4z"/>',
    cake: '<rect x="4" y="11" width="16" height="8.6" rx="2"/><path d="M4 15h16M12 7.6V11M8.6 8.4V11M15.4 8.4V11"/>',
    phone: '<path d="M6.2 3.8h3l1.5 3.7-2 1.4a11 11 0 0 0 5.4 5.4l1.4-2 3.7 1.5v3a2 2 0 0 1-2.2 2A15.4 15.4 0 0 1 4.2 6a2 2 0 0 1 2-2.2z"/>',
    mail: '<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="2.2"/><path d="m4.4 7.4 7.6 5.4 7.6-5.4"/>',
    share: '<circle cx="17.5" cy="6" r="2.6"/><circle cx="6.5" cy="12" r="2.6"/><circle cx="17.5" cy="18" r="2.6"/><path d="m8.9 10.8 6.3-3.4M8.9 13.2l6.3 3.4"/>',
    bell: '<path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.6 18h14.8z"/><path d="M10 20.6a2.2 2.2 0 0 0 4 0"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3.4v2.2M12 18.4v2.2M4.8 7.9l1.9 1.1M17.3 15l1.9 1.1M4.8 16.1l1.9-1.1M17.3 9l1.9-1.1"/>',
    logout: '<path d="M15 8.2V6.4A1.8 1.8 0 0 0 13.2 4.6H6.4A1.8 1.8 0 0 0 4.6 6.4v11.2a1.8 1.8 0 0 0 1.8 1.8h6.8a1.8 1.8 0 0 0 1.8-1.8v-1.8"/><path d="M9.8 12h10M16.4 8.6 19.8 12l-3.4 3.4"/>',
    moon: '<path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4z"/>',
    sun: '<circle cx="12" cy="12" r="4.1"/><path d="M12 2.6v2.3M12 19.1v2.3M4.1 4.1l1.6 1.6M18.3 18.3l1.6 1.6M2.6 12h2.3M19.1 12h2.3M4.1 19.9l1.6-1.6M18.3 5.7l1.6-1.6"/>',
    edit: '<path d="M16.7 4.3l3 3L9.2 17.8l-3.6.6.6-3.6z"/><path d="M4.5 20.4h15"/>',
    camera:
      '<path d="M4.6 8.4h2.6l1.3-2h7l1.3 2h2.6A1.6 1.6 0 0 1 21 10v8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 18v-8a1.6 1.6 0 0 1 1.6-1.6z"/><circle cx="12" cy="13.8" r="3.2"/>',
    trash: '<path d="M4.8 7.2h14.4M9.4 7.2V5.4h5.2v1.8M6.6 7.2 7.5 20h9l.9-12.8"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.9v.6"/>',
    paw:
      '<ellipse cx="7.3" cy="9.4" rx="2.1" ry="2.7"/><ellipse cx="16.7" cy="9.4" rx="2.1" ry="2.7"/>' +
      '<ellipse cx="11.1" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="15.4" cy="14.6" rx="4.6" ry="4.2"/>',
    dog:
      '<path d="M6.4 8.2 4.6 4.4a4.6 4.6 0 0 1 3.6 1.9M17.6 8.2l1.8-3.8a4.6 4.6 0 0 0-3.6 1.9"/><path d="M5.6 11.7A5.6 5.6 0 0 1 11.2 6h1.6a5.6 5.6 0 0 1 5.6 5.7c0 3.3-2.6 5.4-5.6 5.4h-1.6c-3 0-5.6-2.1-5.6-5.4z"/><path d="M10.4 11.6h.01M13.6 11.6h.01M11 14.4h2"/>',
    cat:
      '<path d="M6.4 9 5.2 4.6 9 6.6M17.6 9l1.2-4.4L15 6.6"/><path d="M5.4 12.4A6.6 6.6 0 0 1 12 6.2a6.6 6.6 0 0 1 6.6 6.2c0 3.6-2.8 5.8-6.6 5.8s-6.6-2.2-6.6-5.8z"/><path d="M9.6 12.2h.01M14.4 12.2h.01M12 14.4l-1 .8h2z"/>',
    rabbit:
      '<path d="M9.4 10.2c-.6-2.4-1-6 .6-6.4 1.4-.3 2 2.6 2.2 5.2M14.6 10.2c.6-2.4 1-6-.6-6.4-1.4-.3-2 2.6-2.2 5.2"/><path d="M6 14.4a6 6 0 0 1 12 0c0 3.2-2.7 5.2-6 5.2s-6-2-6-5.2z"/><path d="M10.2 13.8h.01M13.8 13.8h.01M12 16l-.9.8h1.8z"/>',
    other:
      '<circle cx="12" cy="12" r="8.6"/><path d="M8.6 13.6c1.9 2 4.9 2 6.8 0M9.6 10h.01M14.4 10h.01"/>',
    star: '<path d="m12 4 2.5 5.1 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z"/>',
    heartHand:
      '<path d="M12 20.4S3.8 15.3 3.8 9.6A4.55 4.55 0 0 1 12 6.7a4.55 4.55 0 0 1 8.2 2.9c0 5.7-8.2 10.8-8.2 10.8z"/>',
    empty:
      '<path d="M4.6 10.4 7 5.6h10l2.4 4.8v8a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M4.6 10.4h14.8M9.4 14.2h5.2"/>',
    lock: '<rect x="5.4" y="10.4" width="13.2" height="9.6" rx="2.2"/><path d="M8.6 10.4V8a3.4 3.4 0 0 1 6.8 0v2.4"/>',
    external: '<path d="M13.6 4.6h5.8v5.8M19.4 4.6 11 13"/><path d="M18 14.4v3.8A1.8 1.8 0 0 1 16.2 20H6.2A1.8 1.8 0 0 1 4.4 18.2V8.2A1.8 1.8 0 0 1 6.2 6.4h3.6"/>',
    wifi:
      '<path d="M4.4 9.4a11.4 11.4 0 0 1 15.2 0M7 12.6a7.6 7.6 0 0 1 10 0M9.6 15.8a3.8 3.8 0 0 1 4.8 0"/><path d="M12 19.2h.01"/>'
  };

  /* Trazos rellenos (fill) en lugar de contorno: dan un aire más cálido
   * a los corazones sólidos, estrellas y huellas. */
  var FILLED = { heartSolid: 'heart', starSolid: 'star', pawSolid: 'paw' };

  function render(name, options) {
    var opts = options || {};
    var key = String(name || '');
    var solid = !!opts.solid;

    var path = PATHS[key];
    if (key === 'heartSolid') { key = 'heart'; path = PATHS.heart; solid = true; }
    if (key === 'starSolid') { key = 'star'; path = PATHS.star; solid = true; }
    if (key === 'pawSolid') { key = 'paw'; path = PATHS.paw; solid = true; }
    if (!path) { path = PATHS.info; }

    var cls = 'icon' + (opts.className ? ' ' + opts.className : '');
    var style = opts.size ? ' style="width:' + opts.size + 'px;height:' + opts.size + 'px"' : '';
    var fill = solid ? 'currentColor' : 'none';
    var stroke = solid ? 'none' : 'currentColor';

    return (
      '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"' + style +
      ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (opts.strokeWidth || 1.7) +
      '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'
    );
  }

  /* Convierte <span data-icon="heart"></span> en el SVG correspondiente.
   * Se llama una vez al inicio y después de cada render de vista. */
  function inject(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-icon-ready') === '1') { continue; }
      var solid = el.getAttribute('data-icon-solid') === '1';
      el.innerHTML = render(el.getAttribute('data-icon'), { solid: solid });
      el.setAttribute('data-icon-ready', '1');
    }
  }

  window.Icon = { render: render, inject: inject, has: function (n) { return !!PATHS[n]; } };
})();

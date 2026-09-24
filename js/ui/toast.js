/* ============================================================================
 * toast.js — Notificaciones efímeras (no bloquean la interfaz)
 * Uso: Toast.show('Mensaje') · Toast.success('Guardado') · Toast.heart('Añadido a favoritos')
 * ========================================================================== */
(function () {
  'use strict';

  var DURATIONS = { success: 3200, info: 3600, error: 5000, heart: 2600 };
  var ICONS = { success: 'checkCircle', error: 'info', info: 'info', heart: 'heartSolid' };
  var active = [];

  function root() {
    var node = document.getElementById('toast-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'toast-root';
      node.className = 'toast-root';
      node.setAttribute('role', 'region');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    return node;
  }

  function dismiss(toast) {
    if (!toast || toast.getAttribute('data-closing') === '1') { return; }
    toast.setAttribute('data-closing', '1');
    toast.classList.add('is-out');
    window.setTimeout(function () {
      if (toast.parentNode) { toast.parentNode.removeChild(toast); }
      var index = active.indexOf(toast);
      if (index >= 0) { active.splice(index, 1); }
    }, 220);
  }

  /* variant: 'success' | 'error' | 'info' | 'heart'
   * title:   texto principal
   * message: línea secundaria opcional */
  function show(message, options) {
    var opts = options || {};
    var variant = opts.variant || 'info';
    var title = opts.title || '';
    var body = message || '';
    var duration = typeof opts.duration === 'number' ? opts.duration : (DURATIONS[variant] || 3200);

    /* Máximo 3 notificaciones simultáneas: se retira la más antigua */
    while (active.length >= 3) { dismiss(active[0]); }

    var html = window.Dom.h`
      <div class="toast toast--${variant}" role="status">
        <span class="toast__icon">${window.Dom.raw(window.Icon.render(ICONS[variant] || 'info', { solid: variant === 'heart' }))}</span>
        <span class="toast__text">
          ${title ? window.Dom.raw('<strong>' + window.Dom.escape(title) + '</strong>') : ''}
          ${body}
        </span>
        <button class="icon-btn toast__close" type="button" aria-label="Cerrar notificación">
          ${window.Dom.raw(window.Icon.render('close'))}
        </button>
      </div>`;

    var node = window.Dom.el(html);
    root().appendChild(node);
    active.push(node);

    node.querySelector('.toast__close').addEventListener('click', function () { dismiss(node); });

    var timer = window.setTimeout(function () { dismiss(node); }, duration);
    /* Pausa al pasar el cursor: el usuario puede leer sin prisa */
    node.addEventListener('mouseenter', function () { window.clearTimeout(timer); });
    node.addEventListener('mouseleave', function () {
      timer = window.setTimeout(function () { dismiss(node); }, 1400);
    });

    return node;
  }

  window.Toast = {
    show: function (message, options) { return show(message, options); },
    success: function (message, title) { return show(message, { variant: 'success', title: title }); },
    error: function (message, title) { return show(message, { variant: 'error', title: title }); },
    info: function (message, title) { return show(message, { variant: 'info', title: title }); },
    heart: function (message, title) { return show(message, { variant: 'heart', title: title }); },
    dismissAll: function () { active.slice().forEach(dismiss); }
  };
})();

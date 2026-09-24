/* ============================================================================
 * topbar.js — Comportamiento del encabezado superior
 * ----------------------------------------------------------------------------
 * La navegación de escritorio se renderiza desde `Nav` (ver tabbar.js); aquí
 * solo vive el estado visual del encabezado: sombra al hacer scroll, botón de
 * tema y sincronización de su icono.
 * ========================================================================== */
(function () {
  'use strict';

  var topbar = null;

  function updateScrolledState() {
    if (!topbar) { return; }
    topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  function updateThemeButton() {
    var button = document.getElementById('btn-theme');
    if (!button) { return; }
    var dark = window.State.get().theme === 'dark';
    button.innerHTML = window.Icon.render(dark ? 'sun' : 'moon');
    button.setAttribute('aria-label', dark ? 'Activar tema claro' : 'Activar tema oscuro');
    button.setAttribute('title', dark ? 'Tema claro' : 'Tema oscuro');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  function init() {
    topbar = document.getElementById('topbar');
    var button = document.getElementById('btn-theme');

    if (button) {
      button.addEventListener('click', function () {
        var theme = window.State.toggleTheme();
        window.Toast.show(theme === 'dark' ? 'Tema oscuro activado' : 'Tema claro activado', {
          variant: 'info',
          duration: 1800
        });
      });
    }

    window.addEventListener('scroll', updateScrolledState, { passive: true });
    updateScrolledState();
    updateThemeButton();
  }

  window.Topbar = {
    init: init,
    updateScrolledState: updateScrolledState,
    updateThemeButton: updateThemeButton
  };
})();

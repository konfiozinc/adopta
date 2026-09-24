/* ============================================================================
 * tabbar.js + topbar.js — Navegación compartida (se exportan juntas porque
 * ambas leen la misma definición de secciones y el mismo contador).
 * ========================================================================== */
(function () {
  'use strict';

  /* Secciones de la aplicación. El icono de "Solicitudes" es un portapapeles
   * (documento) en lugar de una chispa: comunica mejor "trámite enviado". */
  var SECTIONS = [
    { path: '/', label: 'Inicio', icon: 'home' },
    { path: '/mascotas', label: 'Mascotas', icon: 'heart' },
    { path: '/solicitudes', label: 'Solicitudes', icon: 'clipboard', badge: 'requests' },
    { path: '/cuenta', label: 'Cuenta', icon: 'user' }
  ];

  function badgeValue(kind) {
    if (kind === 'requests') {
      var count = window.State.activeRequestCount();
      return count > 0 ? String(count) : '';
    }
    return '';
  }

  /* --- Barra inferior (móvil) -------------------------------------------- */
  function renderTabbar() {
    var active = window.Router.current();

    var items = SECTIONS.map(function (section) {
      var isActive = section.path === '/' ? active === '/' : window.Router.isWithin(section.path);
      var badge = badgeValue(section.badge);

      return window.Dom.h`
        <a class="tab ${isActive ? 'is-active' : ''}"
           href="#${section.path}"
           data-tab="${section.path}"
           ${isActive ? window.Dom.raw('aria-current="page"') : ''}>
          ${window.Dom.raw(window.Icon.render(isActive && section.icon === 'heart' ? 'heartSolid' : section.icon))}
          <span>${section.label}</span>
          ${badge ? window.Dom.raw('<span class="tab__badge" data-badge="requests">' + badge + '</span>') : ''}
        </a>`;
    }).join('');

    var bar = document.getElementById('tabbar');
    if (bar) {
      bar.innerHTML = window.Dom.h`<div class="tabbar__inner">${window.Dom.raw(items)}</div>`;
    }
  }

  /* --- Navegación superior (tablet y escritorio) ------------------------ */
  function renderTopnav() {
    var active = window.Router.current();

    var links = SECTIONS.map(function (section) {
      var isActive = section.path === '/' ? active === '/' : window.Router.isWithin(section.path);
      var badge = badgeValue(section.badge);

      return window.Dom.h`
        <a class="topnav__link ${isActive ? 'is-active' : ''}"
           href="#${section.path}"
           data-topnav="${section.path}"
           ${isActive ? window.Dom.raw('aria-current="page"') : ''}>
          ${window.Dom.raw(window.Icon.render(section.icon))}
          <span>${section.label}</span>
          ${badge ? window.Dom.raw('<span class="topnav__badge" data-badge="requests">' + badge + '</span>') : ''}
        </a>`;
    }).join('');

    var nav = document.getElementById('topnav');
    if (nav) { nav.innerHTML = links; }
  }

  /* Refresca el contador de solicitudes sin repintar toda la navegación */
  function refreshBadges() {
    var value = badgeValue('requests');
    window.Dom.qsa('[data-badge="requests"]').forEach(function (node) {
      if (value) {
        node.textContent = value;
        node.hidden = false;
      } else {
        node.remove();
      }
    });
  }

  /* Refresca el avatar del encabezado cuando cambia el perfil */
  function refreshAvatar() {
    var user = window.State.get().user;
    var node = document.getElementById('topbar-avatar');
    if (!node) { return; }
    if (user && user.avatar) {
      node.innerHTML = window.Dom.h`<img src="${user.avatar}" alt="">`;
    } else {
      node.textContent = window.Format.initials(user ? user.name : '');
    }
    node.setAttribute('aria-label', user ? 'Cuenta de ' + user.name : 'Mi cuenta');
  }

  function renderAll() {
    renderTopnav();
    renderTabbar();
    refreshAvatar();
  }

  window.Nav = {
    sections: SECTIONS,
    render: renderAll,
    renderTopnav: renderTopnav,
    renderTabbar: renderTabbar,
    refreshBadges: refreshBadges,
    refreshAvatar: refreshAvatar
  };
})();

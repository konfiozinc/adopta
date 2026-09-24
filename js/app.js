/* ============================================================================
 * app.js — Arranque, enrutado global y comportamientos compartidos
 * ----------------------------------------------------------------------------
 * Responsabilidades:
 *   1. Registrar las rutas y montar las vistas
 *   2. Interceptar las acciones globales (favoritos, adopción, navegación)
 *   3. Gestionar la pantalla de carga, el scroll y el foco entre vistas
 *   4. Atajos de teclado, sincronización entre pestañas y registro del service
 *      worker opcional
 * ========================================================================== */
(function () {
  'use strict';

  var bootTime = Date.now();
  var SPLASH_MIN_MS = 1600;    /* tiempo mínimo visible de la pantalla de carga */
  var SPLASH_MAX_MS = 3000;    /* tiempo máximo solicitado en el diseño */

  /* ==========================================================================
     1. RUTAS
     ========================================================================== */
  function registerRoutes() {
    function page(name) {
      return function (params) {
        var view = window.Views[name];
        var mountScope = { teardown: null };

        /* Se limpia la vista anterior antes de construir la nueva */
        var result = view.render(params);

        /* El montaje se difiere hasta que el HTML esté en el DOM */
        window.App.pendingMount = { name: name, params: params, scope: mountScope };
        return result;
      };
    }

    window.Router.register('/', page('home'));
    window.Router.register('/mascotas', page('pets'));
    window.Router.register('/mascotas/:id', page('pet-detail'));
    window.Router.register('/solicitudes', page('requests'));
    window.Router.register('/cuenta', page('account'));

    window.Router.fallback(function () {
      window.A11y.setTitle('Página no encontrada');
      return window.Dom.h`
        <div class="empty" style="margin-top:var(--s-10)">
          <span class="empty__art">${window.Dom.raw(window.Icon.render('search'))}</span>
          <h3>Esta página no existe</h3>
          <p>El enlace puede estar roto o la sección cambió de dirección. Te llevamos de vuelta.</p>
          <div class="empty__actions">
            <a class="btn btn--primary" href="#/">${window.Dom.raw(window.Icon.render('home'))} Ir al inicio</a>
            <a class="btn btn--ghost" href="#/mascotas">Ver mascotas</a>
          </div>
        </div>`;
    });
  }

  /* ==========================================================================
     2. CICLO DE VIDA ENTRE VISTAS
     ========================================================================== */

  /* Se ejecuta tras cada pintado del router (ver router.js → afterPaint).
   * El montaje pendiente se lee siempre desde `window.App.pendingMount`, porque
   * lo registra el envoltorio de ruta y se consume en la microtarea siguiente. */
  function afterRender() {
    var pending = window.App.pendingMount;

    /* Foco y anuncio: cada cambio de vista se comunica a lectores de pantalla */
    var heading = window.Dom.qs('h1, h2, h3', window.Dom.qs('#vista'));
    window.A11y.focus(heading || window.Dom.qs('#vista'));

    /* Montaje de la vista: aquí se registran los listeners concretos */
    if (pending) {
      var view = window.Views[pending.name];
      var root = window.Dom.qs('#vista');
      var scope = pending.scope;

      window.App.pendingMount = null;

      /* Se limpia el montaje anterior antes de montar el nuevo */
      if (scope && typeof scope.teardown === 'function') {
        try { scope.teardown(); } catch (error) { /* noop */ }
      }

      if (view && typeof view.mount === 'function') {
        /* La vista registra sus limpiezas en este contenedor aislado */
        window.Views.setScope(scope);
        try {
          view.mount(root, pending.params);
        } catch (error) {
          if (window.console) { window.console.error('[Adopta] Error al montar la vista', error); }
        }
      }
    }

    /* Navegación activa, títulos y contadores siempre sincronizados */
    window.Nav.render();
  }

  function setLoading(isLoading) {
    /* Reservado para un indicador global de carga. Hoy las vistas usan
       esqueletos propios, así que solo se documenta el punto de extensión. */
    if (window.console && isLoading === undefined) { return; }
  }

  /* ==========================================================================
     3. ACCIONES GLOBALES (delegación en el documento)
     ========================================================================== */
  function wireGlobalActions() {
    document.addEventListener('click', function (event) {
      /* --- Favoritos: funciona en tarjetas, galería, listas y cuenta --- */
      var favButton = event.target.closest('[data-fav]');
      if (favButton) {
        var petId = favButton.getAttribute('data-fav');
        var added = window.State.toggleFavorite(petId);
        var pet = window.Repository._sync.getPet(petId);
        var name = pet ? pet.name : 'la mascota';

        /* Feedback inmediato y accesible */
        favButton.classList.toggle('is-active', added);
        favButton.classList.add('is-pop');
        favButton.setAttribute('aria-pressed', added ? 'true' : 'false');
        favButton.setAttribute('aria-label', added
          ? 'Quitar ' + name + ' de favoritos'
          : 'Guardar ' + name + ' en favoritos');
        favButton.innerHTML = window.Icon.render(added ? 'heartSolid' : 'heart');
        window.setTimeout(function () { favButton.classList.remove('is-pop'); }, 460);

        window.Toast.heart(added
          ? name + ' está en tus favoritos'
          : name + ' salió de tus favoritos');

        window.Nav.refreshBadges();
        window.A11y.announce(added ? name + ' guardada en favoritos' : name + ' eliminada de favoritos');
        return;
      }

      /* --- Abrir el flujo de adopción --- */
      var adoptButton = event.target.closest('[data-action="adopt"]');
      if (adoptButton) {
        event.preventDefault();
        var targetPet = window.Repository._sync.getPet(adoptButton.getAttribute('data-pet'));
        if (!targetPet) { return; }
        if (window.State.getRequestForPet(targetPet.id)) {
          window.Toast.info('Ya tienes una solicitud en curso para ' + targetPet.name, 'Solicitud existente');
          return;
        }
        window.AdoptionForm.open(targetPet);
        return;
      }

      /* --- Navegación interna (evita recargar la página) --- */
      var navLink = event.target.closest('[data-nav]');
      if (navLink && navLink.tagName === 'A') {
        var href = navLink.getAttribute('href') || '';
        if (href.indexOf('#/') === 0) {
          event.preventDefault();
          window.Router.navigate(href.slice(1));
          return;
        }
      }

      /* --- Volver a la vista anterior --- */
      var backLink = event.target.closest('[data-action="back"]');
      if (backLink) {
        event.preventDefault();
        if (document.referrer && document.referrer.indexOf(window.location.origin) === 0) {
          window.history.back();
        } else {
          window.Router.navigate('/mascotas');
        }
        return;
      }

      /* --- Limpiar filtros desde el estado vacío de Inicio --- */
      var clearHome = event.target.closest('[data-action="clear-filters-home"]');
      if (clearHome) {
        window.State.resetFilters();
        window.Router.navigate('/', { force: true });
        return;
      }

      /* --- Funciones aún no disponibles (app móvil, etc.) --- */
      var soon = event.target.closest('[data-action="coming-soon"]');
      if (soon) {
        var label = soon.getAttribute('data-label') || 'Esta función';
        window.Toast.info(label + ' llegará muy pronto. Mientras tanto, sigue explorando desde el navegador.');
      }
    });

    /* Enlaces del encabezado y la barra inferior: navegación suave */
    document.addEventListener('click', function (event) {
      var hashLink = event.target.closest('a[href^="#/"]');
      if (!hashLink) { return; }
      /* El router escucha hashchange: basta con cerrar overlays abiertos */
      if (window.Modal.isOpen()) { window.Modal.closeAll(); }
    });
  }

  /* ==========================================================================
     4. ATAJOS DE TECLADO
     ========================================================================== */
  function wireShortcuts() {
    document.addEventListener('keydown', function (event) {
      /* Escape cierra modales (el <dialog> nativo ya lo hace) y sugerencias */
      if (event.key === 'Escape' && !window.Modal.isOpen()) {
        var suggest = window.Dom.qs('.suggest');
        if (suggest && suggest.parentNode) { suggest.parentNode.removeChild(suggest); }
        return;
      }

      /* "/" enfoca el buscador de la vista, como en muchos catálogos */
      if (event.key === '/' && !/input|textarea|select/i.test(event.target.tagName)) {
        var search = window.Dom.qs('[data-search-input]');
        if (search) {
          event.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }

      /* Atajos con Alt: navegación rápida sin ratón */
      if (!event.altKey || event.ctrlKey || event.metaKey) { return; }
      var map = { h: '/', m: '/mascotas', s: '/solicitudes', c: '/cuenta' };
      var target = map[event.key.toLowerCase()];
      if (target) {
        event.preventDefault();
        window.Router.navigate(target);
      }
    });
  }

  /* ==========================================================================
     5. SINCRONIZACIÓN ENTRE PESTAÑAS
     ========================================================================== */
  function wireCrossTabSync() {
    window.addEventListener('storage', function (event) {
      if (!event.key || event.key.indexOf(window.Storage.namespace) !== 0) { return; }
      window.Toast.info('Actualizamos los datos: cambiaste algo en otra pestaña', 'Sincronizando');
      /* Recarga la vista para reflejar el estado más reciente del almacenamiento */
      window.Router.resolve();
      window.Nav.render();
    });
  }

  /* ==========================================================================
     6. PANTALLA DE CARGA
     ========================================================================== */
  function hideSplash() {
    var splash = document.getElementById('splash');
    if (!splash || splash.classList.contains('is-hidden')) { return; }
    splash.classList.add('is-hidden');
    window.setTimeout(function () {
      if (splash.parentNode) { splash.parentNode.removeChild(splash); }
    }, 520);
  }

  function setupSplash() {
    var splash = document.getElementById('splash');
    if (!splash) { return; }

    var elapsed = Date.now() - bootTime;
    var wait = Math.max(0, SPLASH_MIN_MS - elapsed);

    window.setTimeout(hideSplash, Math.min(wait, SPLASH_MAX_MS));

    /* El usuario puede saltarla con un clic, una tecla o un toque */
    var skip = function () { hideSplash(); };
    splash.addEventListener('click', skip);
    document.addEventListener('keydown', skip, { once: true });
  }

  /* ==========================================================================
     7. ARRANQUE
     ========================================================================== */
  function boot() {
    /* Marca de arranque: útil para pruebas automáticas y depuración */
    window.__BOOT = {
      at: new Date().toISOString(),
      splashVisible: !!document.getElementById('splash') &&
        !document.getElementById('splash').classList.contains('is-hidden')
    };

    /* Navegación y encabezado */
    window.Nav.render();
    window.Topbar.init();

    /* Estado inicial anunciado en consola: útil para depurar la demo */
    if (window.console) {
      var pets = window.Repository.speciesCounts().todos;
      window.console.info(
        '%c Adopta %c demo lista · ' + pets + ' mascotas · estado en localStorage (' + window.Storage.namespace + ') ',
        'background:#FF6B35;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:700',
        'background:#2D2A28;color:#FFF4EE;border-radius:0 4px 4px 0;padding:2px 6px'
      );
    }

    registerRoutes();
    wireGlobalActions();
    wireShortcuts();
    wireCrossTabSync();

    /* Suscripción global: mantiene la navegación coherente con el estado */
    window.State.subscribe(function (state, event) {
      if (!event) { return; }
      if (event.type === 'favorites:toggle' || event.type === 'requests:create' ||
          event.type === 'requests:cancel' || event.type === 'user:update') {
        window.Nav.refreshBadges();
        window.Nav.refreshAvatar();
      }
      if (event.type === 'theme:change') { window.Topbar.updateThemeButton(); }
    });

    /* Primera resolución de ruta y retirada de la pantalla de carga */
    window.Router.start().then(function () {
      setupSplash();
    }).catch(function (error) {
      if (window.console) { window.console.error('[Adopta] Fallo al iniciar el router', error); }
      setupSplash();
    });

    /* Precarga de las imágenes más probables: hace que el catálogo se sienta
       instantáneo en la segunda visita. */
    window.Media.preload(
      window.Repository._sync.featuredPets(4).map(function (pet) { return pet.cover; }),
      600
    );
  }

  /* API pública para el resto de módulos */
  window.App = {
    boot: boot,
    afterRender: afterRender,
    setLoading: setLoading,
    refreshNavigation: function () {
      window.Nav.refreshBadges();
      window.Nav.refreshAvatar();
    },
    pendingMount: null,
    version: '1.0.0'
  };

  /* Arranque cuando el DOM esté listo (los scripts van al final del body) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

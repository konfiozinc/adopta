/* ============================================================================
 * requests.js — Seguimiento de solicitudes de adopción
 * ----------------------------------------------------------------------------
 * Lista todas las solicitudes con su estado, línea de tiempo del proceso, nota
 * del refugio y acciones disponibles (ver ficha, cancelar). Incluye el estado
 * vacío solicitado: "Aún no has enviado ninguna solicitud".
 * ========================================================================== */
(function () {
  'use strict';

  var FILTER_KEY = 'requestsFilter';

  function header(groups) {
    return window.Dom.h`
      <div class="catalog__head reveal" style="--i:0">
        <div class="catalog__title">
          <h1>Mis solicitudes</h1>
          <span class="catalog__count">${window.Format.plural(groups.todas, 'solicitud')}</span>
        </div>
        <p style="margin-top:var(--s-2);font-size:var(--fs-md)">
          Sigue aquí cada paso: desde que el refugio recibe tu solicitud hasta la visita para conocer a tu compañero.
        </p>
      </div>`;
  }

  /* Resumen del proceso con contadores por estado */
  function summary(groups) {
    return window.Dom.h`
      <div class="stats reveal" style="--i:1;margin-bottom:var(--s-6)">
        ${window.Dom.raw(window.Cards.statCard(groups.pendiente, 'Pendientes'))}
        ${window.Dom.raw(window.Cards.statCard(groups.revision, 'En revisión'))}
        ${window.Dom.raw(window.Cards.statCard(groups.aprobada, 'Aprobadas'))}
      </div>`;
  }

  function emptyState(hasAny) {
    if (hasAny) {
      return window.Dom.h`
        <div class="empty">
          <span class="empty__art">${window.Dom.raw(window.Icon.render('filter'))}</span>
          <h3>No hay solicitudes con ese estado</h3>
          <p>Prueba con otro filtro para ver el resto de tu historial.</p>
          <div class="empty__actions">
            <button class="btn btn--ghost" type="button" data-filter-status="todas">
              Ver todas las solicitudes
            </button>
          </div>
        </div>`;
    }

    return window.Dom.h`
      <div class="empty">
        <span class="empty__art">${window.Dom.raw(window.Icon.render('clipboard'))}</span>
        <h3>Aún no has enviado ninguna solicitud</h3>
        <p>
          Cuando encuentres a tu compañero, envía una solicitud desde su ficha y podrás seguir
          aquí todo el proceso: revisión, entrevista y aprobación.
        </p>
        <div class="empty__actions">
          <a class="btn btn--primary" href="#/mascotas">
            ${window.Dom.raw(window.Icon.render('pawSolid'))} Explorar mascotas
          </a>
          <a class="btn btn--ghost" href="#/cuenta">Ver mis favoritos</a>
        </div>
      </div>`;
  }

  function list(requests, allRequests) {
    if (!requests.length) { return emptyState(allRequests.length > 0); }

    return window.Dom.h`
      <div class="req-list">
        ${window.Dom.raw(requests.map(function (request) {
          return window.Cards.requestCard(request);
        }).join(''))}
      </div>`;
  }

  function body(filter) {
    var all = window.State.get().requests;
    var groups = window.State.requestsByStatus();
    var requests = filter === 'todas'
      ? all
      : all.filter(function (request) { return request.status === filter; });

    return window.Dom.h`
      <div id="requests-body">
        ${window.Dom.raw(window.Cards.statusChips(groups, filter))}
        <div style="margin-top:var(--s-5)">
          ${window.Dom.raw(list(requests, all))}
        </div>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Vista
   * ------------------------------------------------------------------------ */
  function view() {
    var groups = window.State.requestsByStatus();
    var filter = window.Storage.get(FILTER_KEY, 'todas');
    window.A11y.setTitle('Mis solicitudes');

    return window.Dom.h`
      <div id="requests-root">
        ${window.Dom.raw(header(groups))}
        ${window.Dom.raw(summary(groups))}
        ${window.Dom.raw(body(filter))}
        ${window.Dom.raw(window.Cards.demoNote(
          'Las solicitudes de esta demo viven en tu navegador. Al conectar un backend, este historial se sincronizará con el refugio.',
          'info'
        ))}
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Montaje
   * ------------------------------------------------------------------------ */
  function mount(root) {
    if (!root) { return; }

    function repaint() {
      var filter = window.Storage.get(FILTER_KEY, 'todas');
      var host = document.getElementById('requests-root');
      if (!host) { return; }
      var groups = window.State.requestsByStatus();
      host.innerHTML = header(groups) + summary(groups) + body(filter) +
        window.Cards.demoNote('Las solicitudes de esta demo viven en tu navegador. Al conectar un backend, este historial se sincronizará con el refugio.', 'info');
      window.Icon.inject(host);
      window.Media.hydrateImages(host);
    }

    function onClick(event) {
      var statusChip = event.target.closest('[data-filter-status]');
      if (statusChip) {
        var status = statusChip.getAttribute('data-filter-status');
        window.Storage.set(FILTER_KEY, status);
        repaint();
        return;
      }

      var cancelButton = event.target.closest('[data-cancel-request]');
      if (cancelButton) {
        var id = cancelButton.getAttribute('data-cancel-request');
        window.Modal.confirm(
          'Al cancelar, el refugio dejará de revisar tu solicitud. Podrás volver a enviarla cuando quieras.',
          { title: '¿Cancelar esta solicitud?', confirmLabel: 'Sí, cancelar', cancelLabel: 'Mantener', danger: true }
        ).then(function (confirmed) {
          if (!confirmed) { return; }
          window.State.cancelRequest(id);
          window.App.refreshNavigation();
          repaint();
          window.Toast.info('La solicitud quedó cancelada', 'Solicitud actualizada');
        });
      }
    }

    root.addEventListener('click', onClick);

    var unsubscribe = window.State.subscribe(function (state, event) {
      if (!event) { return; }
      if (event.type === 'requests:create' || event.type === 'requests:cancel') { repaint(); }
      if (event.type === 'demo:reset') { window.Router.resolve(); }
    });

    window.Views.onLeave(function () {
      root.removeEventListener('click', onClick);
      unsubscribe();
    });
  }

  window.Views = window.Views || {};
  window.Views.requests = { render: view, mount: mount };
})();

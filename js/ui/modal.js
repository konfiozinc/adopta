/* ============================================================================
 * modal.js — Modales y hojas inferiores accesibles
 * ----------------------------------------------------------------------------
 * Se usa el elemento nativo <dialog> con `showModal()`, que ya aporta:
 *   · foco atrapado dentro del diálogo
 *   · cierre con la tecla Escape
 *   · capa superior (::backdrop) y semántica ARIA correcta
 * Encima se añade: bloqueo de scroll, cierre al pulsar el fondo, animación de
 * salida y liberación de listeners.
 * ========================================================================== */
(function () {
  'use strict';

  var openDialogs = [];

  function root() {
    var node = document.getElementById('modal-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'modal-root';
      document.body.appendChild(node);
    }
    return node;
  }

  /* --------------------------------------------------------------------------
   * open({ title, subtitle, body, footer, size, onMount, onClose, initialFocus })
   * body y footer aceptan HTML ya construido con Dom.h (se marca como confiable
   * explícitamente porque proviene de nuestras plantillas).
   * ------------------------------------------------------------------------ */
  function open(options) {
    var opts = options || {};

    var html = window.Dom.h`
      <dialog class="overlay" aria-labelledby="modal-title">
        <div class="modal ${opts.size === 'wide' ? 'modal--wide' : ''}" role="document">
          <div class="modal__grab" aria-hidden="true"></div>
          <header class="modal__head">
            <div>
              <h2 class="modal__title" id="modal-title">${opts.title || ''}</h2>
              ${opts.subtitle ? window.Dom.raw('<p class="modal__sub">' + window.Dom.escape(opts.subtitle) + '</p>') : ''}
            </div>
            <button class="icon-btn modal__close" type="button" data-modal-close aria-label="Cerrar ventana">
              ${window.Dom.raw(window.Icon.render('close'))}
            </button>
          </header>
          <div class="modal__body">${window.Dom.raw(opts.body || '')}</div>
          ${opts.footer ? window.Dom.raw('<footer class="modal__foot">' + opts.footer + '</footer>') : ''}
        </div>
      </dialog>`;

    var dialog = window.Dom.el(html);
    root().appendChild(dialog);

    var released = false;
    var releaseTrap = null;

    function close(result) {
      if (released) { return; }
      released = true;

      if (releaseTrap) { releaseTrap(); }
      window.A11y.unlockScroll();
      dialog.classList.add('is-closing');

      window.setTimeout(function () {
        try { if (dialog.open) { dialog.close(); } } catch (error) { /* noop */ }
        if (dialog.parentNode) { dialog.parentNode.removeChild(dialog); }
        var index = openDialogs.indexOf(dialog);
        if (index >= 0) { openDialogs.splice(index, 1); }
        if (typeof opts.onClose === 'function') { opts.onClose(result); }
      }, 180);
    }

    /* Cierre al pulsar el fondo (fuera de la tarjeta del modal) */
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) { close(null); }
    });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();     /* se gestiona con nuestra animación */
      close(null);
    });
    window.Dom.qs('[data-modal-close]', dialog).addEventListener('click', function () { close(null); });

    /* El contenido siempre puede pedir el cierre o la apertura de otro modal */
    dialog.addEventListener('adopta:close', function () { close(null); });

    try {
      dialog.showModal();
    } catch (error) {
      dialog.setAttribute('open', 'open');
    }

    window.A11y.lockScroll();
    releaseTrap = window.A11y.trapFocus(dialog, { initialFocus: opts.initialFocus || null });
    openDialogs.push(dialog);

    window.Icon.inject(dialog);
    window.Media.hydrateImages(dialog);

    if (typeof opts.onMount === 'function') { opts.onMount(dialog, close); }

    return { dialog: dialog, close: close };
  }

  function confirm(message, options) {
    var opts = options || {};
    return new Promise(function (resolve) {
      var settled = false;
      var handle = open({
        title: opts.title || '¿Confirmas la acción?',
        body: window.Dom.h`<p>${message}</p>`,
        footer: window.Dom.h`
          <button class="btn btn--ghost grow" type="button" data-confirm-no>${opts.cancelLabel || 'Cancelar'}</button>
          <button class="btn ${opts.danger ? 'btn--danger' : 'btn--primary'} grow" type="button" data-confirm-yes>
            ${opts.confirmLabel || 'Confirmar'}
          </button>`,
        onMount: function (dialog, close) {
          window.Dom.qs('[data-confirm-no]', dialog).addEventListener('click', function () {
            settled = true; close(false); resolve(false);
          });
          window.Dom.qs('[data-confirm-yes]', dialog).addEventListener('click', function () {
            settled = true; close(true); resolve(true);
          });
        },
        onClose: function () { if (!settled) { resolve(false); } }
      });
      return handle;
    });
  }

  function closeAll() {
    openDialogs.slice().forEach(function (dialog) {
      var event = new CustomEvent('adopta:close');
      dialog.dispatchEvent(event);
    });
  }

  window.Modal = {
    open: open,
    confirm: confirm,
    closeAll: closeAll,
    isOpen: function () { return openDialogs.length > 0; }
  };
})();

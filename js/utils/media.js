/* ============================================================================
 * media.js — Imágenes: carga diferida, esqueleto y respaldo sin conexión
 * ----------------------------------------------------------------------------
 * Las fotos se sirven desde Unsplash (CDN público). Si una imagen tarda o
 * falla, se muestra un degradado cálido con la inicial de la mascota en lugar
 * de un icono roto. Nunca se rompe el diseño.
 * ========================================================================== */
(function () {
  'use strict';

  /* Degradados de respaldo, en la misma gama cálida de la marca */
  var FALLBACK_GRADIENTS = [
    'linear-gradient(135deg,#FF8C42,#F2542D)',
    'linear-gradient(135deg,#FFA07A,#FF6B35)',
    'linear-gradient(135deg,#F4A261,#E76F51)',
    'linear-gradient(135deg,#FFB4A2,#E5989B)',
    'linear-gradient(135deg,#FFC08A,#FF8C42)',
    'linear-gradient(135deg,#E9A23B,#D98324)',
    'linear-gradient(135deg,#2A9D8F,#21867A)',
    'linear-gradient(135deg,#7A9E9F,#4F6D7A)'
  ];

  /* Hash simple y estable: la misma mascota siempre recibe el mismo color */
  function hash(text) {
    var str = String(text || '');
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function gradientFor(seed) {
    return FALLBACK_GRADIENTS[hash(seed) % FALLBACK_GRADIENTS.length];
  }

  /* --------------------------------------------------------------------------
   * URL de una foto
   * ------------------------------------------------------------------------ */
  /* Las fotos del catálogo original son ids de Unsplash (p. ej. "1552053831-…").
   * Las mascotas migradas del sistema fuente usan imágenes locales del proyecto
   * (p. ej. "images/mascota-02-shadow.png"): esas rutas se devuelven tal cual. */
  function isUnsplashId(id) {
    return /^\d[\d-]*$/.test(String(id == null ? '' : id));
  }

  function photoUrl(id, width, height) {
    if (!isUnsplashId(id)) { return String(id); }
    var w = width || 800;
    var base = 'https://images.unsplash.com/photo-' + id +
      '?auto=format&fit=crop&q=72&w=' + w;
    if (height) { base += '&h=' + height; }
    return base;
  }

  /* srcset para pantallas de alta densidad (solo para ids de Unsplash) */
  function srcset(id, width) {
    if (!isUnsplashId(id)) { return ''; }
    var w = width || 800;
    return [
      photoUrl(id, Math.round(w * 0.6)) + ' 600w',
      photoUrl(id, w) + ' 800w',
      photoUrl(id, Math.round(w * 1.6)) + ' 1200w'
    ].join(', ');
  }

  /* --------------------------------------------------------------------------
   * Render de una imagen "segura":
   *   - contenedor con esqueleto animado mientras carga
   *   - respaldo con degradado + inicial si la red falla
   *   - aparición suave al terminar la carga
   * Uso: Media.portrait({ id, alt, name, sizes, eager })
   * ------------------------------------------------------------------------ */
  function portrait(options) {
    var opts = options || {};
    var id = opts.id;
    var name = opts.name || '';
    var alt = opts.alt || name;
    var width = opts.width || 800;
    var cls = opts.className || 'pet-card__img';
    var eager = !!opts.eager;

    if (!id) {
      return window.Dom.raw(
        '<div class="img-fallback" style="background:' + gradientFor(name) + '">' +
        '<span class="img-fallback__initial">' + window.Dom.escape(window.Format.initials(name)) + '</span>' +
        '</div>'
      );
    }

    var loading = eager ? 'eager' : 'lazy';
    var priority = eager ? ' fetchpriority="high"' : '';

    var img;
    if (isUnsplashId(id)) {
      img = '<img class="' + cls + '" src="' + photoUrl(id, width) + '"' +
        ' srcset="' + srcset(id, width) + '"' +
        ' sizes="' + (opts.sizes || '(max-width: 640px) 45vw, 300px') + '"' +
        ' alt="' + window.Dom.escape(alt) + '"' +
        ' loading="' + loading + '" decoding="async"' + priority + '>';
    } else {
      /* Imagen local del proyecto: ruta directa, sin CDN ni srcset */
      img = '<img class="' + cls + '" src="' + window.Dom.escape(String(id)) + '"' +
        ' alt="' + window.Dom.escape(alt) + '"' +
        ' loading="' + loading + '" decoding="async"' + priority + '>';
    }

    return window.Dom.raw(
      '<span class="img-skeleton" aria-hidden="true"></span>' +
      img +
      '<span class="img-fallback" hidden aria-hidden="true"' +
      ' style="background:' + gradientFor(name) + '">' +
      '<span class="img-fallback__initial">' + window.Dom.escape(window.Format.initials(name)) + '</span>' +
      '</span>'
    );
  }

  /* --------------------------------------------------------------------------
   * Conecta los eventos de carga/error de todas las imágenes pendientes.
   * Se llama después de cada render de vista.
   * ------------------------------------------------------------------------ */
  function hydrateImages(root) {
    var scope = root || document;
    var images = window.Dom.qsa('img[src]', scope);

    images.forEach(function (img) {
      if (img.getAttribute('data-media-ready') === '1') { return; }
      img.setAttribute('data-media-ready', '1');

      var fallback = img.parentElement ? window.Dom.qs('.img-fallback', img.parentElement) : null;
      var skeleton = img.parentElement ? window.Dom.qs('.img-skeleton', img.parentElement) : null;

      function showImage() {
        img.classList.add('is-loaded');
        img.style.opacity = '';
        if (skeleton) { skeleton.remove(); }
      }

      function showFallback() {
        if (skeleton) { skeleton.remove(); }
        img.style.display = 'none';
        if (fallback) { fallback.hidden = false; }
      }

      if (img.complete && img.naturalWidth > 0) {
        showImage();
      } else if (img.complete && img.naturalWidth === 0) {
        showFallback();
      } else {
        img.addEventListener('load', showImage, { once: true });
        img.addEventListener('error', showFallback, { once: true });
        /* Red lenta: si en 9 s no cargó, mostramos el respaldo cálido */
        window.setTimeout(function () {
          if (!img.classList.contains('is-loaded') && !img.complete) {
            /* Se deja el esqueleto: puede seguir cargando en segundo plano */
          }
        }, 9000);
      }
    });
  }

  /* Precarga las primeras N imágenes para que el listado se sienta instantáneo */
  function preload(ids, width) {
    (ids || []).filter(isUnsplashId).slice(0, 6).forEach(function (id) {
      var img = new Image();
      img.decoding = 'async';
      img.src = photoUrl(id, width || 600);
    });
  }

  window.Media = {
    photoUrl: photoUrl,
    srcset: srcset,
    portrait: portrait,
    hydrateImages: hydrateImages,
    preload: preload,
    gradientFor: gradientFor
  };
})();

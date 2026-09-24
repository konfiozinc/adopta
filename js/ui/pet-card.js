/* ============================================================================
 * pet-card.js — Tarjetas de mascota (catálogo, destacados, miniaturas)
 * ----------------------------------------------------------------------------
 * Un único lugar para construir tarjetas garantiza que el catálogo, el
 * carrusel de destacados y las recomendaciones se vean coherentes y compartan
 * el mismo comportamiento (favoritos, navegación por teclado, respaldo de
 * imágenes).
 * ========================================================================== */
(function () {
  'use strict';

  /* --- Tarjeta estándar del catálogo ------------------------------------ */
  function card(pet, options) {
    var opts = options || {};
    var favorite = window.State.isFavorite(pet.id);
    var index = typeof opts.index === 'number' ? opts.index : 0;

    var tag = (pet.tags && pet.tags[0]) || pet.speciesLabel;

    return window.Dom.h`
      <article class="pet-card" style="--i:${index}">
        <a class="pet-card__media" href="#/mascotas/${pet.id}"
           data-nav="${pet.id}"
           aria-label="${pet.name}, ${pet.breed} — ver ficha completa de adopción">
          ${window.Media.portrait({
            id: pet.cover,
            name: pet.name,
            alt: pet.name + ', ' + pet.breed + ' en adopción',
            width: opts.imageWidth || 700,
            className: 'pet-card__img',
            sizes: opts.sizes || '(max-width: 640px) 46vw, (max-width: 1080px) 30vw, 260px'
          })}
          <span class="badge badge--glass badge--float">${tag}</span>
        </a>

        <button class="fab pet-card__fav ${favorite ? 'is-active' : ''}"
                type="button"
                data-fav="${pet.id}"
                aria-pressed="${favorite ? 'true' : 'false'}"
                aria-label="${favorite ? 'Quitar ' + pet.name + ' de favoritos' : 'Guardar ' + pet.name + ' en favoritos'}"
                title="${favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
          ${window.Dom.raw(window.Icon.render(favorite ? 'heartSolid' : 'heart'))}
        </button>

        <div class="pet-card__body">
          <h3 class="pet-card__name">
            ${pet.name}
            <span class="sex" title="${pet.sexLabel}">${window.Dom.raw(window.Icon.render(pet.sex === 'hembra' ? 'heart' : 'paw'))}</span>
          </h3>
          <p class="pet-card__breed truncate">${pet.breed}</p>
          <div class="pet-card__meta">
            <span class="pill">${window.Dom.raw(window.Icon.render('cake'))}${pet.ageLabel}</span>
            <span class="pill pill--neutral">${window.Dom.raw(window.Icon.render('scale'))}${pet.weightLabel}</span>
          </div>
        </div>

        <span class="pet-card__cta">
          <span class="btn btn--primary btn--block btn--sm">Conocer más ${window.Dom.raw(window.Icon.render('arrowRight'))}</span>
        </span>
      </article>`;
  }

  /* --- Tarjeta grande para el carrusel de destacados -------------------- */
  function feature(pet, options) {
    var opts = options || {};
    var favorite = window.State.isFavorite(pet.id);
    var short = pet.description ? pet.description.split('. ')[0] + '.' : '';

    return window.Dom.h`
      <article class="feature" style="--i:${opts.index || 0}">
        <a class="feature__media" href="#/mascotas/${pet.id}" data-nav="${pet.id}"
           aria-label="${pet.name} — ver ficha completa">
          ${window.Media.portrait({
            id: pet.cover,
            name: pet.name,
            alt: pet.name + ', ' + pet.breed,
            width: 800,
            className: 'pet-card__img',
            sizes: '(max-width: 560px) 82vw, (max-width: 1100px) 46vw, 300px'
          })}
          <span class="badge badge--primary badge--float">${window.Dom.raw(window.Icon.render('sparkles'))} Destacado</span>
        </a>

        <button class="fab feature__fav ${favorite ? 'is-active' : ''}"
                type="button"
                data-fav="${pet.id}"
                aria-pressed="${favorite ? 'true' : 'false'}"
                aria-label="${favorite ? 'Quitar ' + pet.name + ' de favoritos' : 'Guardar ' + pet.name + ' en favoritos'}">
          ${window.Dom.raw(window.Icon.render(favorite ? 'heartSolid' : 'heart'))}
        </button>

        <a class="feature__body" href="#/mascotas/${pet.id}" data-nav="${pet.id}">
          <h3 class="feature__name">${pet.name}</h3>
          <p class="feature__breed">${pet.breed} · ${pet.speciesLabel}</p>
          <p class="feature__desc clamp-2">${short}</p>
          <div class="feature__foot">
            <span class="pill">${window.Dom.raw(window.Icon.render('cake'))}${pet.ageLabel}</span>
            <span class="link-more">Ver ficha ${window.Dom.raw(window.Icon.render('arrowRight'))}</span>
          </div>
        </a>
      </article>`;
  }

  /* --- Fila compacta (favoritos, adopciones, recomendaciones) ----------- */
  function mini(pet, options) {
    var opts = options || {};
    var right = opts.right || window.Dom.h`<span class="badge badge--primary">${pet.speciesLabel}</span>`;

    return window.Dom.h`
      <a class="mini" href="#/mascotas/${pet.id}" data-nav="${pet.id}">
        <span class="mini__thumb" style="position:relative;overflow:hidden;display:block">
          ${window.Media.portrait({
            id: pet.cover,
            name: pet.name,
            alt: pet.name,
            width: 200,
            className: 'mini__thumb',
            eager: false
          })}
        </span>
        <span class="mini__text">
          <strong>${pet.name}</strong>
          <small>${pet.breed} · ${pet.ageLabel}</small>
        </span>
        <span class="mini__action">${window.Dom.raw(right)}</span>
      </a>`;
  }

  /* --- Rejilla de tarjetas con contador de resultados ------------------- */
  function grid(list, options) {
    var opts = options || {};
    if (!list.length) { return emptyState(opts.emptyOptions || {}); }

    var cards = list.map(function (pet, index) {
      return card(pet, { index: index, imageWidth: opts.imageWidth });
    }).join('');

    return window.Dom.h`<div class="pet-grid">${window.Dom.raw(cards)}</div>`;
  }

  /* --- Estado vacío reutilizable ---------------------------------------- */
  function emptyState(options) {
    var opts = options || {};
    return window.Dom.h`
      <div class="empty">
        <span class="empty__art">${window.Dom.raw(window.Icon.render(opts.icon || 'empty'))}</span>
        <h3>${opts.title || 'No encontramos mascotas'}</h3>
        <p>${opts.message || 'Prueba con otros filtros o revisa el catálogo completo: siempre hay alguien esperando.'}</p>
        <div class="empty__actions">
          <button class="btn btn--primary" type="button" data-action="${opts.action || 'clear-filters'}">
            ${window.Dom.raw(window.Icon.render('filter'))} ${opts.actionLabel || 'Limpiar filtros'}
          </button>
        </div>
      </div>`;
  }

  window.PetCard = {
    card: card,
    feature: feature,
    mini: mini,
    grid: grid,
    emptyState: emptyState
  };
})();

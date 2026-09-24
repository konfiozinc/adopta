/* ============================================================================
 * cards.js — Piezas de interfaz compartidas entre vistas
 * ----------------------------------------------------------------------------
 * Aquí viven los bloques que varias páginas necesitan: los chips de filtro, el
 * buscador, las tarjetas de solicitud y las filas de ajustes. Se mantiene en un
 * único archivo para que el aspecto sea consistente en toda la app.
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Chips de especie con contador
   * ------------------------------------------------------------------------ */
  function speciesChips(counts, current) {
    counts = counts || window.Repository.speciesCounts();
    var options = [
      { value: 'todos', label: 'Todos', icon: 'pawSolid' },
      { value: 'perro', label: 'Perros', icon: 'dog' },
      { value: 'gato', label: 'Gatos', icon: 'cat' },
      { value: 'conejo', label: 'Conejos', icon: 'rabbit' }
    ];

    var html = options.map(function (option) {
      var isActive = (current || 'todos') === option.value;
      var count = counts[option.value] || 0;

      return window.Dom.h`
        <button class="chip ${isActive ? 'is-active' : ''}" type="button"
                data-filter-species="${option.value}"
                aria-pressed="${isActive ? 'true' : 'false'}">
          ${window.Dom.raw(window.Icon.render(option.icon))}
          <span>${option.label}</span>
          <span class="chip__count">${count}</span>
        </button>`;
    }).join('');

    return window.Dom.h`<div class="chips" role="group" aria-label="Filtrar por tipo de mascota">${window.Dom.raw(html)}</div>`;
  }

  /* --------------------------------------------------------------------------
   * Buscador con autocompletado
   * ------------------------------------------------------------------------ */
  function searchBox(options) {
    var opts = options || {};
    var value = opts.value || '';

    return window.Dom.h`
      <div class="search ${value ? 'has-value' : ''}" data-search-box>
        ${window.Dom.raw(window.Icon.render('search'))}
        <input type="search"
               data-search-input
               value="${value}"
               placeholder="${opts.placeholder || 'Buscar por nombre, raza o refugio'}"
               aria-label="${opts.placeholder || 'Buscar mascotas'}"
               autocomplete="off"
               enterkeyhint="search">
        <button class="search__clear" type="button" data-search-clear aria-label="Borrar búsqueda">
          ${window.Dom.raw(window.Icon.render('close'))}
        </button>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Etiquetas de filtros activos (se pueden quitar una a una)
   * ------------------------------------------------------------------------ */
  function activeFilterTags(filters, options) {
    var opts = options || {};
    var tags = [];

    if (filters.search) { tags.push({ kind: 'search', label: '“' + filters.search + '”', icon: 'search' }); }
    if (filters.size && opts.showAdvanced) { tags.push({ kind: 'size', label: window.Format.sizeLabel(filters.size), icon: 'scale' }); }
    if (filters.sex && opts.showAdvanced) { tags.push({ kind: 'sex', label: window.Format.sexLabel(filters.sex), icon: 'user' }); }
    if (opts.ageLabel) { tags.push({ kind: 'age', label: opts.ageLabel, icon: 'cake' }); }

    if (!tags.length) { return ''; }

    var html = tags.map(function (tag) {
      return window.Dom.h`
        <span class="filter-tag">
          ${window.Dom.raw(window.Icon.render(tag.icon))}
          ${tag.label}
          <button type="button" data-remove-filter="${tag.kind}" aria-label="Quitar filtro ${tag.label}">
            ${window.Dom.raw(window.Icon.render('close'))}
          </button>
        </span>`;
    }).join('');

    return window.Dom.h`
      <div class="catalog__active">
        ${window.Dom.raw(html)}
        <button class="btn btn--sm btn--ghost" type="button" data-action="clear-filters">Limpiar todo</button>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Tarjeta de solicitud de adopción
   * ------------------------------------------------------------------------ */
  var STATUS_FLOW = ['pendiente', 'revision', 'aprobada'];

  function timeline(request) {
    var done = {};
    (request.timeline || []).forEach(function (step) { done[step.status] = step.at; });

    if (request.status === 'rechazada' || request.status === 'cancelada') {
      var steps = STATUS_FLOW.slice(0, 2).map(function (status) {
        return window.Dom.h`
          <span class="timeline__step is-done">
            <span class="timeline__dot">${window.Dom.raw(window.Icon.render('check'))}</span>
            ${window.Format.statusLabel(status)}
          </span>`;
      }).join('');

      return window.Dom.h`
        <div class="timeline">
          ${window.Dom.raw(steps)}
          <span class="timeline__line" aria-hidden="true"></span>
          <span class="timeline__step is-rejected">
            <span class="timeline__dot">${window.Dom.raw(window.Icon.render(request.status === 'rechazada' ? 'close' : 'info'))}</span>
            ${window.Format.statusLabel(request.status)}
          </span>
        </div>`;
    }

    var index = STATUS_FLOW.indexOf(request.status);
    var parts = STATUS_FLOW.map(function (status, i) {
      var state = i < index ? 'is-done' : (i === index ? 'is-current' : '');
      var icon = i < index ? 'check' : (i === index ? window.Format.statusIcon(status) : 'chevronRight');
      return window.Dom.h`
        <span class="timeline__step ${state}">
          <span class="timeline__dot">${window.Dom.raw(window.Icon.render(icon))}</span>
          ${window.Format.statusLabel(status)}
        </span>`;
    });

    return window.Dom.h`
      <div class="timeline">
        ${window.Dom.raw(parts[0])}
        <span class="timeline__line" aria-hidden="true"></span>
        ${window.Dom.raw(parts[1])}
        <span class="timeline__line" aria-hidden="true"></span>
        ${window.Dom.raw(parts[2])}
      </div>`;
  }

  function requestCard(request) {
    var pet = window.Repository._sync.getPet(request.petId);
    var petName = pet ? pet.name : 'Mascota no disponible';
    var petBreed = pet ? pet.breed : 'Ficha retirada del catálogo';
    var canCancel = request.status === 'pendiente' || request.status === 'revision';

    var media = pet
      ? window.Dom.h`
          <a class="req-card__media" href="#/mascotas/${pet.id}" data-nav="${pet.id}" aria-label="Ver ficha de ${pet.name}">
            ${window.Media.portrait({
              id: pet.cover,
              name: pet.name,
              alt: pet.name,
              width: 400,
              className: 'req-card__img',
              sizes: '96px'
            })}
          </a>`
      : window.Dom.h`
          <span class="req-card__media">
            <span class="img-fallback" style="background:${window.Media.gradientFor(request.petId)}">
              <span class="img-fallback__initial">?</span>
            </span>
          </span>`;

    return window.Dom.h`
      <article class="req-card" data-request="${request.id}">
        ${window.Dom.raw(media)}

        <div>
          <div class="row between" style="gap:var(--s-3);align-items:flex-start">
            <div>
              <h3 class="req-card__title">${petName}</h3>
              <p class="req-card__breed" style="font-size:var(--fs-sm);color:var(--c-text-mute)">${petBreed}</p>
            </div>
            <span class="badge ${window.Format.statusBadge(request.status)}">
              ${window.Dom.raw(window.Icon.render(window.Format.statusIcon(request.status)))}
              ${window.Format.statusLabel(request.status)}
            </span>
          </div>

          <div class="req-card__meta">
            <span>${window.Dom.raw(window.Icon.render('calendar'))} Enviada el ${window.Format.shortDate(request.createdAt)}</span>
            <span>${window.Dom.raw(window.Icon.render('clock'))} Actualizada ${window.Format.relative(request.updatedAt || request.createdAt)}</span>
            <span>${window.Dom.raw(window.Icon.render('clipboard'))} Folio ${request.id.toUpperCase()}</span>
          </div>

          ${window.Dom.raw(timeline(request))}

          ${request.note ? window.Dom.raw(window.Dom.h`
            <p class="req-note">
              ${window.Dom.raw(window.Icon.render('info'))}
              <span>${request.note}</span>
            </p>`) : ''}
        </div>

        <div class="req-card__actions">
          ${pet ? window.Dom.raw(window.Dom.h`
            <a class="btn btn--ghost btn--sm" href="#/mascotas/${pet.id}" data-nav="${pet.id}">
              ${window.Dom.raw(window.Icon.render('paw'))} Ver ficha
            </a>`) : ''}
          ${canCancel ? window.Dom.raw(window.Dom.h`
            <button class="btn btn--sm btn--danger" type="button" data-cancel-request="${request.id}">
              ${window.Dom.raw(window.Icon.render('close'))} Cancelar
            </button>`) : ''}
        </div>
      </article>`;
  }

  /* --------------------------------------------------------------------------
   * Chips de estado de solicitud
   * ------------------------------------------------------------------------ */
  function statusChips(groups, current) {
    var options = [
      { value: 'todas', label: 'Todas' },
      { value: 'pendiente', label: 'Pendientes' },
      { value: 'revision', label: 'En revisión' },
      { value: 'aprobada', label: 'Aprobadas' },
      { value: 'rechazada', label: 'Rechazadas' }
    ];

    var html = options.map(function (option) {
      var count = groups[option.value] || 0;
      var isActive = (current || 'todas') === option.value;
      return window.Dom.h`
        <button class="chip ${isActive ? 'is-active' : ''}" type="button"
                data-filter-status="${option.value}"
                aria-pressed="${isActive ? 'true' : 'false'}">
          <span>${option.label}</span>
          <span class="chip__count">${count}</span>
        </button>`;
    }).join('');

    return window.Dom.h`<div class="chips" role="group" aria-label="Filtrar solicitudes por estado">${window.Dom.raw(html)}</div>`;
  }

  /* --------------------------------------------------------------------------
   * Fila de menú / ajuste
   * ------------------------------------------------------------------------ */
  function menuItem(options) {
    var opts = options || {};
    var tag = opts.href ? 'a' : 'button';
    var attrs = opts.href
      ? window.Dom.raw('href="' + opts.href + '"')
      : window.Dom.raw('type="button"');

    return window.Dom.h`
      <${window.Dom.raw(tag)} class="menu__item ${opts.danger ? 'menu__item--danger' : ''}" ${attrs}
        ${opts.action ? window.Dom.raw('data-action="' + opts.action + '"') : ''}>
        <span class="menu__icon">${window.Dom.raw(window.Icon.render(opts.icon || 'info'))}</span>
        <span class="menu__text">
          ${opts.label}
          ${opts.hint ? window.Dom.raw('<small>' + window.Dom.escape(opts.hint) + '</small>') : ''}
        </span>
        ${window.Dom.raw(window.Icon.render(opts.href ? 'chevronRight' : (opts.trailingIcon || 'chevronRight')))}
      </${window.Dom.raw(tag)}>`;
  }

  /* Fila con interruptor (ajustes) */
  function prefRow(options) {
    var opts = options || {};
    return window.Dom.h`
      <div class="pref">
        <span class="menu__icon">${window.Dom.raw(window.Icon.render(opts.icon || 'bell'))}</span>
        <span class="pref__text">
          <strong>${opts.label}</strong>
          <small>${opts.hint || ''}</small>
        </span>
        <label class="switch">
          <input type="checkbox" data-pref="${opts.key}" ${opts.checked ? window.Dom.raw('checked') : ''}
                 aria-label="${opts.label}">
          <span class="switch__track" aria-hidden="true"></span>
        </label>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Bloque con título
   * ------------------------------------------------------------------------ */
  function block(title, icon, content) {
    return window.Dom.h`
      <section class="block">
        <h2 class="block__title">${window.Dom.raw(window.Icon.render(icon))} ${title}</h2>
        ${window.Dom.raw(content)}
      </section>`;
  }

  /* Aviso informativo reutilizable */
  function demoNote(text, icon) {
    return window.Dom.h`
      <p class="demo-note">
        ${window.Dom.raw(window.Icon.render(icon || 'info'))}
        <span>${text}</span>
      </p>`;
  }

  /* Tarjeta de estadística */
  function statCard(value, label, icon) {
    return window.Dom.h`
      <div class="stat">
        <strong>${value}</strong>
        <span>${label}</span>
      </div>`;
  }

  window.Cards = {
    speciesChips: speciesChips,
    searchBox: searchBox,
    activeFilterTags: activeFilterTags,
    requestCard: requestCard,
    statusChips: statusChips,
    menuItem: menuItem,
    prefRow: prefRow,
    block: block,
    demoNote: demoNote,
    statCard: statCard
  };
})();

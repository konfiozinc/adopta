/* ============================================================================
 * pets.js — Catálogo de mascotas
 * ----------------------------------------------------------------------------
 * Búsqueda combinada con filtros avanzados (tamaño, sexo, edad), ordenación,
 * etiquetas de filtros activos y estados vacíos accionables.
 * ========================================================================== */
(function () {
  'use strict';

  var AGE_OPTIONS = [
    { value: '', label: 'Cualquier edad' },
    { value: 'cachorro', label: 'Cachorro (menos de 1 año)' },
    { value: 'joven', label: 'Joven (1 a 3 años)' },
    { value: 'adulto', label: 'Adulto (3 a 7 años)' },
    { value: 'senior', label: 'Senior (más de 7 años)' }
  ];

  var SORT_OPTIONS = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'destacados', label: 'Destacados primero' },
    { value: 'nombre', label: 'Nombre (A–Z)' },
    { value: 'edad_asc', label: 'Menor edad primero' },
    { value: 'edad_desc', label: 'Mayor edad primero' }
  ];

  var SIZE_OPTIONS = [
    { value: '', label: 'Todos los tamaños' },
    { value: 'pequeno', label: 'Pequeño (hasta 10 kg)' },
    { value: 'mediano', label: 'Mediano (10 a 20 kg)' },
    { value: 'grande', label: 'Grande (más de 20 kg)' }
  ];

  var SEX_OPTIONS = [
    { value: '', label: 'Ambos sexos' },
    { value: 'hembra', label: 'Hembra' },
    { value: 'macho', label: 'Macho' }
  ];

  function ageOptionLabel(value) {
    var found = AGE_OPTIONS.filter(function (option) { return option.value === value; })[0];
    return found ? found.label : '';
  }

  function selectField(label, name, options, current, hint) {
    var html = options.map(function (option) {
      return window.Dom.h`
        <option value="${option.value}" ${option.value === current ? window.Dom.raw('selected') : ''}>${option.label}</option>`;
    }).join('');

    return window.Dom.h`
      <div class="field">
        <label class="field__label" for="filter-${name}">${label}</label>
        <div class="select-wrap">
          <select class="select" id="filter-${name}" data-filter="${name}">
            ${window.Dom.raw(html)}
          </select>
        </div>
        ${hint ? window.Dom.raw('<span class="field__hint">' + window.Dom.escape(hint) + '</span>') : ''}
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Bloques
   * ------------------------------------------------------------------------ */
  function header(total, shelters) {
    return window.Dom.h`
      <div class="catalog__head reveal" style="--i:0">
        <div class="catalog__title">
          <h1>Mascotas en adopción</h1>
          <span class="catalog__count" id="catalog-count">${window.Format.plural(total, 'mascota')}</span>
        </div>
        <p style="margin-top:var(--s-2);font-size:var(--fs-md)">
          ${shelters} refugios verificados publican aquí. Todas las fichas incluyen estado de salud y contacto directo.
        </p>
      </div>`;
  }

  function results(pets, filters, counts) {
    var advancedActive = !!(filters.size || filters.sex || filters.age);

    return window.Dom.h`
      <div id="catalog-results">
        <div class="catalog__tools">
          <div class="mobile-tools">
            <button class="chip ${advancedActive ? 'is-active' : ''}" type="button" data-action="toggle-filters"
                    aria-expanded="${advancedActive ? 'true' : 'false'}" aria-controls="catalog-filters">
              ${window.Dom.raw(window.Icon.render('filter'))}
              <span>Filtros${advancedActive ? ' activos' : ''}</span>
            </button>
            <div class="select-wrap grow">
              <select class="select" data-filter="sort" aria-label="Ordenar resultados">
                ${window.Dom.raw(SORT_OPTIONS.map(function (option) {
                  return window.Dom.h`
                    <option value="${option.value}" ${option.value === filters.sort ? window.Dom.raw('selected') : ''}>${option.label}</option>`;
                }).join(''))}
              </select>
            </div>
          </div>

          <div class="catalog__sort" style="display:none" data-desktop-sort>
            <span style="font-size:var(--fs-sm);color:var(--c-text-mute);font-weight:600">Ordenar por</span>
            <div class="select-wrap">
              <select class="select" data-filter="sort" aria-label="Ordenar resultados">
                ${window.Dom.raw(SORT_OPTIONS.map(function (option) {
                  return window.Dom.h`
                    <option value="${option.value}" ${option.value === filters.sort ? window.Dom.raw('selected') : ''}>${option.label}</option>`;
                }).join(''))}
              </select>
            </div>
          </div>
        </div>

        <div id="catalog-filters" ${advancedActive ? '' : 'hidden'}>
          <div class="filters-panel" style="margin-bottom:var(--s-5)">
            ${window.Dom.raw(selectField('Tamaño', 'size', SIZE_OPTIONS, filters.size))}
            ${window.Dom.raw(selectField('Sexo', 'sex', SEX_OPTIONS, filters.sex))}
            ${window.Dom.raw(selectField('Edad', 'age', AGE_OPTIONS, filters.age))}
          </div>
        </div>

        ${window.Dom.raw(window.Cards.activeFilterTags(filters, {
          showAdvanced: true,
          ageLabel: filters.age ? ageOptionLabel(filters.age) : ''
        }))}

        <div id="catalog-grid">
          ${window.Dom.raw(window.PetCard.grid(pets, {
            emptyOptions: {
              title: 'No encontramos mascotas con esos filtros',
              message: 'Prueba ampliar la búsqueda: hay muchos compañeros esperando una familia.',
              action: 'clear-filters',
              actionLabel: 'Limpiar filtros'
            }
          }))}
        </div>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Vista
   * ------------------------------------------------------------------------ */
  function view(params) {
    /* Los parámetros de la URL tienen prioridad (permite enlazar a una
       búsqueda concreta desde cualquier parte de la app). */
    if (params && params.query && params.query.especie) {
      window.State.setFilters({ species: params.query.especie });
    }

    var filters = window.State.get().filters;
    var counts = window.Repository.speciesCounts();

    /* La vista devuelve el esqueleto de inmediato. Los datos se cargan en
       `mount()`, que se ejecuta cuando el HTML ya está en el DOM: así nunca se
       consulta un nodo que aún no existe. */
    return window.Dom.h`
      <div id="catalog-root">
        ${window.Dom.raw(header(counts.todos, window.Repository.listShelters().length))}

        <div class="reveal" style="--i:1;margin-bottom:var(--s-5)">
          ${window.Dom.raw(window.Cards.searchBox({ value: filters.search }))}
        </div>

        <div class="reveal" style="--i:2;margin-bottom:var(--s-4)">
          ${window.Dom.raw(window.Cards.speciesChips(counts, filters.species))}
        </div>

        <div id="catalog-body">
          ${window.Dom.raw(window.Dom.skeletonGrid(8))}
        </div>
      </div>`;
  }

  /* La barra de ordenación de escritorio se muestra solo en pantallas grandes */
  function syncDesktopSort() {
    var desktop = window.Dom.qs('[data-desktop-sort]');
    if (!desktop) { return; }
    desktop.style.display = window.matchMedia('(min-width: 768px)').matches ? 'flex' : 'none';
  }

  /* --------------------------------------------------------------------------
   * Montaje e interacción
   * ------------------------------------------------------------------------ */
  function mount(root, params) {
    if (!root || !document.getElementById('catalog-body')) { return; }

    var timer = null;

    function repaint() {
      var filters = window.State.get().filters;

      return window.Repository.listPets(filters).then(function (pets) {
        var body = document.getElementById('catalog-body');
        if (!body) { return; }

        body.innerHTML = results(pets, window.State.get().filters, window.Repository.speciesCounts());
        window.Icon.inject(body);
        window.Media.hydrateImages(body);
        syncDesktopSort();

        /* Mantenemos el buscador sincronizado sin perder el foco */
        var input = window.Dom.qs('[data-search-input]', root);
        if (input && input.value !== filters.search) { input.value = filters.search; }

        var count = document.getElementById('catalog-count');
        if (count) { count.textContent = window.Format.plural(pets.length, 'mascota'); }

        var chipsRoot = window.Dom.qs('.chips', root);
        if (chipsRoot) {
          chipsRoot.outerHTML = window.Cards.speciesChips(window.Repository.speciesCounts(), filters.species);
        }
      }).catch(function (error) {
        if (window.console) { window.console.error('[Adopta] Catálogo: error al pintar', error); }
        var body = document.getElementById('catalog-body');
        if (body) {
          body.innerHTML = window.PetCard.emptyState({
            icon: 'info',
            title: 'No pudimos cargar el catálogo',
            message: 'Recarga la página para intentarlo de nuevo.',
            action: 'clear-filters',
            actionLabel: 'Reintentar'
          });
          window.Icon.inject(body);
        }
      });
    }

    /* --- Buscador --- */
    window.Search.wire(root, {      onInput: function (value) {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          window.State.setFilters({ search: value });
          repaint();
        }, 220);
      },
      onSubmit: function (value) {
        window.clearTimeout(timer);
        if (value && value.length > 1) { window.State.registerSearch(value); }
        window.State.setFilters({ search: value });
        repaint();
      }
    });

    /* --- Un único listener delegado para todos los controles --- */
    function onClick(event) {
      var speciesChip = event.target.closest('[data-filter-species]');
      if (speciesChip) {
        window.State.setFilters({ species: speciesChip.getAttribute('data-filter-species') });
        repaint();
        return;
      }

      var statusRemove = event.target.closest('[data-remove-filter]');
      if (statusRemove) {
        var kind = statusRemove.getAttribute('data-remove-filter');
        var patch = {};
        patch[kind === 'search' ? 'search' : kind] = '';
        window.State.setFilters(patch);
        repaint();
        return;
      }

      var clear = event.target.closest('[data-action="clear-filters"]');
      if (clear) {
        window.State.resetFilters();
        var input = window.Dom.qs('[data-search-input]', root);
        if (input) { input.value = ''; }
        repaint();
        return;
      }

      var toggle = event.target.closest('[data-action="toggle-filters"]');
      if (toggle) {
        var panel = document.getElementById('catalog-filters');
        if (!panel) { return; }
        var open = panel.hasAttribute('hidden');
        if (open) { panel.removeAttribute('hidden'); } else { panel.setAttribute('hidden', ''); }
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        return;
      }
    }

    function onChange(event) {
      var select = event.target.closest('[data-filter]');
      if (!select) { return; }
      var patch = {};
      patch[select.getAttribute('data-filter')] = select.value;
      window.State.setFilters(patch);
      repaint();
    }

    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('change', syncDesktopSort);

    /* Al cambiar de tamaño de pantalla se reajusta la barra de ordenación */
    function onResize() { syncDesktopSort(); }
    window.addEventListener('resize', onResize);

    /* Los favoritos marcan tarjetas: basta con refrescar las clases */
    var unsubscribe = window.State.subscribe(function (state, event) {
      if (event && event.type === 'favorites:toggle') {
        var button = window.Dom.qs('[data-fav="' + event.petId + '"]');
        if (button) {
          button.setAttribute('aria-pressed', event.added ? 'true' : 'false');
        }
      }
      if (event && event.type === 'demo:reset') { window.Router.resolve(); }
    });

    window.Views.onLeave(function () {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('change', syncDesktopSort);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
      unsubscribe();
    });

    /* Primera carga de datos: el HTML ya está en el DOM en este punto */
    repaint();
  }

  window.Views = window.Views || {};
  window.Views.pets = { render: view, mount: mount };
})();

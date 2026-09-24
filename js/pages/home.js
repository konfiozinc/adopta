/* ============================================================================
 * home.js — Página de Inicio
 * ----------------------------------------------------------------------------
 * Encabezado personalizado, buscador con sugerencias, filtros rápidos,
 * carrusel de destacados, meta de adopciones (progreso mensual), catálogo
 * resumido y explicación del proceso en tres pasos.
 * ========================================================================== */
(function () {
  'use strict';

  /* Saludo según la hora del dispositivo: personalización real, no texto fijo */
  function greeting() {
    var hour = new Date().getHours();
    if (hour < 6) { return 'Buenas noches'; }
    if (hour < 13) { return 'Buenos días'; }
    if (hour < 20) { return 'Buenas tardes'; }
    return 'Buenas noches';
  }

  /* --------------------------------------------------------------------------
   * Bloques de la vista
   * ------------------------------------------------------------------------ */
  function hero(user, stats) {
    return window.Dom.h`
      <section class="hero reveal" style="--i:0">
        <span class="hero__paw hero__paw--a">${window.Dom.raw(window.Icon.render('pawSolid'))}</span>
        <span class="hero__paw hero__paw--b">${window.Dom.raw(window.Icon.render('pawSolid'))}</span>
        <span class="hero__paw hero__paw--c">${window.Dom.raw(window.Icon.render('pawSolid'))}</span>

        <div class="hero__top">
          <div class="hero__greet">
            <small>${greeting()} 👋</small>
            <h1>Hola, ${user.name}</h1>
            <p>Encuentra a quien te está esperando</p>
          </div>
          <a class="avatar-btn" href="#/cuenta" aria-label="Ir a mi cuenta">
            <span class="avatar avatar--lg" style="background:rgba(255,255,255,.25);box-shadow:0 0 0 3px rgba(255,255,255,.4)">
              ${user.avatar
                ? window.Dom.raw('<img src="' + user.avatar + '" alt="">')
                : window.Format.initials(user.name)}
            </span>
          </a>
        </div>

        <div class="hero__cta">
          <p><strong>Adoptar cambia dos vidas:</strong> la suya y la tuya. Empieza hoy con una búsqueda.</p>
          <a class="btn btn--ghost" href="#/mascotas">
            ${window.Dom.raw(window.Icon.render('search'))} Explorar mascotas
          </a>
        </div>

        <div class="hero__stats">
          <div class="hero__stat">
            <strong>${stats.available}</strong>
            <span>en adopción</span>
          </div>
          <div class="hero__stat">
            <strong>${stats.shelters}</strong>
            <span>refugios aliados</span>
          </div>
          <div class="hero__stat">
            <strong>${stats.saved}</strong>
            <span>guardadas por ti</span>
          </div>
        </div>
      </section>`;
  }

  function searchBlock(filters) {
    return window.Dom.h`
      <div class="home-search reveal" style="--i:1">
        ${window.Dom.raw(window.Cards.searchBox({
          value: filters.search,
          placeholder: 'Buscar por nombre, raza o refugio'
        }))}
      </div>`;
  }

  function impactBlock(pets, requests) {
    var goal = 12;
    var adopted = requests.filter(function (request) { return request.status === 'aprobada'; }).length + 18;
    var percent = Math.min(100, Math.round((adopted / (goal + 18)) * 100));

    return window.Dom.h`
      <section class="impact reveal" style="--i:2" aria-label="Meta mensual de adopciones">
        <div class="impact__row">
          <span class="impact__icon">${window.Dom.raw(window.Icon.render('heartSolid'))}</span>
          <div class="grow">
            <h2 style="font-size:var(--fs-lg)">Historias felices este mes</h2>
            <p style="font-size:var(--fs-sm)">Cada adopción libera un lugar en el refugio para otro rescate.</p>
          </div>
          <strong style="font-family:var(--f-display);font-size:var(--fs-xl);color:var(--c-primary-700)">${adopted}</strong>
        </div>
        <div>
          <div class="impact__bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
            <span style="width:${percent}%"></span>
          </div>
          <div class="impact__legend">
            <span>${percent}% de la meta mensual</span>
            <span>${pets.length} mascotas publicadas</span>
          </div>
        </div>
      </section>`;
  }

  function howItWorks() {
    var steps = [
      { icon: 'search', title: '1. Explora y filtra', text: 'Revisa fichas completas con salud verificada, edad, tamaño y refugio de origen.' },
      { icon: 'clipboard', title: '2. Envía tu solicitud', text: 'Un formulario corto de tres pasos. El refugio recibe tu perfil al instante.' },
      { icon: 'heartHand', title: '3. Conoce y adopta', text: 'Coordinan una visita, firman el compromiso y tu nuevo compañero llega a casa.' }
    ];

    var html = steps.map(function (step, index) {
      return window.Dom.h`
        <article class="how__step reveal" style="--i:${index + 3}">
          <span class="how__num">0${index + 1}</span>
          <span class="how__icon">${window.Dom.raw(window.Icon.render(step.icon))}</span>
          <h3>${step.title}</h3>
          <p>${step.text}</p>
        </article>`;
    }).join('');

    return window.Dom.h`
      <section style="margin-bottom:var(--s-10)">
        <div class="section-head">
          <div class="section-head__title">
            ${window.Dom.raw(window.Icon.render('info'))}
            <div>
              <h2>Cómo funciona</h2>
              <p>Adopción responsable en tres pasos claros</p>
            </div>
          </div>
        </div>
        <div class="how">${window.Dom.raw(html)}</div>
      </section>`;
  }

  function appBanner() {
    return window.Dom.h`
      <section class="app-banner reveal" style="--i:7">
        <span class="app-banner__icon">${window.Dom.raw(window.Icon.render('pawSolid'))}</span>
        <div class="grow">
          <strong>Descarga la app de Adopta</strong>
          <p>Recibe avisos cuando aparezca una mascota compatible contigo.</p>
        </div>
        <button class="btn btn--sm btn--soft" type="button" data-action="coming-soon" data-label="La app móvil">
          ${window.Dom.raw(window.Icon.render('external'))} Android
        </button>
      </section>`;
  }

  /* --------------------------------------------------------------------------
   * Vista
   * ------------------------------------------------------------------------ */
  function view() {
    var state = window.State.get();
    var user = state.user;
    var filters = state.filters;

    /* La vista se entrega con esqueletos: los datos llegan en `mount()`, cuando
       el HTML ya forma parte del documento (ver nota en pages/pets.js). */
    return window.Dom.h`
      <div id="home-root">
        ${window.Dom.raw(hero(user, {
          available: window.Repository.speciesCounts().todos,
          shelters: window.Repository.listShelters().length,
          saved: state.favorites.length
        }))}
        ${window.Dom.raw(searchBlock(filters))}
        ${window.Dom.raw(impactBlock(window.Repository._sync.listPets({}), state.requests))}
        <div id="home-featured"></div>
        <div id="home-catalog">
          <div class="section-head">
            <div class="section-head__title">
              ${window.Dom.raw(window.Icon.render('pawSolid'))}
              <div>
                <h2>Para adoptar</h2>
                <p>Cargando mascotas disponibles…</p>
              </div>
            </div>
          </div>
          ${window.Dom.raw(window.Dom.skeletonGrid(4))}
        </div>
        ${window.Dom.raw(howItWorks())}
        ${window.Dom.raw(appBanner())}
      </div>`;
  }

  /* Carga inicial de destacados y catálogo resumido */
  function loadInitial() {
    var featuredRoot = document.getElementById('home-featured');
    var catalogRoot = document.getElementById('home-catalog');
    if (!featuredRoot || !catalogRoot) { return Promise.resolve(); }

    var filters = window.State.get().filters;

    return Promise.all([
      window.Repository.featuredPets(6),
      window.Repository.listPets(filters)
    ]).then(function (results) {
      /* La vista pudo haber cambiado mientras cargaban los datos */
      if (!document.getElementById('home-featured') || !document.getElementById('home-catalog')) { return; }

      var featured = results[0];
      var list = results[1];

      featuredRoot.innerHTML = featuredSection(featured);
      catalogRoot.innerHTML = catalogSection(list, window.State.get().filters);

      window.Icon.inject(featuredRoot);
      window.Icon.inject(catalogRoot);
      window.Media.hydrateImages(featuredRoot);
      window.Media.hydrateImages(catalogRoot);
      window.Media.preload(featured.map(function (pet) { return pet.cover; }), 600);
    }).catch(function (error) {
      if (window.console) { window.console.error('[Adopta] Inicio: error al cargar datos', error); }
      if (catalogRoot) { catalogRoot.innerHTML = window.PetCard.emptyState({ icon: 'info', title: 'No pudimos cargar las mascotas' }); }
    });
  }

  function featuredSection(pets) {
    if (!pets.length) { return ''; }

    var cards = pets.map(function (pet, index) {
      return window.PetCard.feature(pet, { index: index });
    }).join('');

    return window.Dom.h`
      <section style="margin-bottom:var(--s-10)">
        <div class="section-head">
          <div class="section-head__title">
            ${window.Dom.raw(window.Icon.render('sparkles'))}
            <div>
              <h2>Destacados</h2>
              <p>Con salud verificada y listos para conocer a su familia</p>
            </div>
          </div>
          <a class="link-more" href="#/mascotas">
            Ver todos ${window.Dom.raw(window.Icon.render('arrowRight'))}
          </a>
        </div>
        <div class="carousel" role="list" aria-label="Mascotas destacadas">
          ${window.Dom.raw(cards)}
        </div>
      </section>`;
  }

  function catalogSection(pets, filters) {
    var counts = window.Repository.speciesCounts();
    var shown = pets.slice(0, 8);

    return window.Dom.h`
      <section style="margin-bottom:var(--s-10)">
        <div id="home-section-head" class="section-head">
          <div class="section-head__title">
            ${window.Dom.raw(window.Icon.render('pawSolid'))}
            <div>
              <h2>Para adoptar</h2>
              <p id="home-result-count">${window.Format.plural(pets.length, 'mascota')} disponible${pets.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <a class="link-more" href="#/mascotas">
            Catálogo completo ${window.Dom.raw(window.Icon.render('arrowRight'))}
          </a>
        </div>

        <div style="margin-bottom:var(--s-5)">
          ${window.Dom.raw(window.Cards.speciesChips(counts, filters.species))}
        </div>

        <div id="home-grid">
          ${window.Dom.raw(window.PetCard.grid(shown, {
            emptyOptions: {
              title: 'Sin resultados en destacados',
              message: 'Prueba con otra categoría o revisa el catálogo completo.'
            }
          }))}
        </div>

        ${pets.length > 8 ? window.Dom.raw(window.Dom.h`
          <div class="text-center" style="margin-top:var(--s-6)">
            <a class="btn btn--ghost" href="#/mascotas">
              Ver las ${pets.length} mascotas ${window.Dom.raw(window.Icon.render('arrowRight'))}
            </a>
          </div>`) : ''}
      </section>`;
  }

  /* --------------------------------------------------------------------------
   * Interacción posterior al pintado
   * ------------------------------------------------------------------------ */
  function mount(root) {
    if (!root || !document.getElementById('home-root')) { return; }

    /* Primera carga de datos (el DOM de la vista ya existe) */
    loadInitial();

    function refreshGrid() {
      var gridRoot = document.getElementById('home-grid');
      var countRoot = document.getElementById('home-result-count');
      if (!gridRoot) { return; }

      var filters = window.State.get().filters;
      window.Repository.listPets(filters).then(function (pets) {
        /* La vista pudo haber cambiado mientras se resolvía la consulta */
        if (!document.getElementById('home-grid')) { return; }

        var shown = pets.slice(0, 8);
        gridRoot.innerHTML = window.PetCard.grid(shown, {
          emptyOptions: {
            title: 'No encontramos mascotas con ese filtro',
            message: 'Puedes limpiar los filtros o buscar en todo el catálogo.',
            action: 'clear-filters-home',
            actionLabel: 'Limpiar búsqueda'
          }
        });
        window.Icon.inject(gridRoot);
        window.Media.hydrateImages(gridRoot);

        if (countRoot) {
          countRoot.textContent = window.Format.plural(pets.length, 'mascota') +
            ' disponible' + (pets.length === 1 ? '' : 's');
        }
      }).catch(function (error) {
        if (window.console) { window.console.error('[Adopta] Inicio: error al filtrar', error); }
      });
    }

    /* Búsqueda con retardo (debounce) para no filtrar en cada tecla */
    var timer = null;
    window.Search.wire(root, {
      onInput: function (value) {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          window.State.setFilters({ search: value });
          refreshGrid();
        }, 220);
      },
      onSubmit: function (value) {
        window.clearTimeout(timer);
        if (value && value.length > 1) { window.State.registerSearch(value); }
        window.State.setFilters({ search: value });
        window.Router.navigate('/mascotas');
      }
    });

    /* Filtros por especie */
    root.addEventListener('click', function (event) {
      var chip = event.target.closest('[data-filter-species]');
      if (!chip) { return; }
      var species = chip.getAttribute('data-filter-species');
      window.State.setFilters({ species: species });
      window.Dom.qsa('[data-filter-species]', root).forEach(function (node) {
        var active = node.getAttribute('data-filter-species') === species;
        node.classList.toggle('is-active', active);
        node.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      refreshGrid();
    });

    /* El grid se repinta cuando cambian los favoritos u otros filtros */
    var unsubscribe = window.State.subscribe(function (state, event) {
      if (!event) { return; }
      if (event.type === 'favorites:toggle') { refreshGrid(); }
      if (event.type === 'demo:reset') { window.Router.resolve(); }
    });

    /* Limpieza al abandonar la vista */
    window.Views.onLeave(function () {
      unsubscribe();
      window.clearTimeout(timer);
    });
  }

  window.Views = window.Views || {};
  window.Views.home = { render: view, mount: mount };
})();

/* ============================================================================
 * state.js — Estado global de la aplicación (reactivo y persistente)
 * ----------------------------------------------------------------------------
 * Patrón store + suscriptores. Cualquier cambio se guarda en localStorage y
 * notifica a quien esté escuchando (barra de navegación, vistas abiertas).
 *
 * Estructura del estado:
 *   user        → perfil del adoptante
 *   preferences → ajustes de notificaciones y privacidad
 *   favorites   → ids de mascotas guardadas
 *   requests    → solicitudes de adopción enviadas
 *   theme       → 'light' | 'dark'
 *   filters     → filtros activos del catálogo
 *   recentSearches, searchesCount, tips
 * ========================================================================== */
(function () {
  'use strict';

  var KEY = 'state';
  var STORAGE_AVAILABLE = window.Storage.isPersistent();

  /* --- Estado inicial ---------------------------------------------------- */
  function buildInitialState() {
    var now = Date.now();
    var seed = window.UserData;

    return {
      version: 1,
      user: Object.assign({}, seed.DEFAULT_USER, { joinedAt: new Date(now).toISOString() }),
      preferences: Object.assign({}, seed.DEFAULT_PREFERENCES),
      favorites: ['milo', 'nala', 'toby'],
      requests: seed.resolveSeedRequests(now),
      theme: detectTheme(),
      filters: { species: 'todos', search: '', sort: 'recientes', size: '', sex: '', age: '' },
      recentSearches: [],
      searchesCount: 0,
      tips: { dismissed: [] },
      startedAt: new Date(now).toISOString()
    };
  }

  function detectTheme() {
    var stored = window.Storage.get('theme', null);
    if (stored === 'light' || stored === 'dark') { return stored; }
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  /* --- Carga ------------------------------------------------------------- */
  var stored = window.Storage.get(KEY, null);
  var state = stored && typeof stored === 'object'
    ? mergeState(buildInitialState(), stored)
    : buildInitialState();

  /* Los datos guardados mandan, pero nunca deben dejar campos nuevos sin
   * definir cuando se evoluciona el esquema. */
  function mergeState(base, saved) {
    var merged = Object.assign({}, base, saved);
    merged.user = Object.assign({}, base.user, saved.user || {});
    merged.preferences = Object.assign({}, base.preferences, saved.preferences || {});
    merged.filters = Object.assign({}, base.filters, saved.filters || {});
    merged.tips = Object.assign({}, base.tips, saved.tips || {});
    merged.favorites = Array.isArray(saved.favorites) ? saved.favorites : base.favorites;
    merged.requests = Array.isArray(saved.requests) ? saved.requests : base.requests;
    merged.version = base.version;
    return merged;
  }

  if (!stored) { window.Storage.set(KEY, state); }

  /* --- Suscriptores ------------------------------------------------------ */
  var listeners = [];

  function subscribe(listener) {
    if (typeof listener !== 'function') { return function () {}; }
    listeners.push(listener);
    return function unsubscribe() {
      var index = listeners.indexOf(listener);
      if (index >= 0) { listeners.splice(index, 1); }
    };
  }

  function emit(event) {
    listeners.slice().forEach(function (listener) {
      try {
        listener(state, event);
      } catch (error) {
        if (window.console) { window.console.error('[Adopta] Error en suscriptor de estado', error); }
      }
    });
  }

  function persist() {
    window.Storage.set(KEY, state);
  }

  function commit(event) {
    persist();
    emit(event || { type: 'change' });
  }

  /* --- Acciones ---------------------------------------------------------- */

  /* Perfil ---------------------------------------------------------------- */
  function updateUser(patch) {
    state.user = Object.assign({}, state.user, patch || {});
    commit({ type: 'user:update', patch: patch });
    return state.user;
  }

  function updatePreferences(patch) {
    state.preferences = Object.assign({}, state.preferences, patch || {});
    commit({ type: 'preferences:update', patch: patch });
    return state.preferences;
  }

  /* Favoritos ------------------------------------------------------------- */
  function isFavorite(petId) { return state.favorites.indexOf(petId) !== -1; }

  function toggleFavorite(petId) {
    var index = state.favorites.indexOf(petId);
    var added;
    if (index === -1) {
      state.favorites = [petId].concat(state.favorites);
      added = true;
    } else {
      state.favorites = state.favorites.slice();
      state.favorites.splice(index, 1);
      added = false;
    }
    commit({ type: 'favorites:toggle', petId: petId, added: added });
    return added;
  }

  function clearFavorites() {
    state.favorites = [];
    commit({ type: 'favorites:clear' });
  }

  /* Solicitudes de adopción ---------------------------------------------- */
  function createRequest(petId, payload) {
    var now = new Date().toISOString();
    var request = {
      id: 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      petId: petId,
      status: 'pendiente',
      message: (payload && payload.message) || '',
      note: 'Recibimos tu solicitud. El refugio la revisará y te contactará en un plazo de 48 horas.',
      createdAt: now,
      updatedAt: now,
      timeline: [{ status: 'pendiente', at: now }],
      /* Datos del formulario: en un backend real viajarían al servidor */
      answers: (payload && payload.answers) || null,
      applicant: (payload && payload.applicant) || null
    };
    state.requests = [request].concat(state.requests);
    commit({ type: 'requests:create', request: request });
    return request;
  }

  function cancelRequest(requestId) {
    var request = state.requests.filter(function (item) { return item.id === requestId; })[0];
    if (!request) { return null; }
    var now = new Date().toISOString();
    request.status = 'cancelada';
    request.updatedAt = now;
    if (!request.timeline) { request.timeline = []; }
    request.timeline.push({ status: 'cancelada', at: now });
    request.note = 'Cancelaste esta solicitud. Puedes volver a enviarla cuando quieras.';
    state.requests = state.requests.slice();
    commit({ type: 'requests:cancel', request: request });
    return request;
  }

  function getRequestForPet(petId) {
    return state.requests.filter(function (request) {
      return request.petId === petId && request.status !== 'cancelada' && request.status !== 'rechazada';
    })[0] || null;
  }

  function requestsByStatus() {
    var groups = { todas: state.requests.length, pendiente: 0, revision: 0, aprobada: 0, rechazada: 0, cancelada: 0 };
    state.requests.forEach(function (request) {
      groups[request.status] = (groups[request.status] || 0) + 1;
    });
    return groups;
  }

  /* Solicitudes activas: alimentan el contador de la navegación */
  function activeRequestCount() {
    return state.requests.filter(function (request) {
      return request.status === 'pendiente' || request.status === 'revision';
    }).length;
  }

  /* Tema ------------------------------------------------------------------ */
  function setTheme(theme) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    window.Storage.set('theme', state.theme);
    applyTheme();
    commit({ type: 'theme:change', theme: state.theme });
    return state.theme;
  }

  function toggleTheme() {
    return setTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  /* Filtros y búsquedas --------------------------------------------------- */
  function setFilters(patch) {
    state.filters = Object.assign({}, state.filters, patch || {});
    persist();
    return state.filters;
  }

  function resetFilters() {
    state.filters = { species: 'todos', search: '', sort: 'recientes', size: '', sex: '', age: '' };
    persist();
    return state.filters;
  }

  function registerSearch(term) {
    var clean = String(term || '').trim();
    if (clean.length < 2) { return; }
    state.searchesCount = (state.searchesCount || 0) + 1;
    state.recentSearches = [clean]
      .concat((state.recentSearches || []).filter(function (item) {
        return window.Format.normalize(item) !== window.Format.normalize(clean);
      }))
      .slice(0, 6);
    persist();
  }

  function dismissTip(id) {
    if (state.tips.dismissed.indexOf(id) !== -1) { return; }
    state.tips.dismissed = state.tips.dismissed.concat([id]);
    commit({ type: 'tips:dismiss', id: id });
  }

  function isTipDismissed(id) { return state.tips.dismissed.indexOf(id) !== -1; }

  /* Reinicio de la demo --------------------------------------------------- */
  function resetDemo() {
    window.Storage.clearAll();
    state = buildInitialState();
    window.Storage.set(KEY, state);
    window.Storage.set('theme', state.theme);
    applyTheme();
    emit({ type: 'demo:reset' });
    return state;
  }

  /* Estadísticas derivadas para la página de Cuenta */
  function stats() {
    return {
      favorites: state.favorites.length,
      requests: state.requests.length,
      active: activeRequestCount(),
      approved: state.requests.filter(function (r) { return r.status === 'aprobada'; }).length,
      adopted: state.requests.filter(function (r) { return r.status === 'aprobada'; }).length
    };
  }

  applyTheme();

  window.State = {
    get: function () { return state; },
    subscribe: subscribe,
    isPersistent: function () { return STORAGE_AVAILABLE; },
    /* Acciones */
    updateUser: updateUser,
    updatePreferences: updatePreferences,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    clearFavorites: clearFavorites,
    createRequest: createRequest,
    cancelRequest: cancelRequest,
    getRequestForPet: getRequestForPet,
    requestsByStatus: requestsByStatus,
    activeRequestCount: activeRequestCount,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    setFilters: setFilters,
    resetFilters: resetFilters,
    registerSearch: registerSearch,
    dismissTip: dismissTip,
    isTipDismissed: isTipDismissed,
    resetDemo: resetDemo,
    stats: stats
  };
})();

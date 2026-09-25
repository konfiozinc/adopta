/* ============================================================================
 * repository.js — Capa de acceso a datos
 * ----------------------------------------------------------------------------
 * Toda lectura/escritura de datos de dominio pasa por aquí. La interfaz nunca
 * conoce la fuente: hoy es un catálogo local en memoria, mañana puede ser
 * `fetch('/api/pets')`, Supabase o Firebase. Basta con reescribir los métodos
 * de `Repository` manteniendo las firmas (todas devuelven Promesas para que el
 * cambio a red no obligue a tocar las vistas).
 * ========================================================================== */
(function () {
  'use strict';

  var PETS = (window.PetsData && window.PetsData.pets) || [];
  var SHELTERS = (window.PetsData && window.PetsData.shelters) || [];

  /* --- Índices para búsquedas O(1) -------------------------------------- */
  var byId = {};
  var shelterById = {};
  PETS.forEach(function (pet) { byId[pet.id] = pet; });
  SHELTERS.forEach(function (shelter) { shelterById[shelter.id] = shelter; });

  /* --- Normalización ----------------------------------------------------- */
  function normalizePet(pet) {
    var health = pet.health || {};
    var photos = (pet.photos || []).slice();
    if (!photos.length) { photos = ['1552053831-71594a27632d']; }

    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      ageMonths: Number(pet.ageMonths) || 0,
      weightKg: Number(pet.weightKg) || 0,
      sex: pet.sex,
      size: pet.size,
      tags: pet.tags || [],
      photos: photos,
      cover: photos[0],
      description: pet.description || '',
      personality: pet.personality || [],
      health: {
        vaccinated: !!health.vaccinated,
        sterilized: !!health.sterilized,
        dewormed: !!health.dewormed,
        microchipped: !!health.microchipped,
        notes: health.notes || ''
      },
      shelterId: pet.shelterId,
      shelter: shelterById[pet.shelterId] || null,
      location: pet.location || (shelterById[pet.shelterId] ? shelterById[pet.shelterId].city : ''),
      featured: !!pet.featured,
      publishedAt: pet.publishedAt || null,
      /* Campos derivados que usan las vistas */
      ageLabel: window.Format.ageLabel(pet.ageMonths),
      weightLabel: window.Format.weightLabel(pet.weightKg),
      sexLabel: window.Format.sexLabel(pet.sex),
      speciesLabel: window.Format.speciesLabel(pet.species),
      speciesIcon: window.Format.speciesIcon(pet.species),
      sizeLabel: window.Format.sizeLabel(pet.size),
      /* Puntuación de salud: alimenta el indicador "salud verificada" */
      healthScore: ['vaccinated', 'sterilized', 'dewormed', 'microchipped']
        .filter(function (k) { return !!health[k]; }).length
    };
  }

  var NORMALIZED = PETS.map(normalizePet);
  NORMALIZED.forEach(function (pet) { byId[pet.id] = pet; });

  /* Texto indexado para búsqueda (nombre + raza + refugio + etiquetas) */
  function searchIndex(pet) {
    return window.Format.normalize([
      pet.name, pet.breed, pet.speciesLabel, pet.location,
      pet.shelter ? pet.shelter.name : '', (pet.tags || []).join(' ')
    ].join(' '));
  }

  var INDEX = {};
  NORMALIZED.forEach(function (pet) { INDEX[pet.id] = searchIndex(pet); });

  /* --- Consultas --------------------------------------------------------- */

  /* Lista de mascotas con filtros combinables.
   * filtros: { species, search, size, sex, age, shelterId, onlyFeatured } */
  function listPets(filters) {
    var f = filters || {};
    var species = window.Format.normalize(f.species || 'todos');
    var search = window.Format.normalize(f.search || '');
    var size = window.Format.normalize(f.size || '');
    var sex = window.Format.normalize(f.sex || '');
    var age = window.Format.normalize(f.age || '');
    var shelter = f.shelterId || '';

    var results = NORMALIZED.filter(function (pet) {
      if (species && species !== 'todos' && species !== 'all' && pet.species !== species) { return false; }
      if (size && pet.size !== size) { return false; }
      if (sex && pet.sex !== sex) { return false; }
      if (shelter && pet.shelterId !== shelter) { return false; }
      if (f.onlyFeatured && !pet.featured) { return false; }

      if (age) {
        var m = pet.ageMonths;
        if (age === 'cachorro' && m >= 12) { return false; }
        if (age === 'joven' && (m < 12 || m > 36)) { return false; }
        if (age === 'adulto' && (m < 36 || m > 84)) { return false; }
        if (age === 'senior' && m < 84) { return false; }
      }

      if (search && INDEX[pet.id].indexOf(search) === -1) { return false; }
      return true;
    });

    return sortPets(results, f.sort);
  }

  function sortPets(list, sort) {
    var mode = sort || 'recientes';
    var copy = list.slice();
    /* Las fichas migradas del sistema fuente pueden no tener fecha de
       publicación: se ordenan siempre después de las fechadas y nunca rompen
       la ordenación. */
    function pubDate(pet) { return pet.publishedAt || ''; }
    copy.sort(function (a, b) {
      switch (mode) {
        case 'nombre':
          return a.name.localeCompare(b.name, 'es');
        case 'edad_asc':
          return a.ageMonths - b.ageMonths;
        case 'edad_desc':
          return b.ageMonths - a.ageMonths;
        case 'destacados':
          if (a.featured !== b.featured) { return a.featured ? -1 : 1; }
          if (!pubDate(a)) { return 1; }
          if (!pubDate(b)) { return -1; }
          return String(pubDate(b)).localeCompare(String(pubDate(a)));
        case 'recientes':
        default:
          if (!pubDate(a)) { return 1; }
          if (!pubDate(b)) { return -1; }
          return String(pubDate(b)).localeCompare(String(pubDate(a)));
      }
    });
    return copy;
  }

  function getPet(id) { return byId[id] || null; }

  function featuredPets(limit) {
    var list = NORMALIZED.filter(function (pet) { return pet.featured; });
    if (list.length < (limit || 6)) {
      /* Completamos con las más recientes para que el carrusel nunca quede pobre */
      var extra = sortPets(NORMALIZED.filter(function (pet) { return !pet.featured; }), 'recientes');
      list = list.concat(extra);
    }
    return list.slice(0, limit || 6);
  }

  /* Recomendaciones: misma especie, distinta mascota, ordenadas por
     parecido de edad y tamaño. */
  function similarPets(pet, limit) {
    if (!pet) { return []; }
    return NORMALIZED
      .filter(function (candidate) { return candidate.id !== pet.id && candidate.species === pet.species; })
      .map(function (candidate) {
        var score = 0;
        if (candidate.size === pet.size) { score += 3; }
        score -= Math.abs(candidate.ageMonths - pet.ageMonths) / 12;
        return { pet: candidate, score: score };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 4)
      .map(function (entry) { return entry.pet; });
  }

  /* Conteos por especie para los chips de filtro */
  function speciesCounts() {
    var counts = { todos: NORMALIZED.length, perro: 0, gato: 0, conejo: 0, otro: 0 };
    NORMALIZED.forEach(function (pet) {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    return counts;
  }

  /* Sugerencias de autocompletado para el buscador */
  function suggest(term, limit) {
    var q = window.Format.normalize(term);
    if (!q) { return []; }
    var seen = {};
    var results = [];

    NORMALIZED.forEach(function (pet) {
      var candidates = [pet.name, pet.breed, pet.shelter ? pet.shelter.name : ''];
      candidates.forEach(function (text) {
        var norm = window.Format.normalize(text);
        if (norm.indexOf(q) !== 0 && norm.indexOf(' ' + q) === -1) { return; }
        var key = norm;
        if (seen[key]) { return; }
        seen[key] = true;
        results.push({ text: text, pet: pet });
      });
    });

    return results.slice(0, limit || 6);
  }

  function listShelters() { return SHELTERS.slice(); }
  function getShelter(id) { return shelterById[id] || null; }

  /* --- Escrituras --------------------------------------------------------
   * En esta demo el catálogo es de solo lectura; las escrituras del usuario
   * (perfil, favoritos, solicitudes) viven en `state.js`. Estos métodos dejan
   * preparada la superficie para un backend real. */

  function createRequest(payload) {
    /* En el futuro: POST /api/requests */
    return Promise.resolve(payload);
  }

  /* Simula latencia de red, útil para probar los esqueletos de carga.
   * Se puede activar con `window.ADOPTA_FAKE_LATENCY = 600`. */
  function withLatency(value) {
    var delay = Number(window.ADOPTA_FAKE_LATENCY) || 0;
    if (!delay) { return Promise.resolve(value); }
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve(value); }, delay);
    });
  }

  window.Repository = {
    /* Catálogo */
    allPets: function () { return withLatency(NORMALIZED.slice()); },
    listPets: function (filters) { return withLatency(listPets(filters)); },
    getPet: function (id) { return withLatency(getPet(id)); },
    featuredPets: function (limit) { return withLatency(featuredPets(limit)); },
    similarPets: function (pet, limit) { return withLatency(similarPets(pet, limit)); },
    speciesCounts: speciesCounts,
    suggest: suggest,
    /* Refugios */
    listShelters: listShelters,
    getShelter: getShelter,
    /* Escrituras */
    createRequest: createRequest,
    /* Utilidades internas reutilizables (síncronas) */
    _sync: {
      listPets: listPets,
      getPet: getPet,
      featuredPets: featuredPets,
      similarPets: similarPets
    }
  };
})();

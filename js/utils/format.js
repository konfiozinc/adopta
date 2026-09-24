/* ============================================================================
 * format.js — Formateo de textos, fechas, edades y pesos (es-ES)
 * ========================================================================== */
(function () {
  'use strict';

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* Quita acentos y pasa a minúsculas: hace la búsqueda tolerante a tildes
   * ("milo" encuentra "Milo", "caniche" encuentra "Caniché"). */
  function normalize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /* Primera letra en mayúscula (para nombres de especie, etc.) */
  function capitalize(text) {
    var s = String(text || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* Pluraliza etiquetas sencillas: 1 mascota / 3 mascotas */
  function plural(count, singular, pluralForm) {
    var n = Number(count) || 0;
    return n + ' ' + (n === 1 ? singular : (pluralForm || singular + 's'));
  }

  /* --- Fechas ------------------------------------------------------------ */
  function toDate(value) {
    if (value instanceof Date) { return value; }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /* 12 mar 2025 */
  function shortDate(value) {
    var d = toDate(value);
    if (!d) { return '—'; }
    return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* 12 de marzo de 2025 */
  function longDate(value) {
    var d = toDate(value);
    if (!d) { return '—'; }
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
  }

  /* "Hace 3 días", "Hoy", "Hace 2 meses" */
  function relative(value) {
    var d = toDate(value);
    if (!d) { return '—'; }
    var diff = Date.now() - d.getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) { return 'Hace un momento'; }
    if (mins < 60) { return 'Hace ' + plural(mins, 'minuto'); }
    var hours = Math.round(mins / 60);
    if (hours < 24) { return 'Hace ' + plural(hours, 'hora'); }
    var days = Math.round(hours / 24);
    if (days === 1) { return 'Ayer'; }
    if (days < 30) { return 'Hace ' + plural(days, 'día'); }
    var months = Math.round(days / 30);
    if (months < 12) { return 'Hace ' + plural(months, 'mes', 'meses'); }
    var years = Math.round(months / 12);
    return 'Hace ' + plural(years, 'año');
  }

  /* --- Edad -------------------------------------------------------------- */
  /* Convierte meses a una etiqueta legible: "3 meses", "1 año", "2 años y 6 meses".
   * Hasta los 11 meses se expresa en meses; a partir de ahí, en años. */
  function ageLabel(months) {
    var m = Math.max(0, Math.round(Number(months) || 0));
    if (m < 1) { return 'Recién nacido'; }
    if (m < 12) { return plural(m, 'mes', 'meses'); }
    var years = Math.floor(m / 12);
    var rest = m % 12;
    var base = plural(years, 'año');
    if (rest === 0) { return base; }
    return base + ' y ' + plural(rest, 'mes', 'meses');
  }

  /* --- Peso -------------------------------------------------------------- */
  function weightLabel(kg) {
    var n = Number(kg);
    if (!n || isNaN(n)) { return '—'; }
    var txt = n % 1 === 0 ? String(n) : n.toFixed(1).replace('.', ',');
    return txt + ' kg';
  }

  /* --- Sexo y especie ---------------------------------------------------- */
  var SEX_LABEL = { macho: 'Macho', hembra: 'Hembra' };
  var SPECIES_LABEL = { perro: 'Perro', gato: 'Gato', conejo: 'Conejo', otro: 'Otro' };
  var SPECIES_ICON = { perro: 'dog', gato: 'cat', conejo: 'rabbit', otro: 'other' };
  var SPECIES_PLURAL = { perro: 'Perros', gato: 'Gatos', conejo: 'Conejos', otro: 'Otros' };

  function sexLabel(sex) { return SEX_LABEL[normalize(sex)] || capitalize(sex || '—'); }
  function speciesLabel(species) { return SPECIES_LABEL[normalize(species)] || capitalize(species || '—'); }
  function speciesPlural(species) { return SPECIES_PLURAL[normalize(species)] || capitalize(species || '') + 's'; }
  function speciesIcon(species) { return SPECIES_ICON[normalize(species)] || 'other'; }

  /* Tamaño según peso, útil como filtro y como etiqueta informativa */
  function sizeLabel(size) {
    var map = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande' };
    return map[normalize(size)] || 'Mediano';
  }

  var STATUS_LABEL = {
    pendiente: 'Pendiente',
    revision: 'En revisión',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada'
  };
  var STATUS_BADGE = {
    pendiente: 'badge--warning',
    revision: 'badge--info',
    aprobada: 'badge--success',
    rechazada: 'badge--danger',
    cancelada: ''
  };
  var STATUS_ICON = {
    pendiente: 'clock',
    revision: 'info',
    aprobada: 'checkCircle',
    rechazada: 'close',
    cancelada: 'close'
  };
  function statusLabel(status) { return STATUS_LABEL[normalize(status)] || capitalize(status || ''); }
  function statusBadge(status) { return STATUS_BADGE[normalize(status)] || ''; }
  function statusIcon(status) { return STATUS_ICON[normalize(status)] || 'info'; }

  /* --- Iniciales para avatares ------------------------------------------ */
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) { return '?'; }
    if (parts.length === 1) { return parts[0].slice(0, 2).toUpperCase(); }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* --- Correo y teléfono ------------------------------------------------- */
  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value || '').trim());
  }
  function isPhone(value) {
    var digits = String(value || '').replace(/[^\d]/g, '');
    return digits.length >= 9 && digits.length <= 15;
  }

  /* Resalta el término buscado dentro de un texto (devuelve HTML seguro) */
  function highlight(text, term) {
    var safe = window.Dom.escape(text);
    var q = normalize(term);
    if (!q) { return safe; }
    var idx = normalize(text).indexOf(q);
    if (idx < 0) { return safe; }
    return safe.slice(0, idx) + '<mark>' + safe.slice(idx, idx + q.length) + '</mark>' + safe.slice(idx + q.length);
  }

  window.Format = {
    normalize: normalize,
    capitalize: capitalize,
    plural: plural,
    shortDate: shortDate,
    longDate: longDate,
    relative: relative,
    ageLabel: ageLabel,
    weightLabel: weightLabel,
    sexLabel: sexLabel,
    speciesLabel: speciesLabel,
    speciesPlural: speciesPlural,
    speciesIcon: speciesIcon,
    sizeLabel: sizeLabel,
    statusLabel: statusLabel,
    statusBadge: statusBadge,
    statusIcon: statusIcon,
    initials: initials,
    isEmail: isEmail,
    isPhone: isPhone,
    highlight: highlight
  };
})();

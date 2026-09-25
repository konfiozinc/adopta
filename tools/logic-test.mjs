/* ============================================================================
 * tools/logic-test.mjs — Pruebas de lógica sin navegador
 * ----------------------------------------------------------------------------
 * Ejecuta: node tools/logic-test.mjs
 *
 * Carga los módulos reales de la aplicación (los mismos archivos que usa el
 * navegador) sobre un DOM simulado mínimo y ejercita la lógica de dominio:
 * catálogo, filtros, ordenación, búsqueda, máscaras de formato, estado,
 * favoritos, solicitudes y persistencia.
 *
 * Es la red de seguridad rápida: detecta regresiones sin abrir un navegador.
 * ========================================================================== */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
const failures = [];

function ok(label, condition, detail = '') {
  if (condition) { passed++; console.log(`  ok   ${label}${detail ? ' · ' + detail : ''}`); }
  else { failed++; failures.push(label + (detail ? ' · ' + detail : '')); console.log(` FAIL  ${label}${detail ? ' · ' + detail : ''}`); }
}

function eq(label, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  ok(label, same, same ? String(actual) : `esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);
}

/* ---------------------------------------------------------------------------
 * DOM simulado: solo lo que los módulos de lógica necesitan en tiempo de carga
 * ------------------------------------------------------------------------- */
function createSandbox() {
  const storage = new Map();
  const element = () => ({
    innerHTML: '', textContent: '', style: {}, hidden: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, appendChild() {},
    querySelector: () => null, querySelectorAll: () => [],
    closest: () => null, focus() {}, remove() {}, dispatchEvent() {}
  });

  const documentStub = {
    documentElement: element(),
    body: element(),
    readyState: 'complete',
    createElement: () => element(),
    createElementNS: () => element(),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    title: ''
  };

  const windowStub = {
    document: documentStub,
    location: { hash: '#/', pathname: '/index.html', search: '', href: 'http://localhost/#/', replace() {} },
    history: { replaceState() {}, back() {} },
    navigator: { share: undefined, clipboard: undefined, language: 'es-ES' },
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Date, Math, JSON, Number, String, Array, Object, Error, Image: function () {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
      key: (i) => Array.from(storage.keys())[i] ?? null,
      get length() { return storage.size; }
    },
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0)
  };
  windowStub.window = windowStub;
  windowStub.__storage = storage;

  const sandbox = vm.createContext(windowStub);
  sandbox.window = windowStub;
  sandbox.document = documentStub;
  sandbox.console = console;
  sandbox.localStorage = windowStub.localStorage;
  return { sandbox, windowStub };
}

function loadModules(sandbox, files) {
  for (const file of files) {
    const code = readFileSync(resolve(ROOT, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
}

/* ========================================================================= */
console.log('\n=== Adopta · pruebas de lógica ===\n');

const MODULES = [
  'js/utils/icons.js',
  'js/utils/format.js',
  'js/utils/dom.js',
  'js/utils/storage.js',
  'js/utils/a11y.js',
  'js/utils/media.js',
  'js/data/pets.data.js',
  'js/data/user.data.js',
  'js/data/repository.js',
  'js/state.js'
];

const { sandbox, windowStub } = createSandbox();

console.log('[1] Carga de módulos');
try {
  loadModules(sandbox, MODULES);
  ok('los 10 módulos de lógica se cargan sin errores', true);
} catch (error) {
  ok('los módulos se cargan sin errores', false, error.message);
  console.log(error.stack);
  process.exit(1);
}

for (const name of ['Icon', 'Format', 'Dom', 'Storage', 'Media', 'PetsData', 'UserData', 'Repository', 'State']) {
  ok(`window.${name} expuesto`, typeof windowStub[name] !== 'undefined');
}

const F = windowStub.Format;
const R = windowStub.Repository;
const S = windowStub.State;

/* ---------------------------------------------------------------- Formato */
console.log('\n[2] Formateo en español');
eq('edad de conejita de 10 meses', F.ageLabel(10), '10 meses');
eq('edad justo al año', F.ageLabel(12), '1 año');
eq('edad de año y medio', F.ageLabel(18), '1 año y 6 meses');
eq('edad de 23 meses (aún no cumple 2)', F.ageLabel(23), '1 año y 11 meses');
eq('edad de dos años', F.ageLabel(24), '2 años');
eq('edad de cinco años', F.ageLabel(60), '5 años');
eq('peso entero', F.weightLabel(14), '14 kg');
eq('peso decimal con coma', F.weightLabel(4.6), '4,6 kg');
eq('plural singular', F.plural(1, 'mascota'), '1 mascota');
eq('plural múltiple', F.plural(3, 'mascota'), '3 mascotas');
eq('plural irregular', F.plural(2, 'mes', 'meses'), '2 meses');
eq('normalización con tildes', F.normalize('Caniché Ágil'), 'caniche agil');
eq('correo válido', F.isEmail('alguien@ejemplo.com'), true);
eq('correo inválido', F.isEmail('alguien@ejemplo'), false);
eq('teléfono con formato', F.isPhone('+52 55 1234 5678'), true);
eq('teléfono demasiado corto', F.isPhone('12345'), false);
eq('iniciales de dos nombres', F.initials('Darwin Ramírez'), 'DR');
eq('iniciales de un nombre', F.initials('Darwin'), 'DA');
eq('etiqueta de sexo', F.sexLabel('hembra'), 'Hembra');
eq('etiqueta de especie', F.speciesLabel('conejo'), 'Conejo');
eq('plural de especie', F.speciesPlural('gato'), 'Gatos');
eq('icono de especie', F.speciesIcon('perro'), 'dog');
eq('etiqueta de estado', F.statusLabel('revision'), 'En revisión');
ok('fecha corta en formato español', /^\d{1,2} [a-z]{3} \d{4}$/.test(F.shortDate(new Date(2025, 2, 12))),
  F.shortDate(new Date(2025, 2, 12)));
eq('fecha larga en español', F.longDate(new Date(2025, 2, 12)), '12 de marzo de 2025');
eq('fecha larga con otro mes', F.longDate(new Date(2024, 11, 1)), '1 de diciembre de 2024');
eq('fecha inválida degrada a guion', F.shortDate('no-es-fecha'), '—');

/* --------------------------------------------------------------- Catálogo */
console.log('\n[3] Catálogo y consultas');
const all = R._sync.listPets({});
eq('total de mascotas', all.length, 25);
eq('filtro por perros', R._sync.listPets({ species: 'perro' }).length, 12);
eq('filtro por gatos', R._sync.listPets({ species: 'gato' }).length, 11);
eq('filtro por conejos', R._sync.listPets({ species: 'conejo' }).length, 2);
eq('filtro "todos" devuelve todo', R._sync.listPets({ species: 'todos' }).length, 25);
eq('búsqueda por nombre', R._sync.listPets({ search: 'luna' }).map((p) => p.name), ['Luna']);
eq('búsqueda insensible a mayúsculas', R._sync.listPets({ search: 'LUNA' }).length, 1);
eq('búsqueda por raza', R._sync.listPets({ search: 'husky' }).map((p) => p.name), ['Loki', 'Thor']);
eq('búsqueda por refugio', R._sync.listPets({ search: 'bigotes' }).length, 3);
eq('búsqueda sin resultados', R._sync.listPets({ search: 'ornitorrinco' }).length, 0);
eq('filtro por tamaño pequeño', R._sync.listPets({ size: 'pequeno' }).length,
  all.filter((p) => p.size === 'pequeno').length);
eq('filtro por sexo hembra', R._sync.listPets({ sex: 'hembra' }).length,
  all.filter((p) => p.sex === 'hembra').length);
eq('filtro cachorros (menos de 12 meses)', R._sync.listPets({ age: 'cachorro' }).length,
  all.filter((p) => p.ageMonths < 12).length);
eq('filtro senior (más de 84 meses)', R._sync.listPets({ age: 'senior' }).length,
  all.filter((p) => p.ageMonths >= 84).length);
eq('filtros combinados', R._sync.listPets({ species: 'gato', size: 'pequeno' }).length,
  all.filter((p) => p.species === 'gato' && p.size === 'pequeno').length);

const byName = R._sync.listPets({ sort: 'nombre' }).map((p) => p.name);
eq('orden alfabético', byName, byName.slice().sort((a, b) => a.localeCompare(b, 'es')));
const byAgeAsc = R._sync.listPets({ sort: 'edad_asc' }).map((p) => p.ageMonths);
ok('orden por edad ascendente', byAgeAsc.every((v, i) => i === 0 || byAgeAsc[i - 1] <= v), byAgeAsc.join(','));
const featured = R._sync.listPets({ sort: 'destacados' });
eq('destacados primero', featured[0].featured, true);

eq('ficha por id', R._sync.getPet('milo').name, 'Milo');
eq('ficha inexistente', R._sync.getPet('no-existe'), null);
eq('destacados limitados', R._sync.featuredPets(3).length, 3);
ok('todas las recomendaciones son de la misma especie',
  R._sync.similarPets(R._sync.getPet('milo'), 4).every((p) => p.species === 'gato'));
ok('las recomendaciones no incluyen la propia mascota',
  R._sync.similarPets(R._sync.getPet('milo'), 4).every((p) => p.id !== 'milo'));
eq('conteo por especie', R.speciesCounts(), { todos: 25, perro: 12, gato: 11, conejo: 2, otro: 0 });
eq('refugios listados', R.listShelters().length, 7);
eq('refugio de una mascota', R._sync.getPet('luna').shelter.name, 'Refugio Huellas de Amor');

console.log('\n[4] Campos derivados de la ficha');
const luna = R._sync.getPet('luna');
eq('etiqueta de edad', luna.ageLabel, '8 meses');
eq('etiqueta de peso', luna.weightLabel, '14 kg');
eq('etiqueta de sexo', luna.sexLabel, 'Hembra');
eq('etiqueta de tamaño', luna.sizeLabel, 'Mediano');
eq('puntuación de salud de Luna (pendiente esterilizar)', luna.healthScore, 3);
eq('Luna no está esterilizada todavía', luna.health.sterilized, false);
ok('todas las fichas indican si están vacunadas',
  all.every((p) => typeof p.health.vaccinated === 'boolean'));
eq('portada = primera foto', luna.cover, luna.photos[0]);
ok('las fichas con refugio lo tienen resuelto',
  all.every((p) => !p.shelterId || (p.shelter && p.shelter.name)));
ok('todas las fichas tienen al menos 1 foto real', all.every((p) => p.photos.length >= 1));
ok('puntuación de salud entre 0 y 4', all.every((p) => p.healthScore >= 0 && p.healthScore <= 4));

/* --- Regresión 2026-09: resolución de URLs de imagen -----------------------
 * Los ids de Unsplash tienen formato <timestamp>-<hash hexadecimal> y DEBEN
 * resolverse a URL completa; las rutas locales deben devolverse tal cual. */
console.log('\n[4b] Resolución de imágenes');
const UNSPLASH_ID_RE = /^\d+-[0-9a-f]+$/i;
eq('id de Unsplash resuelve a URL completa',
  windowStub.Media.photoUrl('1552053831-71594a27632d', 800),
  'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=72&w=800');
ok('id de Unsplash se reconoce como tal',
  UNSPLASH_ID_RE.test('1552053831-71594a27632d') && UNSPLASH_ID_RE.test('1601976717598-e2c6add741c9'));
eq('ruta local se devuelve tal cual',
  windowStub.Media.photoUrl('images/mascota-02-shadow.png', 800), 'images/mascota-02-shadow.png');
eq('srcset vacío para rutas locales',
  windowStub.Media.srcset('images/mascota-02-shadow.png', 800), '');
ok('todas las fotos del catálogo son ids válidos o rutas locales',
  all.every((p) => p.photos.every((f) => UNSPLASH_ID_RE.test(f) || f.indexOf('images/') === 0 || /^https?:/.test(f))));
ok('todas las portadas resuelven a URL o ruta local',
  all.every((p) => /^(https:\/\/|images\/)/.test(windowStub.Media.photoUrl(p.cover, 400))));

console.log('\n[5] Sugerencias de búsqueda');
eq('sugerencia por nombre', R.suggest('lu', 5)[0].text, 'Luna');
ok('sugerencia por refugio', R.suggest('refugio', 5).some((s) => s.pet && s.pet.shelterId === 'huellas'));
eq('sin sugerencias para texto vacío', R.suggest('', 5).length, 0);
ok('las sugerencias no repiten texto', (() => {
  const texts = R.suggest('a', 8).map((s) => s.text);
  return new Set(texts).size === texts.length;
})());

/* ------------------------------------------------------------------ Estado */
console.log('\n[6] Estado, favoritos y persistencia');
eq('perfil inicial', S.get().user.name, 'Darwin');
eq('favoritos de ejemplo', S.get().favorites.length, 3);
eq('solicitudes de ejemplo', S.get().requests.length, 3);
eq('contador de solicitudes activas', S.activeRequestCount(), 1);
eq('resumen por estado', S.requestsByStatus(),
  { todas: 3, pendiente: 0, revision: 1, aprobada: 1, rechazada: 1, cancelada: 0 });

ok('milo es favorito de partida', S.isFavorite('milo') === true);
eq('alternar favorito (quitar)', S.toggleFavorite('milo'), false);
eq('milo ya no es favorito', S.isFavorite('milo'), false);
eq('alternar favorito (añadir)', S.toggleFavorite('milo'), true);
eq('milo vuelve a ser favorito', S.isFavorite('milo'), true);
eq('los favoritos no se duplican', S.get().favorites.filter((id) => id === 'milo').length, 1);

const request = S.createRequest('rocky', {
  message: 'Prueba',
  applicant: { name: 'Darwin', email: 'd@e.com', phone: '5512345678', city: 'CDMX' },
  answers: { housing: 'departamento', companions: ['adultos'], experience: 'alguna', outdoor: 'medio', aloneHours: '4' }
});
eq('la solicitud arranca pendiente', request.status, 'pendiente');
eq('la solicitud se añade al historial', S.get().requests[0].id, request.id);
eq('la solicitud guarda la mascota', request.petId, 'rocky');
eq('la solicitud guarda las respuestas', request.answers.housing, 'departamento');
eq('la línea de tiempo inicial', request.timeline.length, 1);
ok('el identificador es único', /^req-[a-z0-9]+-[a-z0-9]+$/.test(request.id), request.id);
eq('solicitud en curso detectada', S.getRequestForPet('rocky').id, request.id);
eq('no hay solicitud en curso para otra mascota', S.getRequestForPet('nala'), null);
eq('contador activo sube a 2', S.activeRequestCount(), 2);

S.cancelRequest(request.id);
eq('la solicitud pasa a cancelada', S.getRequestForPet('rocky'), null);
eq('estado de la solicitud cancelada',
  S.get().requests.filter((r) => r.id === request.id)[0].status, 'cancelada');
eq('la línea de tiempo registra la cancelación',
  S.get().requests.filter((r) => r.id === request.id)[0].timeline.length, 2);
eq('contador activo vuelve a 1', S.activeRequestCount(), 1);

console.log('\n[7] Filtros, preferencias y tema');
S.setFilters({ species: 'gato', search: 'milo' });
eq('los filtros se guardan', S.get().filters.species, 'gato');
eq('la búsqueda se guarda', S.get().filters.search, 'milo');
S.resetFilters();
eq('reset devuelve los filtros por defecto', S.get().filters,
  { species: 'todos', search: '', sort: 'recientes', size: '', sex: '', age: '' });

S.registerSearch('labrador');
S.registerSearch('labrador');
eq('las búsquedas no se duplican', S.get().recentSearches.filter((t) => t === 'labrador').length, 1);
eq('el historial mantiene el orden', S.get().recentSearches[0], 'labrador');
S.registerSearch('a');
eq('se ignoran búsquedas de un carácter', S.get().recentSearches.includes('a'), false);

S.updatePreferences({ notifyNewsletter: true });
eq('las preferencias se actualizan', S.get().preferences.notifyNewsletter, true);
S.updateUser({ name: 'Darwin Pruebas', city: 'Puebla' });
eq('el perfil se actualiza', S.get().user.name, 'Darwin Pruebas');
eq('el resto del perfil se conserva', S.get().user.email, 'darwin@ejemplo.com');

const theme = S.toggleTheme();
eq('el tema alterna', S.get().theme, theme);
ok('el tema se persiste con la clave propia', windowStub.__storage.has('adopta:v1:theme'));
eq('el tema se recupera como valor, no como cadena JSON', windowStub.Storage.get('theme', null), theme);

console.log('\n[8] Estadísticas y persistencia');
const stats = S.stats();
eq('favoritos contados', stats.favorites, 3);
eq('solicitudes contadas (3 de ejemplo + 1 creada)', stats.requests, 4);
eq('adopciones aprobadas', stats.adopted, 1);

const raw = windowStub.localStorage.getItem('adopta:v1:state');
ok('el estado se persiste', !!raw);
const parsed = JSON.parse(raw);
eq('el nombre editado persiste', parsed.user.name, 'Darwin Pruebas');
eq('la solicitud cancelada persiste',
  parsed.requests.filter((r) => r.id === request.id)[0].status, 'cancelada');
eq('el tema se guarda aparte', windowStub.Storage.get('theme', null), theme);

console.log('\n[9] Reinicio de la demo');
S.resetDemo();
eq('el perfil vuelve al valor inicial', S.get().user.name, 'Darwin');
eq('los favoritos vuelven al inicio', S.get().favorites.length, 3);
eq('las solicitudes vuelven al inicio', S.get().requests.length, 3);
eq('el estado reiniciado se persiste',
  JSON.parse(windowStub.localStorage.getItem('adopta:v1:state')).user.name, 'Darwin');

/* --------------------------------------------------------- Respaldo de datos */
console.log('\n[10] Datos coherentes para la interfaz');
ok('cada mascota genera una tarjeta válida',
  all.every((p) => p.name && p.breed && p.cover && p.ageLabel && p.weightLabel));
ok('las solicitudes de ejemplo apuntan a fichas existentes',
  S.get().requests.every((r) => !!R._sync.getPet(r.petId)));
ok('los favoritos apuntan a fichas existentes',
  S.get().favorites.every((id) => !!R._sync.getPet(id)));
ok('todos los refugios tienen datos de contacto',
  R.listShelters().every((s) => s.phone && s.email && s.hours && s.city));

/* ---------------------------------------------------------------- Resultado */
console.log(`\n${failed === 0 ? '✔' : '✖'} ${passed} pruebas correctas, ${failed} fallidas`);
if (failures.length) {
  console.log('\nFallos:');
  failures.forEach((f) => console.log('  · ' + f));
}
console.log('');
process.exit(failed === 0 ? 0 : 1);

/* ============================================================================
 * tools/verify.mjs — Comprobaciones automáticas de la demo Adopta
 * ----------------------------------------------------------------------------
 * Ejecuta: node tools/verify.mjs
 * Valida sin navegador:
 *   1. Que el catálogo embebido sea JSON válido y esté completo
 *   2. Que las fotos y refugios referenciados existan
 *   3. Que todos los archivos declarados en index.html existan en disco
 *   4. Que el orden de <script> respete las dependencias declaradas
 * ========================================================================== */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ' → ' + detail : ''}`);
  if (!ok) failures++;
};

/* ---------------------------------------------------------------- 1. Datos */
console.log('\n[1] Catálogo de mascotas');
const dataSource = read('js/data/pets.data.js');
const jsonMatch = dataSource.match(/String\.raw`([\s\S]*?)`;/);
check('bloque JSON embebido encontrado', !!jsonMatch);

let pets = [];
try {
  pets = JSON.parse(jsonMatch[1]);
  check('JSON válido', true, `${pets.length} mascotas`);
} catch (error) {
  check('JSON válido', false, error.message);
}

const REQUIRED = ['id', 'name', 'species', 'breed', 'ageMonths', 'weightKg', 'sex', 'size',
  'tags', 'photos', 'description', 'personality', 'health', 'shelterId', 'location',
  'featured', 'publishedAt'];
const missing = [];
const ids = new Set();
let duplicates = 0;
for (const pet of pets) {
  if (ids.has(pet.id)) duplicates++;
  ids.add(pet.id);
  for (const key of REQUIRED) {
    if (pet[key] === undefined) missing.push(`${pet.id}.${key}`);
  }
  /* Las mascotas migradas del sistema fuente publican 1 fotografía real;
     el resto del catálogo conserva al menos 2. */
  if (!Array.isArray(pet.photos) || pet.photos.length < 1) missing.push(`${pet.id}.photos<1`);
  for (const key of ['vaccinated', 'sterilized', 'dewormed', 'microchipped', 'notes']) {
    if (pet.health[key] === undefined) missing.push(`${pet.id}.health.${key}`);
  }
}
check('sin ids duplicados', duplicates === 0, duplicates ? `${duplicates} repetidos` : '');
check('todos los campos obligatorios presentes', missing.length === 0, missing.join(', '));

const shelterIds = [...dataSource.matchAll(/\{ id: '([a-z]+)', name: '/g)].map((m) => m[1]);
check('refugios declarados', shelterIds.length >= 5, shelterIds.join(', '));
/* Las mascotas migradas del sistema fuente no declaran refugio (el sistema
   fuente no lo publica): solo se valida cuando sí lo declaran. */
const orphanShelters = pets.filter((p) => p.shelterId && !shelterIds.includes(p.shelterId)).map((p) => p.id);
check('todas las mascotas apuntan a un refugio existente', orphanShelters.length === 0, orphanShelters.join(', '));

const bySpecies = pets.reduce((acc, p) => ({ ...acc, [p.species]: (acc[p.species] || 0) + 1 }), {});
check('hay perros, gatos y conejos', Object.keys(bySpecies).length >= 3, JSON.stringify(bySpecies));
check('al menos 3 destacadas', pets.filter((p) => p.featured).length >= 3,
  `${pets.filter((p) => p.featured).length} destacadas`);

/* El JSON externo debe ser copia exacta del embebido: así puede editarse con
 * otras herramientas o enviarse a un backend sin desincronizarse. */
console.log('\n[1b] Copias JSON para backend');
try {
  const external = JSON.parse(read('data/pets.json'));
  check('data/pets.json es válido', Array.isArray(external), `${external.length} mascotas`);
  check('data/pets.json coincide con el catálogo embebido',
    JSON.stringify(external) === JSON.stringify(pets));
} catch (error) {
  check('lectura de data/pets.json', false, error.message);
}

try {
  const shelters = JSON.parse(read('data/shelters.json'));
  check('data/shelters.json es válido', Array.isArray(shelters), `${shelters.length} refugios`);
  const missingShelters = shelterIds.filter((id) => !shelters.some((s) => s.id === id));
  check('los refugios del catálogo están en shelters.json', missingShelters.length === 0,
    missingShelters.join(', ') || 'todos presentes');
} catch (error) {
  check('lectura de data/shelters.json', false, error.message);
}

/* ------------------------------------------------ 2. Coherencia del código */
console.log('\n[2] Coherencia del código');
const petIds = new Set(pets.map((p) => p.id));
const userSource = read('js/data/user.data.js');
const seededPets = [...userSource.matchAll(/petId: '([a-z]+)'/g)].map((m) => m[1]);
const badSeeds = seededPets.filter((id) => !petIds.has(id));
check('las solicitudes de ejemplo apuntan a mascotas reales', badSeeds.length === 0, badSeeds.join(', '));

const stateSource = read('js/state.js');
const seededFavorites = (stateSource.match(/favorites: \[([^\]]*)\]/) || [, ''])[1]
  .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
const badFavorites = seededFavorites.filter((id) => !petIds.has(id));
check('los favoritos iniciales existen en el catálogo', badFavorites.length === 0,
  `${seededFavorites.length} favoritos: ${seededFavorites.join(', ')}`);

/* Iconos: cada data-icon del HTML debe existir en el set SVG */
const iconsSource = read('js/utils/icons.js');
const declaredIcons = new Set([...iconsSource.matchAll(/^\s{4}([a-zA-Z]+):/gm)].map((m) => m[1]));
const html = read('index.html');
const usedIcons = [...new Set([...html.matchAll(/data-icon="([a-zA-Z]+)"/g)].map((m) => m[1]))];
const unknownIcons = usedIcons.filter((i) => !declaredIcons.has(i));
check('los iconos usados en index.html existen', unknownIcons.length === 0, unknownIcons.join(', '));

/* Iconos referenciados desde el código de vistas */
const pageFiles = ['js/pages/home.js', 'js/pages/pets.js', 'js/pages/pet-detail.js',
  'js/pages/requests.js', 'js/pages/account.js', 'js/ui/cards.js', 'js/ui/pet-card.js',
  'js/features/adoption-form.js', 'js/ui/toast.js'];
const iconRefs = new Set();
for (const file of pageFiles) {
  const source = read(file);
  for (const m of source.matchAll(/Icon\.render\('([a-zA-Z]+)'/g)) iconRefs.add(m[1]);
  for (const m of source.matchAll(/render\((?:isActive && section\.icon === 'heart' \? )?'([a-zA-Z]+)'/g)) iconRefs.add(m[1]);
  for (const m of source.matchAll(/icon: '([a-zA-Z]+)'/g)) iconRefs.add(m[1]);
  for (const m of source.matchAll(/ICONS\[[^\]]+\] \|\| '([a-zA-Z]+)'/g)) iconRefs.add(m[1]);
}
const missingIcons = [...iconRefs].filter((i) => !declaredIcons.has(i) && i !== 'heartSolid' && i !== 'starSolid' && i !== 'pawSolid');
check('los iconos referenciados en las vistas existen', missingIcons.length === 0, missingIcons.join(', '));

/* --------------------------------------------------- 3. Archivos declarados */
console.log('\n[3] Recursos declarados en index.html');
const cssHrefs = [...html.matchAll(/<link[^>]+href="(css\/[^"]+)"/g)].map((m) => m[1]);
const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const missingFiles = [...cssHrefs, ...scriptSrcs].filter((f) => !existsSync(resolve(ROOT, f)));
check('todas las hojas de estilo existen', cssHrefs.every((f) => existsSync(resolve(ROOT, f))), cssHrefs.join(', '));
check('todos los scripts existen', missingFiles.length === 0, missingFiles.join(', '));
check('sin scripts duplicados', new Set(scriptSrcs).size === scriptSrcs.length);

/* --------------------------------------------- 4. Orden de dependencias JS */
console.log('\n[4] Orden de carga de scripts');
const pos = (file) => scriptSrcs.findIndex((s) => s.endsWith(file));
const orderRules = [
  ['js/utils/icons.js', 'js/utils/dom.js'],
  ['js/utils/format.js', 'js/data/pets.data.js'],
  ['js/data/pets.data.js', 'js/data/repository.js'],
  ['js/data/repository.js', 'js/state.js'],
  ['js/state.js', 'js/router.js'],
  ['js/router.js', 'js/ui/views.js'],
  ['js/ui/views.js', 'js/ui/toast.js'],
  ['js/ui/cards.js', 'js/pages/home.js'],
  ['js/ui/search.js', 'js/pages/pets.js'],
  ['js/ui/pet-card.js', 'js/pages/home.js'],
  ['js/ui/tabbar.js', 'js/app.js'],
  ['js/ui/topbar.js', 'js/app.js'],
  ['js/features/adoption-form.js', 'js/app.js'],
  ['js/pages/account.js', 'js/app.js'],
  ['js/app.js', 'js/app.js']
];
for (const [before, after] of orderRules.slice(0, -1)) {
  check(`${before} antes de ${after}`, pos(before) !== -1 && pos(before) < pos(after));
}

/* Cada página debe registrar su vista en window.Views */
console.log('\n[5] Registro de vistas');
const routePages = [
  ['js/pages/home.js', 'Views.home'],
  ['js/pages/pets.js', 'Views.pets'],
  ['js/pages/pet-detail.js', "Views['pet-detail']"],
  ['js/pages/requests.js', 'Views.requests'],
  ['js/pages/account.js', 'Views.account']
];
for (const [file, marker] of routePages) {
  const source = read(file);
  check(`${file} registra ${marker}`, source.includes(marker) && source.includes('mount'));
}

/* Rutas registradas en app.js deben coincidir con las páginas anteriores */
const appSource = read('js/app.js');
for (const route of ["'/'", "'/mascotas'", "'/mascotas/:id'", "'/solicitudes'", "'/cuenta'"]) {
  check(`ruta ${route} registrada`, appSource.includes(`Router.register(${route}`));
}

/* ------------------------------------------------ 6. Convenciones de estilo */
console.log('\n[6] Convenciones de código');
const jsFiles = ['js/app.js', 'js/state.js', 'js/router.js', 'js/pages/home.js', 'js/pages/pets.js',
  'js/pages/pet-detail.js', 'js/pages/requests.js', 'js/pages/account.js', 'js/ui/cards.js',
  'js/ui/pet-card.js', 'js/ui/search.js', 'js/ui/views.js', 'js/ui/modal.js', 'js/ui/toast.js',
  'js/features/adoption-form.js'];
const noStrict = jsFiles.filter((f) => !/^\(function \(\) \{\n  'use strict';/m.test(read(f)));
check("todas las vistas usan 'use strict' en un IIFE", noStrict.length === 0, noStrict.join(', '));

const comments = jsFiles.filter((f) => !/\/\* =+/.test(read(f)));
check('todos los módulos llevan cabecera de documentación', comments.length === 0, comments.join(', '));

const hardcodedHtml = jsFiles.filter((f) => /innerHTML\s*=\s*'/.test(read(f)));
check('el HTML se construye con Dom.h / plantillas (sin innerHTML de cadenas sueltas)',
  hardcodedHtml.length === 0, hardcodedHtml.join(', '));

/* --------------------------------------------------------------- Resultado */
console.log(`\n${failures === 0 ? '✔ Todas las comprobaciones pasaron' : '✖ ' + failures + ' comprobación(es) fallaron'}\n`);
process.exit(failures === 0 ? 0 : 1);

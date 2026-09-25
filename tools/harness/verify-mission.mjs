#!/usr/bin/env node
/* ============================================================================
 * tools/harness/verify-mission.mjs — Harness de verificación de la misión
 * "adopta-rebuild"
 * ----------------------------------------------------------------------------
 * Evalúa el repositorio, ejecuta las suites del proyecto, comprueba el sitio
 * publicado y aplica el GATE obligatorio de la misión: la SEGUNDA COMPARACIÓN
 * contra el sistema fuente. Sin ella, el resultado se anula (score 0 y
 * exit code 1), tal y como exige la misión.
 *
 * Uso:
 *   node tools/harness/verify-mission.mjs [--json]
 *
 * Variables de entorno opcionales:
 *   SITE_URL       sitio publicado      (defecto: https://konfiozinc.github.io/adopta)
 *   SOURCE_URL     sistema fuente       (defecto: URL de ecnlatamacademy)
 *   SOURCE_API     API del sistema      (defecto: …/api/index.php)
 *   EVIDENCE_FILE  evidencia 2ª pasada  (defecto: mission/evidencia/segunda-pasada.md)
 * ========================================================================== */
import { readFile, stat, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Raíz del repositorio: se calcula desde la ubicación de este archivo para
 * que el harness funcione desde cualquier directorio de trabajo. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const exec = promisify(execFile);

const SITE = process.env.SITE_URL ?? 'https://konfiozinc.github.io/adopta';
const SOURCE = process.env.SOURCE_URL ??
  'https://ecnlatamacademy.com/practicas/saas/sistema/adopta/app/';
const SOURCE_API = process.env.SOURCE_API ??
  'https://ecnlatamacademy.com/practicas/saas/sistema/adopta/api/index.php';
const EVIDENCE = process.env.EVIDENCE_FILE ?? 'mission/evidencia/segunda-pasada.md';
const FIXTURE = 'tools/harness/fixtures/mascotas-fuente.json';

/* Las 9 mascotas del sistema fuente migradas al proyecto */
const SOURCE_PETS_9 = ['Shadow', 'Coco', 'Nube', 'Thor', 'Mimi', 'Nieve', 'Kira', 'Chispa', 'Canela'];

/* ------------------------------------------------------------------ util */
const results = [];
const check = (id, weight, ok, detail = '') =>
  results.push({ id, weight, ok: !!ok, detail });

const read = (p) => readFile(join(ROOT, p), 'utf8');
const exists = async (p) => {
  try { await stat(join(ROOT, p)); return true; } catch { return false; }
};
const norm = (s) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/* Datos del proyecto: data/pets.json (array o { pets: [] }) */
function loadProjectPets(raw) {
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : (data.pets || []);
}

/* Datos del sistema fuente: fixture local; si no existe o está vacío,
 * se intenta la API en vivo. Se tolera un BOM inicial en el JSON. */
async function loadSourcePets() {
  if (await exists(FIXTURE)) {
    try {
      const raw = await read(FIXTURE);
      const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      if (Array.isArray(data.mascotas) && data.mascotas.length) {
        return { pets: data.mascotas, from: 'fixture' };
      }
    } catch { /* fixture corrupto: se degrada a la API */ }
  }
  try {
    const res = await fetch(SOURCE_API + '?action=mascotas', {
      headers: { 'User-Agent': 'adopta-harness' },
    });
    const data = await res.json();
    if (Array.isArray(data.mascotas)) { return { pets: data.mascotas, from: 'api' }; }
  } catch { /* sin red: sin datos de comparación */ }
  return { pets: [], from: 'none' };
}

/* Edad en meses derivada de la etiqueta del sistema fuente ("3 meses", "2 años") */
function ageMonthsFromLabel(label) {
  const m = String(label || '').match(/(\d+)\s*(años?|meses?)/i);
  if (!m) { return 0; }
  const n = Number(m[1]);
  return /año/i.test(m[2]) ? n * 12 : n;
}

/* ================================================================ 1..6 */
async function localChecks() {
  /* --- pets_total + pets_especies --- */
  const pets = loadProjectPets(await read('data/pets.json'));
  check('pets_total', 10, pets.length === 25, `encontradas=${pets.length}`);

  const count = (s) => pets.filter((p) => norm(p.species) === s).length;
  const perros = count('perro');
  const gatos = count('gato');
  const conejos = count('conejo');
  check('pets_especies', 5, perros === 12 && gatos === 11 && conejos === 2,
    `perros=${perros} gatos=${gatos} conejos=${conejos}`);

  /* --- source_pets_9: presencia por nombre --- */
  const names = new Set(pets.map((p) => norm(p.name)));
  const faltan = SOURCE_PETS_9.filter((n) => !names.has(norm(n)));
  check('source_pets_9', 8, faltan.length === 0,
    faltan.length ? `faltan: ${faltan.join(', ')}` : 'las 9 presentes');

  /* --- no_inventar_datos: fidelidad campo a campo contra el sistema fuente --- */
  const source = await loadSourcePets();
  const mismatches = [];
  if (source.from === 'none') {
    mismatches.push('fuente no disponible (fixture ni API)');
  } else {
    for (const name of SOURCE_PETS_9) {
      const sp = source.pets.find((p) => norm(p.name) === norm(name));
      const pp = pets.find((p) => norm(p.name) === norm(name));
      if (!sp || !pp) { mismatches.push(`${name}: ausente en una de las dos fuentes`); continue; }
      const diffs = [];
      if (norm(pp.breed) !== norm(sp.raza)) { diffs.push('raza'); }
      if (pp.ageMonths !== ageMonthsFromLabel(sp.edad)) { diffs.push('edad'); }
      if (Math.abs(Number(pp.weightKg) - Number(sp.peso)) > 0.11) { diffs.push('peso'); }
      if (norm(pp.sex) !== norm(sp.sexo)) { diffs.push('sexo'); }
      if (norm(pp.size) !== norm(sp.tamano)) { diffs.push('tamaño'); }
      if (!Array.isArray(pp.tags) || norm(pp.tags[0]) !== norm(sp.badge)) { diffs.push('etiqueta'); }
      if (norm(pp.description) !== norm(sp.historia)) { diffs.push('historia'); }
      if (norm(pp.photos[0]) !== norm('images/' + basename(sp.image_url))) { diffs.push('foto'); }
      if (!!pp.featured !== !!sp.featured) { diffs.push('destacada'); }
      if (diffs.length) { mismatches.push(`${name}: ${diffs.join(', ')}`); }
    }
  }
  check('no_inventar_datos', 12, mismatches.length === 0,
    mismatches.length ? `fuente=${source.from} · ${mismatches.slice(0, 4).join(' · ')}` : `fuente=${source.from} · 9/9 fieles`);

  /* --- images_locales --- */
  const imgs = await readdir(join(ROOT, 'images')).catch(() => []);
  const imgsOk = SOURCE_PETS_9.every((n) =>
    imgs.some((f) => norm(f).includes(norm(n))));
  check('images_locales', 8, imgsOk, `${imgs.length} archivos en images/`);

  /* --- media_local_paths --- */
  const media = await read('js/utils/media.js');
  check('media_local_paths', 5,
    media.includes('images/') && media.includes('unsplash') && /isUnsplashId/.test(media) &&
    media.includes('/^\\d+-[0-9a-f]+$/i'),
    'media.js resuelve rutas locales y remotas (regex de ids con hash hexadecimal)');

  /* --- splash_hardened --- */
  const app = await read('js/app.js');
  const hasTimeout = app.includes('setTimeout(hideSplash, SPLASH_MAX_MS + 800)');
  const hasErrorHandler = app.includes("addEventListener('error', hideSplash)");
  check('splash_hardened', 10, hasTimeout && hasErrorHandler,
    `timeout=${hasTimeout} errorHandler=${hasErrorHandler}`);

  /* --- canonical_ok --- */
  const html = await read('index.html');
  check('canonical_ok', 5,
    /rel="canonical" href="https:\/\/konfiozinc\.github\.io\/adopta\/"/.test(html) &&
    /property="og:image"/.test(html),
    'canonical + og:image con URL real');
}

/* ================================================================ 7 */
async function testSuites() {
  const detail = [];
  let ok = true;
  for (const tool of ['tools/verify.mjs', 'tools/logic-test.mjs']) {
    try {
      await exec('node', [tool], { cwd: ROOT, timeout: 120000 });
      detail.push(`${tool}: ok`);
    } catch (e) {
      ok = false;
      detail.push(`${tool}: FAIL → ${String(e.stdout || e.stderr || e.message).split('\n').slice(-2).join(' ').slice(0, 160)}`);
    }
  }
  check('tests_verde', 10, ok, detail.join(' | '));
}

/* ================================================================ 8 */
async function liveChecks() {
  let errors = 0;
  let notFound = 0;

  /* Rutas de la SPA (hash): el servidor debe entregar la app en todas */
  for (const path of ['', '#/mascotas', '#/mascotas/shadow', '#/solicitudes', '#/cuenta', 'no-existe']) {
    try {
      const res = await fetch(`${SITE}/${path}`, { redirect: 'follow' });
      if (res.status === 404) { notFound++; }
      if (res.status >= 500) { errors++; }
    } catch { errors++; }
  }

  /* pets.json servido: 25 mascotas y la migrada Shadow presente */
  try {
    const live = loadProjectPets(await (await fetch(`${SITE}/data/pets.json`)).text());
    if (live.length !== 25) { errors++; }
    if (!live.some((p) => norm(p.name) === 'shadow')) { errors++; }
  } catch { errors++; }

  /* Imagen local servida */
  try {
    const img = await fetch(`${SITE}/images/mascota-02-shadow.png`);
    if (img.status !== 200) { errors++; }
  } catch { errors++; }

  check('qa_rutas_live', 12, errors === 0 && notFound <= 1,
    `errores=${errors} 404s=${notFound}`);
}

/* ================================================================ 9 (GATE) */
async function secondComparisonGate() {
  const evidence = await exists(EVIDENCE);
  let sourceReachable = false;
  try { sourceReachable = (await fetch(SOURCE, { redirect: 'follow' })).ok; } catch { /* sin red */ }

  /* Comparación real: los 9 nombres del sistema fuente en el proyecto */
  const source = await loadSourcePets();
  const pets = loadProjectPets(await read('data/pets.json'));
  const names = new Set(pets.map((p) => norm(p.name)));
  const cubiertos = SOURCE_PETS_9.filter((n) => names.has(norm(n))).length;
  const fuentesOk = source.from !== 'none' || await exists(FIXTURE);

  check('segunda_pasada', 15,
    evidence && sourceReachable && fuentesOk && cubiertos === SOURCE_PETS_9.length,
    `evidencia=${evidence} fuente=${sourceReachable} origen=${source.from} cubiertos=${cubiertos}/9`);
}

/* ================================================================ runner */
async function main() {
  await localChecks();
  await testSuites();
  await liveChecks();
  await secondComparisonGate();

  /* Limitación conocida registrada, no silenciada */
  check('ui_inline', 0, true, 'skipped: batería de UI requiere CDP sin tiempo virtual (documentado)');

  const total = results.reduce((s, r) => s + r.weight, 0);
  const got = results.reduce((s, r) => s + (r.ok ? r.weight : 0), 0);
  const gate = results.find((r) => r.id === 'segunda_pasada');
  const blocked = !gate.ok;

  const report = {
    mission: 'adopta-rebuild',
    score: blocked ? 0 : Math.round((got / total) * 100),
    blocked,
    blockedReason: blocked ? 'Falta la SEGUNDA COMPARACIÓN (gate obligatorio de la misión)' : null,
    checks: results,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n=== adopta-rebuild · informe del harness ===');
    for (const r of results) {
      console.log(`${r.ok ? '✔' : '✘'} [${String(r.weight).padStart(2)}] ${r.id.padEnd(18)} ${r.detail}`);
    }
    console.log(`\nScore: ${report.score}/100${blocked ? '  ⛔ BLOQUEADO: falta la 2ª comparación' : ''}`);
  }
  process.exit(blocked || report.score < 80 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });

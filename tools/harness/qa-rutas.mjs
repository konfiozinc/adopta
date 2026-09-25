#!/usr/bin/env node
/* ============================================================================
 * tools/harness/qa-rutas.mjs — QA de rutas con navegador headless
 * ----------------------------------------------------------------------------
 * Recorre las rutas de la app (local o publicada) con Edge/Chrome headless y
 * verifica que el splash nunca quede atascado en ninguna de ellas.
 *
 * Uso:
 *   node tools/harness/qa-rutas.mjs
 *
 * Variables de entorno opcionales:
 *   BASE_URL   origen de la app  (defecto: https://konfiozinc.github.io/adopta)
 *   EDGE       ruta a Edge/Chrome/Chromium (defecto: Edge de Windows)
 * ========================================================================== */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';

const exec = promisify(execFile);

const BASE = (process.env.BASE_URL ?? 'https://konfiozinc.github.io/adopta').replace(/\/+$/, '');
const BROWSER = process.env.EDGE ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

/* Ruta hash → nombre legible para el informe */
const ROUTES = [
  { hash: '', name: 'home' },
  { hash: '#/mascotas', name: 'mascotas' },
  { hash: '#/mascotas/shadow', name: 'detalle-shadow' },
  { hash: '#/mascotas/nieve', name: 'detalle-nieve' },
  { hash: '#/solicitudes', name: 'solicitudes' },
  { hash: '#/cuenta', name: 'cuenta' },
  { hash: '#/ruta-inexistente', name: '404' },
];

if (!existsSync(BROWSER)) {
  console.error('✖ Navegador no encontrado. Define EDGE con la ruta a Edge/Chrome/Chromium.');
  process.exit(2);
}

let failed = 0;
console.log(`\n=== qa-rutas · ${BASE} ===`);
for (const route of ROUTES) {
  const url = `${BASE}/${route.hash}`;
  try {
    const { stdout } = await exec(BROWSER, [
      '--headless=new', '--disable-gpu', '--no-first-run',
      '--virtual-time-budget=7000', '--dump-dom', url,
    ], { maxBuffer: 32 * 1024 * 1024 });

    /* La app retira el splash del DOM al ocultarlo; si sigue presente y sin
       is-hidden, está atascado. */
    const splashAtascado = /id="splash"/.test(stdout) && !/splash is-hidden/.test(stdout);
    if (splashAtascado) { failed++; }
    console.log(`${splashAtascado ? '✘' : '✔'} ${route.name.padEnd(16)} splash=${splashAtascado ? 'VISIBLE' : 'oculto'} dom=${stdout.length}B`);
  } catch (error) {
    failed++;
    console.log(`✘ ${route.name.padEnd(16)} error: ${String(error.message).slice(0, 90)}`);
  }
}

console.log(failed === 0
  ? '\n✔ Todas las rutas responden sin splash atascado'
  : `\n✖ ${failed} ruta(s) fallaron`);
process.exit(failed ? 1 : 0);

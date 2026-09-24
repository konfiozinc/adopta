/* ============================================================================
 * tools/build-single.mjs — Genera una versión de un solo archivo
 * ----------------------------------------------------------------------------
 * Uso: node tools/build-single.mjs [salida]
 *
 * Une index.html + las tres hojas de estilo + todos los scripts en un único
 * archivo HTML autocontenido (`adopta.html`). Útil para compartir la demo por
 * correo, subirla a un hosting mínimo o abrirla sin servidor.
 *
 * Nota: el CSS conserva su orden (base → componentes → páginas) y los scripts
 * mantienen el mismo orden de dependencias que en index.html.
 * ========================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputName = process.argv[2] || 'adopta.html';
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

let html = read('index.html');

/* --- 1. Sustituir las hojas de estilo por su contenido ------------------- */
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g)].map((m) => m[1]);
let css = '';
for (const file of cssFiles) {
  css += `\n/* ==== ${file} ==== */\n` + read(file);
}

/* Se respeta el orden del documento: cada <link> se reemplaza donde estaba */
for (const file of cssFiles) {
  const pattern = new RegExp(`<link rel="stylesheet" href="${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*/>`);
  html = html.replace(pattern, file === cssFiles[0] ? `<style>\n${css}\n</style>` : '');
}

/* --- 2. Sustituir los scripts por su contenido -------------------------- */
const scriptFiles = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
let scripts = '';
for (const file of scriptFiles) {
  scripts += `\n/* ==== ${file} ==== */\n` + read(file);
}

const firstScript = scriptFiles[0];
for (const file of scriptFiles) {
  const pattern = new RegExp(`<script src="${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"></script>`);
  html = html.replace(pattern, file === firstScript ? `<script>\n${scripts}\n</script>` : '');
}

/* --- 3. Marcar el archivo como autocontenido ---------------------------- */
html = html.replace(
  '<title>',
  '<!-- Versión de un solo archivo generada por tools/build-single.mjs.\n' +
  '     No editar a mano: los cambios deben hacerse en los archivos fuente. -->\n  <title>'
);

const target = resolve(ROOT, outputName);
writeFileSync(target, html, 'utf8');

const kb = (html.length / 1024).toFixed(1);
console.log(`✔ Generado ${basename(target)} (${kb} KB)`);
console.log(`  · ${cssFiles.length} hojas de estilo integradas`);
console.log(`  · ${scriptFiles.length} scripts integrados`);
console.log('  · sin dependencias locales: solo requiere internet para las fotos y las tipografías');

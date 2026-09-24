/* ============================================================================
 * tools/ui-test.mjs — Pruebas de interfaz en Chrome real, vía CDP
 * ----------------------------------------------------------------------------
 * Uso:
 *   1) Servir el proyecto:  python -m http.server 8899 --bind 127.0.0.1
 *   2) Chrome con depuración remota:
 *        chrome --headless=new --remote-debugging-port=9333 --user-data-dir=...
 *   3) node tools/ui-test.mjs
 *
 * Se conecta al protocolo DevTools por WebSocket (sin dependencias externas),
 * carga tools/test-inline.html, espera la marca de finalización y reporta el
 * resultado. Al no depender del "tiempo virtual" de Chrome, no se cuelga
 * esperando recursos de red.
 *
 * Variables opcionales:
 *   CDP_PORT    puerto de depuración (9333)
 *   BASE_URL    origen del proyecto (http://127.0.0.1:8899)
 *   PAGE        ruta de la página de pruebas (/tools/test-inline.html)
 *   TIMEOUT_MS  espera máxima (90000)
 * ========================================================================== */
const PORT = Number(process.env.CDP_PORT || 9333);
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';
const PAGE = process.env.PAGE || '/tools/test-inline.html';
const TIMEOUT = Number(process.env.TIMEOUT_MS || 90000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --- 1. Descubrir el objetivo del navegador ------------------------------ */
async function findTarget() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const targets = await response.json();
  return targets.find((t) => t.type === 'page') || targets[0];
}

/* --- 2. Cliente CDP mínimo sobre WebSocket ------------------------------- */
function createClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();

    socket.addEventListener('open', () => {
      resolve({
        send(method, params) {
          const id = nextId++;
          socket.send(JSON.stringify({ id, method, params: params || {} }));
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            setTimeout(() => {
              if (pending.has(id)) { pending.delete(id); rej(new Error('timeout CDP: ' + method)); }
            }, 20000);
          });
        },
        close() { socket.close(); }
      });
    });

    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (!message.id || !pending.has(message.id)) { return; }
      const { res, rej } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) { rej(new Error(message.error.message)); } else { res(message.result); }
    });

    socket.addEventListener('error', () => reject(new Error('no se pudo conectar al CDP en el puerto ' + PORT)));
  });
}

/* --- 3. Ejecución --------------------------------------------------------- */
async function main() {
  let target;
  try {
    target = await findTarget();
  } catch (error) {
    console.error('✖ No se pudo consultar el CDP en el puerto ' + PORT + '. ¿Está Chrome en marcha con --remote-debugging-port?');
    console.error('  ' + error.message);
    process.exit(2);
  }

  const client = await createClient(target.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  const url = BASE + PAGE;
  console.log('→ Abriendo ' + url);
  await client.send('Page.navigate', { url });

  /* Se espera a que la página publique su informe. Durante el arranque puede
   * ocurrir que aún no exista el contexto: se toleran los errores de evaluación. */
  const started = Date.now();
  let report = null;
  let lastError = '';

  while (Date.now() - started < TIMEOUT) {
    try {
      const result = await client.send('Runtime.evaluate', {
        expression: 'JSON.stringify(window.__TEST_REPORT__ || null)',
        returnByValue: true
      });
      const value = result && result.result && result.result.value;
      if (value && value !== 'null') {
        report = JSON.parse(value);
        break;
      }
    } catch (error) {
      lastError = error.message;
    }
    await sleep(400);
  }

  /* Se recuperan también los errores de consola, útiles si algo falla */
  let consoleErrors = [];
  try {
    const errors = await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify(window.__TEST_ERRORS__ || [])',
      returnByValue: true
    });
    consoleErrors = JSON.parse(errors.result.value || '[]');
  } catch { /* noop */ }

  client.close();

  if (!report) {
    console.error('✖ La página de pruebas no publicó resultados en ' + Math.round(TIMEOUT / 1000) + ' s.');
    if (lastError) { console.error('  último error de evaluación: ' + lastError); }
    process.exit(3);
  }

  console.log('\n--- resultados ---');
  report.results.forEach((line) => console.log(' ' + line));
  if (consoleErrors.length) {
    console.log('\n--- errores de consola del navegador ---');
    consoleErrors.forEach((line) => console.log(' ' + line));
  }

  const total = report.passed + report.failed;
  console.log('\n' + (report.failed === 0 ? '✔' : '✖') + ' ' + report.passed + '/' + total +
    ' pruebas de interfaz correctas (' + report.failed + ' fallidas)\n');
  process.exit(report.failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('✖ Error inesperado: ' + (error && error.stack || error));
  process.exit(4);
});

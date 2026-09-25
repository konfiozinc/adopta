# 🐾 Adopta

**Plataforma web de adopción responsable de mascotas.** Una SPA completa, moderna y lista para
producción, construida con **HTML5, CSS3 y JavaScript vanilla** — sin frameworks, sin `npm install`
y sin paso de compilación obligatorio.

> *Tu próximo compañero te espera.*

---

## ✨ Qué incluye

| Área | Detalle |
| --- | --- |
| **Diseño** | Paleta cálida (naranja coral `#FF6B35`, crema, blanco), tipografías Outfit + Inter, sombras suaves, animaciones sutiles y **tema claro/oscuro** |
| **Navegación** | Barra inferior en móvil y menú superior desde tablet/escritorio, con contador dinámico de solicitudes |
| **Páginas** | Inicio, Catálogo con filtros avanzados, **Ficha completa de cada mascota**, Mis solicitudes, Cuenta y página 404 propia |
| **Flujo de adopción** | Formulario de 3 pasos con validación en español, resumen, confirmación y folio de seguimiento |
| **Interactividad** | Favoritos persistentes, buscador con autocompletado, filtros combinables, ordenación, galería de fotos, edición de perfil con subida de imagen |
| **Datos** | 25 mascotas (16 del catálogo original + 9 migradas del sistema fuente con sus fotografías reales), 7 refugios, perfil y solicitudes precargadas para que la demo nunca se vea vacía |
| **Accesibilidad** | HTML semántico, `aria-*` en todos los controles, foco gestionado entre vistas, trampa de foco en modales, atajos de teclado y respeto por `prefers-reduced-motion` |
| **Calidad** | 129 pruebas de lógica + 57 comprobaciones de estructura + suite de interfaz en navegador real |

---

## 🚀 Cómo usarlo

### Opción 1 · Abrir directamente (lo más rápido)

Abre `index.html` con doble clic. Funciona sin servidor porque el enrutado usa *hash*
(`#/mascotas/luna`), así que no hay reescrituras de URL que configurar.

### Opción 2 · Servidor local (recomendado para desarrollar)

```bash
npm start                 # o: python -m http.server 8899 --bind 127.0.0.1
```

Luego abre <http://127.0.0.1:8899/>.

### Opción 3 · GitHub Pages

1. Sube el contenido de esta carpeta a la rama `main` del repositorio.
2. *Settings → Pages → Source:* `Deploy from a branch`, rama `main`, carpeta `/ (root)`.
3. Listo: `https://<usuario>.github.io/<repo>/`.

> Como el enrutado es por hash, funciona en cualquier subcarpeta sin configuración extra.

### Opción 4 · Un solo archivo

```bash
node tools/build-single.mjs        # genera adopta.html (≈300 KB, todo integrado)
```

`adopta.html` reúne HTML, CSS y JavaScript en un único archivo: ideal para compartir la demo por
correo o subirla a un hosting mínimo.

---

## 📁 Estructura del proyecto

```
adopta/
├── index.html                  Marcado base: splash, encabezado, contenedores, orden de scripts
├── adopta.html                 (generado) versión de un solo archivo
├── package.json                Scripts de servidor, pruebas y build
├── css/
│   ├── base.css                Sistema de diseño: tokens, reset, layout, splash, animaciones
│   ├── components.css          Botones, chips, tarjetas, modales, formularios, toasts, esqueletos
│   └── pages.css               Estilos por página (inicio, catálogo, ficha, solicitudes, cuenta)
├── js/
│   ├── app.js                  Arranque, rutas, acciones globales, atajos, splash
│   ├── router.js               Router SPA por hash con parámetros y limpieza entre vistas
│   ├── state.js                Estado global reactivo + persistencia en localStorage
│   ├── data/
│   │   ├── pets.data.js        Catálogo (JSON embebido, idéntico a data/pets.json)
│   │   ├── user.data.js        Perfil de ejemplo, preferencias y solicitudes iniciales
│   │   └── repository.js       Capa de acceso a datos: consultas, filtros, orden, sugerencias
│   ├── utils/
│   │   ├── icons.js            Set de iconos SVG en línea (sin librerías externas)
│   │   ├── format.js           Formateo en español: fechas, edades, pesos, validaciones
│   │   ├── dom.js              Plantillas HTML con escape de datos y utilidades de DOM
│   │   ├── storage.js          localStorage con espacio de nombres y recuperación de errores
│   │   ├── a11y.js             Foco, trampas de foco, anuncios y bloqueo de scroll
│   │   └── media.js            Imágenes: lazy load, esqueleto y respaldo si falla la red
│   ├── ui/                     Componentes: tarjetas, navegación, modales, toasts, buscador
│   ├── features/               Flujo de adopción de 3 pasos
│   └── pages/                  Una vista por ruta (Inicio, Mascotas, Ficha, Solicitudes, Cuenta)
├── data/
│   ├── pets.json               Mismo catálogo en JSON puro (para copiar a un backend)
│   └── shelters.json           Refugios con datos de contacto
└── tools/
    ├── verify.mjs              Estructura, datos, rutas y convenciones
    ├── logic-test.mjs          Pruebas de lógica sin navegador
    ├── test-inline.html        Batería de interacciones sobre el DOM real
    ├── ui-test.mjs             Ejecuta la batería anterior vía protocolo DevTools
    └── build-single.mjs        Empaquetador de un solo archivo
```

---

## 🧭 Rutas

| Ruta | Vista |
| --- | --- |
| `#/` | Inicio: saludo personalizado, buscador, destacados, catálogo resumido, cómo funciona |
| `#/mascotas` | Catálogo: búsqueda, filtros por especie/tamaño/sexo/edad, ordenación, estado vacío accionable |
| `#/mascotas/:id` | Ficha: galería, datos clave, salud verificada, refugio, CTA de adopción, similares |
| `#/solicitudes` | Seguimiento por estados (pendiente, en revisión, aprobada, rechazada), línea de tiempo, cancelación |
| `#/cuenta` | Perfil editable, estadísticas, favoritos, adopciones, notificaciones, tema, exportar datos |

Enlaces directos útiles: `#/mascotas?especie=gato` (filtra el catálogo por especie).

---

## ⌨️ Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `/` | Enfocar el buscador de la vista |
| `Alt` + `H` | Inicio |
| `Alt` + `M` | Mascotas |
| `Alt` + `S` | Solicitudes |
| `Alt` + `C` | Cuenta |
| `Esc` | Cerrar modal, sugerencias o limpiar la búsqueda |

---

## 🗄️ Modelo de datos

```jsonc
// Mascota (data/pets.json)
{
  "id": "luna",
  "name": "Luna",
  "species": "perro",              // perro | gato | conejo | otro
  "breed": "Golden Retriever",
  "ageMonths": 8,                  // la interfaz muestra "8 meses" o "1 año y 6 meses"
  "weightKg": 14,
  "sex": "hembra",                 // hembra | macho
  "size": "mediano",               // pequeno | mediano | grande
  "tags": ["Cachorra", "Juguetona", "Sociable"],   // rasgos objetivos, no adjetivos vacíos
  "photos": ["<id-de-foto-unsplash>", "..."],      // también acepta rutas locales: "images/…"
  "description": "…",
  "personality": ["Cariñosa", "Enérgica"],
  "health": { "vaccinated": true, "sterilized": false, "dewormed": true, "microchipped": true, "notes": "…" },
  "shelterId": "huellas",          // null en fichas migradas que no publican refugio
  "location": "Ciudad de México",
  "featured": true,
  "publishedAt": "2025-01-18"      // null en fichas migradas (se ordenan al final)
}
```

### Mascotas migradas del sistema fuente

Nueve fichas provienen de la auditoría del sistema fuente
(`https://ecnlatamacademy.com/practicas/saas/sistema/adopta/app/`): **Shadow, Coco,
Nube, Thor, Mimi, Nieve, Kira, Chispa y Canela**. Sus datos (nombre, especie, raza,
edad, peso, sexo, tamaño, etiqueta e historia) y sus fotografías
(`images/mascota-XX-*.png`) son los originales de ese sistema, reutilizados aquí
para no perder información. Como el sistema fuente no publica refugio, ubicación,
salud ni fecha de publicación para estas fichas, esos campos quedan vacíos y la
interfaz lo muestra de forma honesta (nota de "consulta con el refugio" en lugar de
una tabla de salud en ceros). La fotografía original de Luna se añadió como tercera
foto de su galería.

El estado del usuario vive en `localStorage` bajo el espacio de nombres `adopta:v1`
(`state` y `theme`). Desde **Cuenta → Exportar datos** se descarga todo en JSON, y
**Cuenta → Restablecer demo** devuelve la aplicación a su estado inicial.

---

## 🔌 Conectar un backend real

Toda la lectura de datos pasa por `Repository` (`js/data/repository.js`) y las escrituras del
usuario por `State` (`js/state.js`). Los métodos ya devuelven **Promesas**, así que cambiar la
fuente no obliga a tocar las vistas.

```js
// js/data/repository.js — ejemplo con Supabase
allPets: () => supabase.from('pets').select('*, shelter:shelters(*)'),

// js/state.js — ejemplo de creación de solicitud
async function createRequest(petId, payload) {
  const { data, error } = await supabase.from('requests').insert({ pet_id: petId, ...payload }).select().single();
  if (error) throw error;
  state.requests = [data, ...state.requests];
  commit({ type: 'requests:create', request: data });
  return data;
}
```

Puntos de extensión ya preparados:

- `Repository._sync` para consultas locales (se pueden sustituir por llamadas de red).
- `ADOPTA_FAKE_LATENCY = 600` en consola para simular latencia y ver los esqueletos de carga.
- `UserData.DEFAULT_USER` para el perfil que más adelante entregará el proveedor de autenticación.
- `Storage.clearAll()` borra únicamente las claves de Adopta, nunca otros datos del sitio.

---

## ✅ Pruebas

```bash
npm test              # estructura + datos + lógica (rápido, sin navegador)
npm run verify        # solo estructura, datos, rutas y convenciones
npm run test:logic    # 129 pruebas de lógica: filtros, formato, estado, persistencia
```

Para la suite de interfaz (necesita un servidor y Chrome):

```bash
npm start                                            # terminal 1
chrome --headless=new --remote-debugging-port=9333 \
       --user-data-dir=/tmp/adopta-cdp about:blank   # terminal 2
npm run test:ui                                      # terminal 3
```

`tools/test-inline.html` también puede abrirse en el navegador: imprime el resumen en pantalla y
en la consola. Verifica el flujo completo de adopción, favoritos, filtros, búsqueda, galería,
seguimiento de solicitudes, edición de perfil, tema y persistencia.

---

## 🎨 Sistema de diseño

| Token | Valor | Uso |
| --- | --- | --- |
| `--c-primary` | `#FF6B35` | Marca, acciones principales |
| `--c-primary-soft` | `#FF8C42` | Degradados |
| `--c-bg` / `--c-surface` | `#FFFBF8` / `#FFFFFF` | Fondos crema y superficies |
| `--c-text` / `--c-text-soft` | `#2D2A28` / `#6E6660` | Texto principal y secundario |
| `--c-heart` | `#E63946` | Favoritos |
| `--c-success` | `#2A9D8F` | Estados aprobados y salud verificada |
| `--c-warning` | `#E9A23B` | Pendiente / en revisión |
| `--c-danger` | `#D64545` | Rechazado y acciones destructivas |

Escala de espaciado de 4 px, radios de 10 a 34 px, tres niveles de sombra y transiciones de
160–500 ms con curvas suaves. El tema oscuro se define reemplazando **solo** las variables en
`html[data-theme='dark']`, manteniendo la calidez (marrones profundos, nunca negro puro).

---

## ♿ Accesibilidad

- Estructura semántica (`header`, `nav`, `main`, `section`, `article`, `footer`) y jerarquía
  correcta de encabezados en cada vista.
- Enlace «Saltar al contenido», `aria-current` en la navegación y anuncios `aria-live` para
  cambios de vista, favoritos y validaciones.
- Modales con `<dialog>` nativo: foco atrapado, cierre con `Esc`, retorno del foco al elemento
  de origen y bloqueo del scroll de fondo.
- Foco visible en todos los controles, tamaños táctiles de 40–48 px y contraste de texto ≥ 4.5:1.
- `prefers-reduced-motion` desactiva animaciones; `prefers-color-scheme` define el tema inicial.

---

## 📝 Notas

- Las fotografías del catálogo original se sirven desde Unsplash y las de las fichas
  migradas desde la carpeta `images/` del propio proyecto; las tipografías vienen de
  Google Fonts. Si no hay conexión, la aplicación muestra un degradado cálido con la
  inicial de cada mascota en lugar de una imagen rota, y recurre a las tipografías
  del sistema.
- Los datos de mascotas, refugios, perfil y solicitudes son de demostración y viven en
  el navegador de cada visitante.
- El código está comentado en español, organizado por módulos y sin dependencias externas.

---

Hecho con cariño para que cada adopción empiece con una buena experiencia. 🧡

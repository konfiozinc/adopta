/* =========================================================
   ADOPTA — Lógica de la aplicación (SPA Vanilla, sin build)
   ---------------------------------------------------------
   - Router por hash (#/): /, /mascotas, /mascotas/:id,
     /solicitudes y /cuenta.
   - Persistencia en localStorage:
       adopta_favorites  → mascotas favoritas
       adopta_requests   → solicitudes de adopción enviadas
   - Datos: intenta cargar data.json (estructura lista para
     Firebase / Supabase / API REST). Si no está disponible
     (p. ej. al abrir por file://), usa un respaldo embebido
     para que la demo funcione siempre.
   - Para producción: sustituir loadData() por llamadas reales
     al backend sin tocar la capa de interfaz.
   ========================================================= */

/* ---------- Estado global ---------- */
const state = {
  pets: [],
  user: null,
  favorites: safeParse(localStorage.getItem("adopta_favorites"), []),
  requests: safeParse(localStorage.getItem("adopta_requests"), []),
  filter: "Todos",
  search: "",
};

/* ---------- Utilidades ---------- */
const app = document.getElementById("app");

/** Parsea JSON de forma segura devolviendo un valor por defecto. */
function safeParse(json, fallback) {
  try { return JSON.parse(json) ?? fallback; } catch { return fallback; }
}

/** Escapa texto antes de insertarlo en HTML (anti-XSS). */
const esc = (value = "") =>
  String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

/** Persiste favoritos y solicitudes en localStorage. */
const save = () => {
  localStorage.setItem("adopta_favorites", JSON.stringify(state.favorites));
  localStorage.setItem("adopta_requests", JSON.stringify(state.requests));
};

/* Toast de notificación */
let toastTimer = null;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* Imagen de respaldo si alguna URL externa falla */
const IMG_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>" +
    "<rect width='600' height='600' fill='#F3E8E0'/>" +
    "<text x='50%' y='52%' font-size='130' text-anchor='middle'>🐾</text></svg>"
  );
const IMG_ONERROR = "this.onerror=null;this.src='" + IMG_FALLBACK + "'";

/* ---------- Iconos SVG (trazo, heredan color) ---------- */
const ICONS = {
  home:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  doc:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  back:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
};

/* ---------- Datos de respaldo (fallback si no hay data.json) ---------- */
const FALLBACK = {
  user: { name: "Darwin", email: "darwin@example.com", avatar: "https://i.pravatar.cc/150?img=12" },
  pets: [
    { id: "luna", name: "Luna", species: "Perro", breed: "Labrador mestizo", age: "2 años", weight: "18 kg", sex: "Hembra", location: "Medellín, Antioquia", tag: "Juguetona", featured: true, image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85", description: "Luna es una perrita cariñosa, activa y muy sociable. Disfruta los paseos, jugar con pelotas y recibir mimos. Busca una familia responsable que pueda acompañarla en sus aventuras.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Huellas de Esperanza" },
    { id: "simba", name: "Simba", species: "Gato", breed: "Gato doméstico", age: "1 año", weight: "4.2 kg", sex: "Macho", location: "Envigado, Antioquia", tag: "Tranquilo", featured: true, image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=85", description: "Simba es un gato dulce y tranquilo. Le encantan los lugares cálidos, las caricias y observar el mundo desde una ventana. Ideal para un hogar sereno y amoroso.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Casa Bigotes" },
    { id: "max", name: "Max", species: "Perro", breed: "Beagle mestizo", age: "8 meses", weight: "9 kg", sex: "Macho", location: "Bello, Antioquia", tag: "Cachorro", featured: true, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=85", description: "Max es un cachorro curioso y alegre. Está aprendiendo rápidamente y tiene mucha energía para compartir con una familia que disfrute del juego y los paseos.", health: { vaccines: "Esquema inicial", sterilized: false, dewormed: true }, shelter: "Huellitas Bello" },
    { id: "milo", name: "Milo", species: "Gato", breed: "Atigrado doméstico", age: "3 años", weight: "5 kg", sex: "Macho", location: "Itagüí, Antioquia", tag: "Cariñoso", featured: false, image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=85", description: "Milo es un compañero afectuoso que disfruta de las siestas y de estar cerca de las personas. Es independiente, pero siempre tiene espacio para una buena sesión de caricias.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Casa Bigotes" },
    { id: "nala", name: "Nala", species: "Perro", breed: "Criolla", age: "4 años", weight: "14 kg", sex: "Hembra", location: "Medellín, Antioquia", tag: "Tranquila", featured: false, image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=85", description: "Nala tiene una personalidad tranquila y noble. Le gustan las caminatas suaves y los espacios donde pueda descansar cerca de su familia.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Refugio Arcoíris" },
    { id: "coco", name: "Coco", species: "Conejo", breed: "Mini Rex", age: "1 año", weight: "1.7 kg", sex: "Hembra", location: "Medellín, Antioquia", tag: "Dulce", featured: false, image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=85", description: "Coco es una conejita dulce y curiosa. Necesita un espacio seguro, limpio y una familia que conozca los cuidados especiales que requiere un conejo.", health: { vaccines: "Control veterinario", sterilized: true, dewormed: true }, shelter: "Pequeñas Patitas" },
    { id: "rocky", name: "Rocky", species: "Perro", breed: "Pastor mestizo", age: "5 años", weight: "24 kg", sex: "Macho", location: "Sabaneta, Antioquia", tag: "Juguetón", featured: false, image: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=900&q=85", description: "Rocky es un perro activo y leal. Le encanta salir a caminar y aprender nuevos comandos. Busca una familia con tiempo para compartir actividad diaria.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Huellas de Esperanza" },
    { id: "mimi", name: "Mimi", species: "Gato", breed: "Carey doméstica", age: "2 años", weight: "3.8 kg", sex: "Hembra", location: "Medellín, Antioquia", tag: "Cariñosa", featured: false, image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=85", description: "Mimi es una gata cariñosa y observadora. Se adapta muy bien a interiores y disfruta de las rutinas tranquilas y de los juguetes interactivos.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Casa Bigotes" },
    { id: "toby", name: "Toby", species: "Perro", breed: "Cocker mestizo", age: "3 años", weight: "12 kg", sex: "Macho", location: "Bello, Antioquia", tag: "Amigable", featured: false, image: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=900&q=85", description: "Toby es sociable y disfruta conocer personas. Es un compañero equilibrado que puede convertirse en el mejor amigo de una familia activa.", health: { vaccines: "Al día", sterilized: true, dewormed: true }, shelter: "Huellitas Bello" },
    { id: "oreo", name: "Oreo", species: "Conejo", breed: "Holandés", age: "10 meses", weight: "1.5 kg", sex: "Macho", location: "Envigado, Antioquia", tag: "Curioso", featured: false, image: "https://images.unsplash.com/photo-1535241749838-299277b6305f?auto=format&fit=crop&w=900&q=85", description: "Oreo es un conejo curioso y activo. Le encanta explorar espacios seguros y necesita una familia comprometida con una alimentación y cuidados adecuados.", health: { vaccines: "Control veterinario", sterilized: false, dewormed: true }, shelter: "Pequeñas Patitas" },
  ],
};

/* ---------- Carga de datos (API-ready) ---------- */
async function loadData() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    state.pets = data.pets || [];
    state.user = data.user || FALLBACK.user;
  } catch (error) {
    console.warn("Adopta: usando datos de respaldo embebidos.", error);
    state.pets = FALLBACK.pets;
    state.user = FALLBACK.user;
  }
}

/* ---------- Componentes de UI ---------- */
function header() {
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="logo" href="#/" aria-label="Adopta, ir al inicio">Adop<span>ta</span></a>
        <a href="#/cuenta" aria-label="Ir a mi cuenta">
          <img class="avatar" src="${esc(state.user?.avatar || "")}" alt="Foto de perfil de ${esc(state.user?.name || "usuario")}">
        </a>
      </div>
    </header>`;
}

function nav(active) {
  const items = [
    { path: "/", key: "home", label: "Inicio" },
    { path: "/mascotas", key: "heart", label: "Mascotas" },
    { path: "/solicitudes", key: "doc", label: "Solicitudes" },
    { path: "/cuenta", key: "user", label: "Cuenta" },
  ];
  const count = state.requests.length;
  return `
    <nav class="nav" aria-label="Navegación principal">
      <div class="nav-inner">
        ${items.map((item) => `
          <button class="nav-item ${active === item.key ? "active" : ""}"
                  data-route="${item.path}"
                  aria-current="${active === item.key ? "page" : "false"}">
            <span class="nav-icon">${ICONS[item.key]}
              ${item.key === "doc" && count ? `<span class="badge">${count}</span>` : ""}
            </span>
            <span class="nav-label">${item.label}</span>
          </button>`).join("")}
      </div>
    </nav>`;
}

function petCard(pet) {
  const fav = state.favorites.includes(pet.id);
  return `
    <article class="card" data-id="${esc(pet.id)}" tabindex="0" role="button"
             aria-label="Ver detalles de ${esc(pet.name)}">
      <div class="photo">
        <img src="${esc(pet.image)}" alt="${esc(pet.name)}, ${esc(pet.breed)}" loading="lazy" onerror="${IMG_ONERROR}">
        <span class="tag">${esc(pet.tag)}</span>
        <button class="fav ${fav ? "on" : ""}" data-fav="${esc(pet.id)}"
                aria-label="${fav ? "Quitar de favoritos" : "Añadir a favoritos"}">${ICONS.heart}</button>
      </div>
      <div class="info">
        <h3>${esc(pet.name)}</h3>
        <p class="breed">${esc(pet.breed)}</p>
        <span class="pill">${esc(pet.age)} · ${esc(pet.weight)}</span>
      </div>
    </article>`;
}

function chips() {
  return ["Todos", "Perros", "Gatos", "Otros"]
    .map((c) => `<button class="chip ${state.filter === c ? "active" : ""}"
                          data-filter="${c}" aria-pressed="${state.filter === c}">${c}</button>`)
    .join("");
}

function filteredPets() {
  let list = state.pets;
  if (state.filter !== "Todos") {
    list = list.filter((p) =>
      state.filter === "Otros" ? p.species === "Conejo" : p.species === state.filter.slice(0, -1));
  }
  const q = state.search.trim().toLowerCase();
  if (q) {
    list = list.filter((p) =>
      [p.name, p.breed, p.shelter, p.location].some((v) => v.toLowerCase().includes(q)));
  }
  return list;
}

function emptySearch() {
  return `
    <div class="empty">
      <div class="empty-icon">🐾</div>
      <h3>No encontramos coincidencias</h3>
      <p>Prueba con otro nombre, raza o refugio.</p>
    </div>`;
}

/* ---------- Páginas ---------- */
function homePage() {
  const featured = state.pets.filter((p) => p.featured).slice(0, 3);
  const available = filteredPets();
  return `
    <section class="hero">
      <h1>Hola, <span>${esc(state.user?.name || "amigo")}</span> 👋</h1>
      <p>Hay un compañero esperando conocerte.</p>
    </section>
    <div class="search">
      <span class="search-icon">${ICONS.search}</span>
      <input id="search-input" value="${esc(state.search)}"
             placeholder="Buscar por nombre, raza o refugio" aria-label="Buscar mascotas">
    </div>
    <div class="banner">
      <div><strong>Adopta también está en tu bolsillo</strong><small>Próximamente para Android.</small></div>
      <button class="btn-white" id="android-btn">Ver más</button>
    </div>
    <div class="head"><h2>Explora</h2></div>
    <div class="chips">${chips()}</div>
    <div class="head"><h2>Destacados</h2><small>${featured.length} compañeros</small></div>
    <div class="featured">${featured.map(petCard).join("")}</div>
    <div class="head"><h2>Para adoptar</h2><small id="results-count">${available.length} disponibles</small></div>
    <div class="grid" id="pets-grid">${available.length ? available.map(petCard).join("") : emptySearch()}</div>`;
}

function petsPage() {
  const available = filteredPets();
  return `
    <section class="hero">
      <h1>Encuentra a tu <span>compañero</span></h1>
      <p>Filtra y descubre mascotas listas para encontrar hogar.</p>
    </section>
    <div class="search">
      <span class="search-icon">${ICONS.search}</span>
      <input id="search-input" value="${esc(state.search)}"
             placeholder="Buscar por nombre, raza o refugio" aria-label="Buscar mascotas">
    </div>
    <div class="chips">${chips()}</div>
    <div class="head"><h2>Todas las mascotas</h2><small id="results-count">${available.length} resultados</small></div>
    <div class="grid" id="pets-grid">${available.length ? available.map(petCard).join("") : emptySearch()}</div>`;
}

function detailPage(id) {
  const pet = state.pets.find((p) => p.id === id);
  if (!pet) { location.hash = "#/mascotas"; return ""; }
  const requested = state.requests.some((r) => r.petId === pet.id);
  const fav = state.favorites.includes(pet.id);
  return `
    <div class="detail">
      <div class="cover">
        <img src="${esc(pet.image)}" alt="Foto de ${esc(pet.name)}" onerror="${IMG_ONERROR}">
        <button class="back" data-route="/mascotas" aria-label="Volver al catálogo">${ICONS.back}</button>
        <button class="fav ${fav ? "on" : ""}" data-fav="${esc(pet.id)}"
                aria-label="${fav ? "Quitar de favoritos" : "Añadir a favoritos"}">${ICONS.heart}</button>
      </div>
      <div class="detail-info">
        <h1 class="detail-title">${esc(pet.name)}</h1>
        <p class="sub">${esc(pet.breed)} · ${esc(pet.location)}</p>
        <div class="stats">
          <div class="stat"><strong>${esc(pet.age)}</strong><small>Edad</small></div>
          <div class="stat"><strong>${esc(pet.weight)}</strong><small>Peso</small></div>
          <div class="stat"><strong>${esc(pet.sex)}</strong><small>Sexo</small></div>
          <div class="stat"><strong>${esc(pet.species)}</strong><small>Especie</small></div>
        </div>
        <button class="cta" data-request="${esc(pet.id)}" ${requested ? "disabled" : ""}>
          ${requested ? "✓ Solicitud enviada" : "Solicitar Adopción"}
        </button>
        <section class="section">
          <h3>Sobre mí</h3>
          <p>${esc(pet.description)}</p>
        </section>
        <section class="section">
          <h3>Salud</h3>
          <div class="health">
            <div>💉 Vacunas<b>${esc(pet.health.vaccines)}</b></div>
            <div>♥ Esterilizado<b>${pet.health.sterilized ? "Sí" : "Pendiente"}</b></div>
            <div>✓ Desparasitado<b>${pet.health.dewormed ? "Sí" : "Pendiente"}</b></div>
          </div>
        </section>
        <section class="section">
          <h3>Refugio</h3>
          <div class="shelter">
            <div><strong>${esc(pet.shelter)}</strong><small>${esc(pet.location)}</small></div>
            <button class="link" id="contact-btn">Contactar</button>
          </div>
        </section>
      </div>
    </div>`;
}

function requestsPage() {
  const statusClass = {
    "En revisión": "reviewing",
    "Aprobada": "approved",
    "Rechazada": "rejected",
  };
  const rows = state.requests.map((r) => {
    const pet = state.pets.find((p) => p.id === r.petId);
    if (!pet) return "";
    return `
      <div class="request">
        <img src="${esc(pet.image)}" alt="Foto de ${esc(pet.name)}" onerror="${IMG_ONERROR}">
        <div class="request-main">
          <strong>${esc(pet.name)}</strong>
          <small>Solicitud · ${esc(r.date)}</small>
          <span class="status ${statusClass[r.status] || ""}">${esc(r.status)}</span>
        </div>
        <button class="link" data-route="/mascotas/${esc(pet.id)}">Ver</button>
      </div>`;
  }).join("");
  return `
    <section class="hero">
      <h1>Mis <span>solicitudes</span></h1>
      <p>Consulta el estado de tus procesos de adopción.</p>
    </section>
    ${rows
      ? `<div class="requests">${rows}</div>`
      : `<div class="empty">
           <div class="empty-icon">🐾</div>
           <h3>Aún no has enviado ninguna solicitud</h3>
           <p>Cuando encuentres a tu compañero ideal, podrás iniciar aquí el proceso de adopción.</p>
           <button class="link" data-route="/mascotas">Explorar mascotas</button>
         </div>`}`;
}

function accountPage() {
  return `
    <section class="hero">
      <h1>Mi <span>cuenta</span></h1>
      <p>Administra tu perfil y tu actividad.</p>
    </section>
    <div class="profile">
      <img class="avatar" src="${esc(state.user?.avatar || "")}" onerror="${IMG_ONERROR}"
           alt="Foto de perfil de ${esc(state.user?.name || "usuario")}">
      <h2>${esc(state.user?.name || "Usuario")}</h2>
      <p>${esc(state.user?.email || "")}</p>
    </div>
    <div class="menu">
      <button data-act="edit">Editar perfil <span>›</span></button>
      <button data-act="favs">Mis favoritos <span id="fav-count">${state.favorites.length} ›</span></button>
      <button data-act="history">Historial de adopciones <span>›</span></button>
      <button data-act="logout">Cerrar sesión <span>↪</span></button>
    </div>`;
}

/* ---------- Acciones ---------- */
function toggleFavorite(id) {
  const on = !state.favorites.includes(id);
  state.favorites = on ? [...state.favorites, id] : state.favorites.filter((x) => x !== id);
  save();
  toast(on ? "Añadido a favoritos ♥" : "Eliminado de favoritos");
  // Actualiza solo los corazones visibles (sin perder scroll ni foco)
  document.querySelectorAll(`[data-fav="${id}"]`).forEach((btn) => {
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-label", on ? "Quitar de favoritos" : "Añadir a favoritos");
  });
  const favCount = document.getElementById("fav-count");
  if (favCount) favCount.textContent = `${state.favorites.length} ›`;
}

function requestAdoption(id) {
  if (state.requests.some((r) => r.petId === id)) return;
  state.requests.push({
    petId: id,
    date: new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date()),
    status: "Pendiente",
  });
  save();
  toast("Solicitud enviada correctamente ♥");
  location.hash = "#/solicitudes";
}

function accountAction(action) {
  if (action === "favs") {
    state.search = ""; state.filter = "Todos";
    location.hash = "#/mascotas";
    toast(state.favorites.length ? `Tienes ${state.favorites.length} favorito(s) ♥` : "Aún no tienes favoritos");
  } else if (action === "edit") {
    toast("Editor de perfil preparado para conectar con tu backend.");
  } else if (action === "history") {
    toast("Aquí aparecerá tu historial de adopciones.");
  } else if (action === "logout") {
    toast("Sesión local cerrada. Demo: el usuario sigue disponible.");
  }
}

/* ---------- Actualización parcial (búsqueda y filtros) ---------- */
function refreshGrid() {
  const list = filteredPets();
  const grid = document.getElementById("pets-grid");
  const count = document.getElementById("results-count");
  if (grid) grid.innerHTML = list.length ? list.map(petCard).join("") : emptySearch();
  if (count) count.textContent = `${list.length} disponibles`;
  bindCards(grid);
}

/* ---------- Enlazado de eventos ---------- */
function bindCards(root) {
  (root || document).querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => (location.hash = "#/mascotas/" + card.dataset.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") location.hash = "#/mascotas/" + card.dataset.id;
    });
  });
  (root || document).querySelectorAll("[data-fav]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleFavorite(btn.dataset.fav); });
  });
}

function bindEvents() {
  // Navegación interna
  document.querySelectorAll("[data-route]").forEach((el) =>
    el.addEventListener("click", () => (location.hash = "#" + el.dataset.route)));

  // Filtros por categoría
  document.querySelectorAll("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((b) => {
        b.classList.toggle("active", b.dataset.filter === state.filter);
        b.setAttribute("aria-pressed", b.dataset.filter === state.filter);
      });
      refreshGrid();
    }));

  // Búsqueda (sin perder el foco del input)
  const searchInput = document.getElementById("search-input");
  searchInput?.addEventListener("input", (e) => {
    state.search = e.target.value;
    refreshGrid();
  });

  // Solicitudes de adopción
  document.querySelectorAll("[data-request]").forEach((el) =>
    el.addEventListener("click", () => requestAdoption(el.dataset.request)));

  // Tarjetas y favoritos
  bindCards();

  // Acciones de cuenta y extras
  document.querySelectorAll("[data-act]").forEach((el) =>
    el.addEventListener("click", () => accountAction(el.dataset.act)));
  document.getElementById("android-btn")?.addEventListener("click", () =>
    toast("La app Android estará disponible próximamente."));
  document.getElementById("contact-btn")?.addEventListener("click", () =>
    toast("Contacto del refugio: preparado para conectar con WhatsApp o tu backend."));
}

/* ---------- Router ---------- */
function render() {
  const path = location.hash.replace(/^#/, "") || "/";
  let content = "";
  let active = "";

  if (path === "/") { content = homePage(); active = "home"; }
  else if (path === "/mascotas") { content = petsPage(); active = "heart"; }
  else if (/^\/mascotas\/[^/]+$/.test(path)) {
    content = detailPage(decodeURIComponent(path.split("/")[2]));
    active = "heart";
    if (!content) return; // redirige por hashchange
  }
  else if (path === "/solicitudes") { content = requestsPage(); active = "doc"; }
  else if (path === "/cuenta") { content = accountPage(); active = "user"; }
  else { location.hash = "#/"; return; }

  app.innerHTML = header() + `<main class="page">${content}</main>` + nav(active);
  window.scrollTo({ top: 0 });
  bindEvents();
}

/* ---------- Arranque ---------- */
async function init() {
  await loadData();
  const splash = document.getElementById("splash");
  setTimeout(() => splash.classList.add("hide"), 750);
  window.addEventListener("hashchange", render);
  render();
}
init();

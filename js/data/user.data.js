/* ============================================================================
 * user.data.js — Usuario de demostración y solicitudes de ejemplo
 * ----------------------------------------------------------------------------
 * Al abrir la app por primera vez se hidrata un perfil de ejemplo ("Darwin")
 * para que la experiencia no arranque vacía. Todo se guarda en localStorage:
 * el usuario puede editar su perfil, borrar sus solicitudes y restablecer la
 * demo desde la página de Cuenta.
 *
 * Cuando exista un backend real, este archivo desaparece: el perfil llega del
 * proveedor de autenticación y las solicitudes de la API.
 * ========================================================================== */
(function () {
  'use strict';

  /* Perfil inicial del usuario */
  var DEFAULT_USER = {
    id: 'u-darwin',
    name: 'Darwin',
    email: 'darwin@ejemplo.com',
    phone: '+52 55 1234 5678',
    city: 'Ciudad de México',
    bio: 'Busco un compañero para caminatas de mañana y tardes de sofá.',
    avatar: null,                 /* dataURL si el usuario sube una foto */
    joinedAt: null,               /* se fija al primer arranque */
    role: 'adoptante'             /* adoptante | refugio (preparado para el panel de refugios) */
  };

  /* Preferencias de la cuenta */
  var DEFAULT_PREFERENCES = {
    notifyStatus: true,           /* avisos cuando cambia el estado de una solicitud */
    notifyNewPets: true,          /* avisos de mascotas nuevas compatibles */
    notifyNewsletter: false,
    showLocation: false
  };

  /* Solicitudes de ejemplo -------------------------------------------------
   * `daysAgo` se resuelve a fecha real en el primer arranque, de modo que la
   * demo siempre muestra fechas recientes y la línea de tiempo tiene sentido.
   * ---------------------------------------------------------------------- */
  var SEED_REQUESTS = [
    {
      id: 'req-seed-1',
      petId: 'luna',
      status: 'revision',
      daysAgo: 3,
      message: 'Tenemos patio grande y salimos a caminar todas las mañanas. Nos encantaría conocer a Luna.',
      note: 'Tu solicitud pasó a revisión. El refugio coordinará una visita guiada esta semana.',
      timeline: [{ status: 'pendiente', daysAgo: 3 }, { status: 'revision', daysAgo: 1 }]
    },
    {
      id: 'req-seed-2',
      petId: 'milo',
      status: 'aprobada',
      daysAgo: 12,
      message: 'Vivo solo con un gato tranquilo y busco compañía para él y para mí.',
      note: '¡Aprobada! Puedes recoger a Milo el sábado entre 10:00 y 13:00. Lleva identificación oficial.',
      timeline: [
        { status: 'pendiente', daysAgo: 12 },
        { status: 'revision', daysAgo: 9 },
        { status: 'aprobada', daysAgo: 4 }
      ]
    },
    {
      id: 'req-seed-3',
      petId: 'toby',
      status: 'rechazada',
      daysAgo: 26,
      message: 'Me gustaría adoptar a un perro mayor para acompañarlo en su vejez.',
      note: 'Por ahora Toby requiere un hogar sin escaleras y con experiencia en perros braquicéfalos. Vuelve a intentarlo cuando cambie tu situación.',
      timeline: [
        { status: 'pendiente', daysAgo: 26 },
        { status: 'revision', daysAgo: 21 },
        { status: 'rechazada', daysAgo: 18 }
      ]
    }
  ];

  /* Convierte `daysAgo` en una fecha ISO real respecto a hoy */
  function resolveSeedRequests(now) {
    var base = now ? new Date(now).getTime() : Date.now();
    return SEED_REQUESTS.map(function (seed) {
      return {
        id: seed.id,
        petId: seed.petId,
        status: seed.status,
        message: seed.message,
        note: seed.note,
        createdAt: new Date(base - seed.daysAgo * 86400000).toISOString(),
        updatedAt: new Date(base - (seed.timeline[seed.timeline.length - 1].daysAgo) * 86400000).toISOString(),
        timeline: seed.timeline.map(function (step) {
          return { status: step.status, at: new Date(base - step.daysAgo * 86400000).toISOString() };
        })
      };
    });
  }

  /* Formulario de adopción: opciones de vivienda y convivencia.
   * Se declaran aquí para que el formulario y el resumen compartan etiquetas. */
  var HOUSING_OPTIONS = [
    { value: 'departamento', label: 'Departamento', icon: 'home' },
    { value: 'casa_patio', label: 'Casa con patio', icon: 'home' },
    { value: 'casa_sin_patio', label: 'Casa sin patio', icon: 'home' },
    { value: 'campo', label: 'Campo o terreno', icon: 'paw' }
  ];

  var EXPERIENCE_OPTIONS = [
    { value: 'primera', label: 'Primera vez', hint: 'Será mi primera mascota' },
    { value: 'alguna', label: 'Alguna experiencia', hint: 'He tenido mascotas antes' },
    { value: 'mucha', label: 'Con experiencia', hint: 'He cuidado varios animales' }
  ];

  var COMPANIONS_OPTIONS = [
    { value: 'ninguna', label: 'Vivo solo/a' },
    { value: 'adultos', label: 'Con adultos' },
    { value: 'ninos', label: 'Con niños' },
    { value: 'mascotas', label: 'Con otras mascotas' }
  ];

  window.UserData = {
    DEFAULT_USER: DEFAULT_USER,
    DEFAULT_PREFERENCES: DEFAULT_PREFERENCES,
    resolveSeedRequests: resolveSeedRequests,
    HOUSING_OPTIONS: HOUSING_OPTIONS,
    EXPERIENCE_OPTIONS: EXPERIENCE_OPTIONS,
    COMPANIONS_OPTIONS: COMPANIONS_OPTIONS
  };
})();

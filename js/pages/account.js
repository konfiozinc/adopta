/* ============================================================================
 * account.js — Cuenta del adoptante
 * ----------------------------------------------------------------------------
 * Perfil editable (con foto), estadísticas, favoritos, historial de adopciones,
 * preferencias de notificación, gestión de datos locales y cierre de sesión.
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Utilidades de perfil
   * ------------------------------------------------------------------------ */

  /* Redimensiona la imagen elegida a 256×256 (recorte centrado) para no llenar
   * localStorage con fotos de varios megas. */
  function resizeAvatar(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('El archivo debe ser una imagen.'));
        return;
      }

      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('No pudimos leer la imagen.')); };
      reader.onload = function () {
        var image = new Image();
        image.onerror = function () { reject(new Error('La imagen está dañada.')); };
        image.onload = function () {
          var size = 256;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var context = canvas.getContext('2d');

          var side = Math.min(image.width, image.height);
          var sx = (image.width - side) / 2;
          var sy = (image.height - side) / 2;

          context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch (error) {
            reject(new Error('El navegador bloqueó el procesado de la imagen.'));
          }
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function avatarMarkup(user, size) {
    var cls = 'avatar' + (size ? ' avatar--' + size : '');
    if (user.avatar) {
      return window.Dom.h`<span class="${cls}"><img src="${user.avatar}" alt=""></span>`;
    }
    return window.Dom.h`<span class="${cls}">${window.Format.initials(user.name)}</span>`;
  }

  /* --------------------------------------------------------------------------
   * Bloques de la vista
   * ------------------------------------------------------------------------ */
  function profileCard(user) {
    return window.Dom.h`
      <section class="profile-card reveal" style="--i:0">
        <span class="avatar-ring">
          ${window.Dom.raw(avatarMarkup(user, 'xl'))}
        </span>
        <div class="profile-card__info grow">
          <h1>${user.name}</h1>
          <p>${user.email}</p>
          <p style="margin-top:2px;font-size:var(--fs-xs);opacity:.9">
            ${user.city ? user.city + ' · ' : ''}Miembro desde ${window.Format.shortDate(user.joinedAt)}
          </p>
        </div>
        <div class="profile-card__edit">
          <button class="btn btn--ghost btn--sm" type="button" data-action="edit-profile">
            ${window.Dom.raw(window.Icon.render('edit'))} Editar
          </button>
        </div>
      </section>`;
  }

  function statsBlock(stats) {
    return window.Dom.h`
      <div class="stats reveal" style="--i:1;margin-bottom:var(--s-6)">
        ${window.Dom.raw(window.Cards.statCard(stats.favorites, 'Favoritos'))}
        ${window.Dom.raw(window.Cards.statCard(stats.active, 'En trámite'))}
        ${window.Dom.raw(window.Cards.statCard(stats.adopted, 'Adopciones'))}
      </div>`;
  }

  function favoritesBlock(favorites) {
    if (!favorites.length) {
      return window.Dom.h`
        <section class="block">
          <h2 class="block__title">${window.Dom.raw(window.Icon.render('heartSolid'))} Mis favoritos</h2>
          <p style="font-size:var(--fs-sm);margin-bottom:var(--s-4)">
            Todavía no has guardado ninguna mascota. Toca el corazón en cualquier ficha para tenerla a mano.
          </p>
          <a class="btn btn--soft btn--sm" href="#/mascotas">
            ${window.Dom.raw(window.Icon.render('search'))} Buscar mascotas
          </a>
        </section>`;
    }

    return window.Dom.h`
      <section class="block">
        <div class="between" style="margin-bottom:var(--s-4)">
          <h2 class="block__title" style="margin:0">
            ${window.Dom.raw(window.Icon.render('heartSolid'))} Mis favoritos
            <span class="badge badge--heart" style="margin-left:var(--s-2)">${favorites.length}</span>
          </h2>
          <a class="link-more" href="#/mascotas">Ver catálogo ${window.Dom.raw(window.Icon.render('arrowRight'))}</a>
        </div>
        <div class="mini-list">
          ${window.Dom.raw(favorites.map(function (pet) {
            return window.PetCard.mini(pet, {
              right: window.Dom.h`
                <button class="icon-btn" type="button" data-fav="${pet.id}" aria-label="Quitar ${pet.name} de favoritos">
                  ${window.Dom.raw(window.Icon.render('heartSolid'))}
                </button>`
            });
          }).join(''))}
        </div>
      </section>`;
  }

  function adoptionsBlock(requests) {
    var approved = requests.filter(function (request) { return request.status === 'aprobada'; });

    if (!approved.length) {
      var inProgress = requests.filter(function (request) {
        return request.status === 'pendiente' || request.status === 'revision';
      });
      return window.Dom.h`
        <section class="block">
          <h2 class="block__title">${window.Dom.raw(window.Icon.render('heartHand'))} Mis adopciones</h2>
          <p style="font-size:var(--fs-sm)">
            ${inProgress.length
              ? 'Tienes ' + window.Format.plural(inProgress.length, 'solicitud', 'solicitudes') + ' en trámite. Cuando se apruebe aparecerá aquí tu historial de adopciones.'
              : 'Aún no tienes adopciones registradas. Cuando se apruebe una solicitud, aquí quedará tu historial.'}
          </p>
          <a class="btn btn--soft btn--sm" style="margin-top:var(--s-3)" href="#/solicitudes">
            ${window.Dom.raw(window.Icon.render('clipboard'))} Ver mis solicitudes
          </a>
        </section>`;
    }

    return window.Dom.h`
      <section class="block">
        <h2 class="block__title">${window.Dom.raw(window.Icon.render('heartHand'))} Mis adopciones</h2>
        <div class="mini-list">
          ${window.Dom.raw(approved.map(function (request) {
            var pet = window.Repository._sync.getPet(request.petId);
            if (!pet) { return ''; }
            return window.PetCard.mini(pet, {
              right: window.Dom.h`<span class="badge badge--success">
                ${window.Dom.raw(window.Icon.render('checkCircle'))} Adoptado</span>`
            });
          }).join(''))}
        </div>
        <p class="field__hint" style="margin-top:var(--s-3)">
          Guarda el certificado de adopción que te envió el refugio por correo.
        </p>
      </section>`;
  }

  function preferencesBlock(preferences) {
    return window.Dom.h`
      <section class="block">
        <h2 class="block__title">${window.Dom.raw(window.Icon.render('bell'))} Notificaciones</h2>
        ${window.Dom.raw(window.Cards.prefRow({
          key: 'notifyStatus', icon: 'clipboard', checked: preferences.notifyStatus,
          label: 'Estado de mis solicitudes',
          hint: 'Avisos cuando el refugio revise, apruebe o rechace una solicitud.'
        }))}
        ${window.Dom.raw(window.Cards.prefRow({
          key: 'notifyNewPets', icon: 'paw', checked: preferences.notifyNewPets,
          label: 'Mascotas nuevas compatibles',
          hint: 'Te avisamos cuando aparezca alguien que encaje con tus filtros.'
        }))}
        ${window.Dom.raw(window.Cards.prefRow({
          key: 'notifyNewsletter', icon: 'mail', checked: preferences.notifyNewsletter,
          label: 'Novedades del refugio',
          hint: 'Historias de adopción y campañas de rescate. Un correo al mes.'
        }))}
        ${window.Dom.raw(window.Cards.prefRow({
          key: 'showLocation', icon: 'location', checked: preferences.showLocation,
          label: 'Mostrar mi ciudad a los refugios',
          hint: 'Ayuda a valorar la distancia antes de la entrevista.'
        }))}
      </section>`;
  }

  function settingsBlock() {
    var dark = window.State.get().theme === 'dark';

    return window.Dom.h`
      <section class="block">
        <h2 class="block__title">${window.Dom.raw(window.Icon.render('settings'))} Apariencia y datos</h2>
        ${window.Dom.raw(window.Cards.prefRow({
          key: 'darkMode', icon: dark ? 'moon' : 'sun', checked: dark,
          label: 'Tema oscuro',
          hint: 'Reduce el brillo en entornos con poca luz.'
        }))}
        <div class="pref">
          <span class="menu__icon">${window.Dom.raw(window.Icon.render('lock'))}</span>
          <span class="pref__text">
            <strong>Datos guardados en este navegador</strong>
            <small>${window.State.isPersistent()
              ? 'Perfil, favoritos y solicitudes se guardan localmente (localStorage).'
              : 'Tu navegador bloquea el almacenamiento local: los datos se pierden al recargar.'}</small>
          </span>
        </div>
        <div class="row" style="gap:var(--s-3);flex-wrap:wrap;margin-top:var(--s-4)">
          <button class="btn btn--ghost btn--sm" type="button" data-action="export-data">
            ${window.Dom.raw(window.Icon.render('external'))} Exportar datos
          </button>
          <button class="btn btn--danger btn--sm" type="button" data-action="reset-demo">
            ${window.Dom.raw(window.Icon.render('trash'))} Restablecer demo
          </button>
        </div>
      </section>`;
  }

  function menuBlock() {
    return window.Dom.h`
      <section class="menu" style="margin-bottom:var(--s-6)">
        ${window.Dom.raw(window.Cards.menuItem({
          action: 'edit-profile', icon: 'edit', label: 'Editar perfil',
          hint: 'Nombre, contacto, ciudad y presentación'
        }))}
        ${window.Dom.raw(window.Cards.menuItem({
          href: '#/mascotas', icon: 'heartSolid', label: 'Explorar mascotas',
          hint: 'Catálogo completo con filtros'
        }))}
        ${window.Dom.raw(window.Cards.menuItem({
          href: '#/solicitudes', icon: 'clipboard', label: 'Mis solicitudes',
          hint: 'Estado de cada trámite de adopción'
        }))}
        ${window.Dom.raw(window.Cards.menuItem({
          action: 'help', icon: 'info', label: 'Ayuda y contacto',
          hint: 'Preguntas frecuentes sobre adopción responsable'
        }))}
        ${window.Dom.raw(window.Cards.menuItem({
          action: 'logout', icon: 'logout', label: 'Cerrar sesión',
          hint: 'Salir de la cuenta en este dispositivo', danger: true
        }))}
      </section>`;
  }

  /* --------------------------------------------------------------------------
   * Vista
   * ------------------------------------------------------------------------ */
  function view() {
    var state = window.State.get();
    var user = state.user;
    var stats = window.State.stats();
    window.A11y.setTitle('Mi cuenta');

    var favoritePets = state.favorites
      .map(function (id) { return window.Repository._sync.getPet(id); })
      .filter(Boolean);

    return window.Dom.h`
      <div id="account-root">
        ${window.Dom.raw(profileCard(user))}
        <div class="stack" style="gap:var(--s-6);margin-top:var(--s-6)">
          ${window.Dom.raw(statsBlock(stats))}
          ${window.Dom.raw(menuBlock())}
          ${window.Dom.raw(favoritesBlock(favoritePets))}
          ${window.Dom.raw(adoptionsBlock(state.requests))}
          ${window.Dom.raw(preferencesBlock(state.preferences))}
          ${window.Dom.raw(settingsBlock())}
          ${window.Dom.raw(window.Cards.demoNote(
            'Cuenta de demostración. Conecta Supabase, Firebase o tu API para tener usuarios reales, correos de confirmación y panel de refugio.',
            'info'
          ))}
        </div>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Modales de la cuenta
   * ------------------------------------------------------------------------ */

  /* Editor de perfil */
  function openProfileEditor() {
    var user = window.State.get().user;

    window.Modal.open({
      title: 'Editar perfil',
      subtitle: 'Estos datos se comparten con el refugio al enviar una solicitud.',
      body: window.Dom.h`
        <form id="profile-form" novalidate>
          <div class="row" style="gap:var(--s-4);margin-bottom:var(--s-5)">
            <span id="avatar-preview">${window.Dom.raw(avatarMarkup(user, 'lg'))}</span>
            <div class="grow">
              <p style="font-weight:600;font-size:var(--fs-sm);margin-bottom:6px">Foto de perfil</p>
              <div class="row" style="gap:var(--s-2);flex-wrap:wrap">
                <label class="btn btn--ghost btn--sm" style="cursor:pointer">
                  ${window.Dom.raw(window.Icon.render('camera'))} Subir foto
                  <input type="file" accept="image/*" id="avatar-input" class="sr-only">
                </label>
                <button class="btn btn--sm btn--ghost" type="button" data-action="remove-avatar">
                  ${window.Dom.raw(window.Icon.render('trash'))} Quitar
                </button>
              </div>
              <p class="field__hint" style="margin-top:6px">Se recorta en cuadrado y se guarda en tu navegador.</p>
            </div>
          </div>

          <div class="field" data-field="name">
            <label class="field__label" for="p-name">Nombre completo <span class="req">*</span></label>
            <input class="input" id="p-name" name="name" value="${user.name}">
            <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
          </div>

          <div class="field" data-field="email">
            <label class="field__label" for="p-email">Correo electrónico <span class="req">*</span></label>
            <input class="input" id="p-email" name="email" type="email" value="${user.email}">
            <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
          </div>

          <div class="field" data-field="phone">
            <label class="field__label" for="p-phone">Teléfono</label>
            <input class="input" id="p-phone" name="phone" type="tel" value="${user.phone || ''}">
            <span class="field__hint">Opcional, pero facilita la coordinación de la visita.</span>
          </div>

          <div class="field" data-field="city">
            <label class="field__label" for="p-city">Ciudad</label>
            <input class="input" id="p-city" name="city" value="${user.city || ''}">
          </div>

          <div class="field">
            <label class="field__label" for="p-bio">Sobre mí</label>
            <textarea class="textarea" id="p-bio" name="bio" maxlength="240"
                      placeholder="Cuéntale al refugio cómo sería la vida de tu compañero contigo…">${user.bio || ''}</textarea>
          </div>
        </form>`,
      footer: window.Dom.h`
        <button class="btn btn--ghost" type="button" data-modal-close>Cancelar</button>
        <button class="btn btn--primary grow" type="button" data-save-profile>Guardar cambios</button>`,
      onMount: function (dialog, close) {
        var draftAvatar = user.avatar;

        /* Subida de foto */
        var fileInput = window.Dom.qs('#avatar-input', dialog);
        fileInput.addEventListener('change', function () {
          var file = fileInput.files && fileInput.files[0];
          if (!file) { return; }
          resizeAvatar(file).then(function (dataUrl) {
            draftAvatar = dataUrl;
            var preview = window.Dom.qs('#avatar-preview', dialog);
            if (preview) { preview.innerHTML = window.Dom.h`<span class="avatar avatar--lg"><img src="${dataUrl}" alt=""></span>`; }
            window.Toast.success('Foto lista para guardar', 'Imagen actualizada');
          }).catch(function (error) {
            window.Toast.error(error.message, 'No pudimos usar esa imagen');
          });
        });

        window.Dom.qs('[data-action="remove-avatar"]', dialog).addEventListener('click', function () {
          draftAvatar = null;
          var preview = window.Dom.qs('#avatar-preview', dialog);
          var nameInput = window.Dom.qs('#p-name', dialog);
          if (preview) {
            preview.innerHTML = window.Dom.h`<span class="avatar avatar--lg">${window.Format.initials(nameInput.value)}</span>`;
          }
        });

        /* Guardado con validación */
        window.Dom.qs('[data-save-profile]', dialog).addEventListener('click', function () {
          var name = window.Dom.qs('#p-name', dialog).value.trim();
          var email = window.Dom.qs('#p-email', dialog).value.trim();
          var phone = window.Dom.qs('#p-phone', dialog).value.trim();
          var city = window.Dom.qs('#p-city', dialog).value.trim();
          var bio = window.Dom.qs('#p-bio', dialog).value.trim();
          var errors = {};

          if (name.length < 3) { errors.name = 'Escribe tu nombre completo.'; }
          if (!window.Format.isEmail(email)) { errors.email = 'Revisa el formato del correo.'; }
          if (phone && !window.Format.isPhone(phone)) { errors.phone = 'El teléfono debe tener al menos 9 dígitos.'; }

          window.Dom.qsa('.field', dialog).forEach(function (field) { field.classList.remove('has-error'); });
          if (Object.keys(errors).length) {
            Object.keys(errors).forEach(function (key) {
              var field = window.Dom.qs('[data-field="' + key + '"]', dialog);
              if (!field) { return; }
              field.classList.add('has-error');
              var text = window.Dom.qs('[data-error-text]', field);
              if (text) { text.textContent = errors[key]; }
            });
            window.Toast.error('Revisa los campos marcados', 'No pudimos guardar');
            return;
          }

          window.State.updateUser({ name: name, email: email, phone: phone, city: city, bio: bio, avatar: draftAvatar });
          window.App.refreshNavigation();
          close();
          window.Router.resolve();
          window.Toast.success('Tu perfil se actualizó correctamente', 'Cambios guardados');
        });
      }
    });
  }

  /* Ayuda y contacto */
  function openHelp() {
    var faqs = [
      {
        q: '¿La adopción tiene coste?',
        a: 'No. Los refugios aliados no cobran por adoptar. Algunos piden una aportación voluntaria para gastos veterinarios, siempre informada antes.'
      },
      {
        q: '¿Cuánto tarda el proceso?',
        a: 'Entre 3 y 10 días: revisión de la solicitud, entrevista telefónica y visita al refugio para conocer a la mascota.'
      },
      {
        q: '¿Puedo adoptar si vivo en departamento?',
        a: 'Sí. Muchas mascotas se adaptan perfectamente a pisos. En la ficha verás el tamaño y sus necesidades de ejercicio.'
      },
      {
        q: '¿Qué pasa si no puedo cuidarla?',
        a: 'El compromiso incluye devolverla al refugio en lugar de abandonarla. Escríbenos y te acompañamos en el proceso.'
      }
    ];

    window.Modal.open({
      title: 'Ayuda y contacto',
      subtitle: 'Preguntas frecuentes sobre adopción responsable',
      size: 'wide',
      body: window.Dom.h`
        <div class="stack" style="gap:var(--s-3)">
          ${window.Dom.raw(faqs.map(function (faq) {
            return window.Dom.h`
              <details class="block" style="padding:var(--s-4);box-shadow:none">
                <summary style="cursor:pointer;font-weight:600;display:flex;align-items:center;gap:var(--s-2)">
                  ${window.Dom.raw(window.Icon.render('info'))} ${faq.q}
                </summary>
                <p style="margin-top:var(--s-3);font-size:var(--fs-sm)">${faq.a}</p>
              </details>`;
          }).join(''))}
        </div>
        <div class="block" style="margin-top:var(--s-4);background:var(--c-surface-2);box-shadow:none">
          <h3 class="block__title">${window.Dom.raw(window.Icon.render('mail'))} ¿Sigues con dudas?</h3>
          <p style="font-size:var(--fs-sm)">Escribe al equipo de Adopta y te respondemos en menos de 24 horas.</p>
          <a class="btn btn--soft btn--sm" style="margin-top:var(--s-3)" href="mailto:hola@adopta.mx">
            hola@adopta.mx
          </a>
        </div>`,
      footer: window.Dom.h`<button class="btn btn--primary btn--block" type="button" data-modal-close>Entendido</button>`
    });
  }

  /* --------------------------------------------------------------------------
   * Montaje
   * ------------------------------------------------------------------------ */
  function mount(root) {
    if (!root) { return; }

    function repaint() {
      window.Router.resolve();
    }

    function onClick(event) {
      var action = event.target.closest('[data-action]');
      var favButton = event.target.closest('[data-fav]');

      /* Quitar de favoritos desde la lista */
      if (favButton) {
        var petId = favButton.getAttribute('data-fav');
        window.State.toggleFavorite(petId);
        window.App.refreshNavigation();
        window.Toast.heart('Mascota actualizada en tus favoritos');
        window.setTimeout(repaint, 180);
        return;
      }

      if (!action) { return; }
      var name = action.getAttribute('data-action');

      if (name === 'edit-profile') {
        openProfileEditor();
        return;
      }

      if (name === 'help') {
        openHelp();
        return;
      }

      if (name === 'logout') {
        window.Modal.confirm(
          'Saldrás de tu cuenta en este dispositivo. Tus favoritos y solicitudes se conservan.',
          { title: '¿Cerrar sesión?', confirmLabel: 'Cerrar sesión', cancelLabel: 'Cancelar', danger: true }
        ).then(function (confirmed) {
          if (!confirmed) { return; }
          window.Toast.info('Sesión cerrada. Vuelve pronto para seguir adoptando.');
        });
        return;
      }

      if (name === 'export-data') {
        var dump = window.Storage.exportAll();
        var blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'adopta-datos.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        window.Toast.success('Descargamos tus datos en JSON', 'Exportación lista');
        return;
      }

      if (name === 'reset-demo') {
        window.Modal.confirm(
          'Se borrarán tu perfil editado, tus favoritos y tus solicitudes, y volverán los datos de ejemplo.',
          { title: '¿Restablecer la demo?', confirmLabel: 'Sí, restablecer', danger: true }
        ).then(function (confirmed) {
          if (!confirmed) { return; }
          window.State.resetDemo();
          window.App.refreshNavigation();
          window.Router.resolve();
          window.Toast.info('Datos de demostración restablecidos', 'Demo reiniciada');
        });
      }
    }

    /* Interruptores de preferencias y tema */
    function onChange(event) {
      var input = event.target.closest('[data-pref]');
      if (!input) { return; }
      var key = input.getAttribute('data-pref');

      if (key === 'darkMode') {
        window.State.setTheme(input.checked ? 'dark' : 'light');
        window.Topbar.updateThemeButton();
        return;
      }

      var patch = {};
      patch[key] = input.checked;
      window.State.updatePreferences(patch);
      window.Toast.show('Preferencia guardada', { variant: 'success', duration: 1800 });
    }

    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);

    window.Views.onLeave(function () {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
    });
  }

  window.Views = window.Views || {};
  window.Views.account = { render: view, mount: mount };
})();

/* ============================================================================
 * adoption-form.js — Flujo de solicitud de adopción en 3 pasos
 * ----------------------------------------------------------------------------
 * Paso 1 · Datos de contacto (prellenados con el perfil, editables)
 * Paso 2 · Tu hogar y tu experiencia (preguntas que los refugios valoran)
 * Paso 3 · Mensaje para el refugio + resumen y confirmación
 *
 * Incluye validación en español, navegación con teclado, bloqueo del botón de
 * envío mientras se procesa y confirmación con folio de seguimiento.
 * ========================================================================== */
(function () {
  'use strict';

  var TOTAL_STEPS = 3;

  /* --------------------------------------------------------------------------
   * Estado local del formulario (se reinicia en cada apertura)
   * ------------------------------------------------------------------------ */
  function buildDraft() {
    var user = window.State.get().user;
    return {
      step: 1,
      applicant: {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || ''
      },
      answers: {
        housing: '',
        companions: [],
        experience: '',
        outdoor: '',
        aloneHours: '4'
      },
      message: '',
      acceptTerms: false
    };
  }

  /* Validaciones por paso: devuelven un objeto { campo: mensaje } */
  function validateStep(step, draft) {
    var errors = {};

    if (step === 1) {
      if (!draft.applicant.name || draft.applicant.name.trim().length < 3) {
        errors.name = 'Escribe tu nombre completo.';
      }
      if (!window.Format.isEmail(draft.applicant.email)) {
        errors.email = 'Necesitamos un correo válido para avisarte del estado.';
      }
      if (!window.Format.isPhone(draft.applicant.phone)) {
        errors.phone = 'Escribe un teléfono de contacto (al menos 9 dígitos).';
      }
      if (!draft.applicant.city || draft.applicant.city.trim().length < 2) {
        errors.city = 'Indica tu ciudad para valorar la distancia al refugio.';
      }
    }

    if (step === 2) {
      if (!draft.answers.housing) {
        errors.housing = 'Selecciona dónde vivirías con la mascota.';
      }
      if (!draft.answers.companions.length) {
        errors.companions = 'Cuéntanos con quién compartirías el hogar.';
      }
      if (!draft.answers.experience) {
        errors.experience = 'Indica tu experiencia previa con animales.';
      }
      if (!draft.answers.outdoor) {
        errors.outdoor = 'Indica cuánto tiempo podría salir la mascota al día.';
      }
    }

    if (step === 3) {
      if (!draft.acceptTerms) {
        errors.acceptTerms = 'Debes aceptar el compromiso de adopción responsable.';
      }
    }

    return errors;
  }

  /* --------------------------------------------------------------------------
   * Plantillas de cada paso
   * ------------------------------------------------------------------------ */
  function stepsBar(step) {
    var labels = ['Contacto', 'Tu hogar', 'Mensaje'];
    var items = labels.map(function (label, index) {
      var state = index + 1 < step ? 'is-done' : (index + 1 === step ? 'is-current' : '');
      return window.Dom.h`
        <div class="steps__item ${state}">
          <span class="steps__bar"><span></span></span>
          <span class="steps__label">${index + 1}. ${label}</span>
        </div>`;
    }).join('');

    return window.Dom.h`<div class="steps" role="group" aria-label="Progreso de la solicitud">${window.Dom.raw(items)}</div>`;
  }

  function optionCards(name, options, selected, type) {
    var inputType = type || 'radio';
    return options.map(function (option) {
      var checked = inputType === 'checkbox'
        ? (selected || []).indexOf(option.value) !== -1
        : selected === option.value;

      return window.Dom.h`
        <label class="option">
          <input type="${inputType}" name="${name}" value="${option.value}" ${checked ? window.Dom.raw('checked') : ''}>
          ${option.icon ? window.Dom.raw(window.Icon.render(option.icon)) : ''}
          <span>${option.label}</span>
          ${option.hint ? window.Dom.raw('<small style="font-weight:500;opacity:.75">' + window.Dom.escape(option.hint) + '</small>') : ''}
        </label>`;
    }).join('');
  }

  var OUTDOOR_OPTIONS = [
    { value: 'poco', label: 'Menos de 1 hora' },
    { value: 'medio', label: '1 a 2 horas' },
    { value: 'mucho', label: 'Más de 2 horas' }
  ];

  function stepOne(draft) {
    var a = draft.applicant;
    return window.Dom.h`
      <form id="adoption-form" novalidate>
        <p class="field__hint" style="margin-bottom:var(--s-4)">
          Usamos estos datos solo para gestionar tu adopción. El refugio te contactará por teléfono o correo.
        </p>

        <div class="field" data-field="name">
          <label class="field__label" for="f-name">Nombre completo <span class="req">*</span></label>
          <input class="input" id="f-name" name="name" type="text" autocomplete="name"
                 placeholder="Ej. Darwin Ramírez" value="${a.name}">
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="email">
          <label class="field__label" for="f-email">Correo electrónico <span class="req">*</span></label>
          <input class="input" id="f-email" name="email" type="email" autocomplete="email"
                 placeholder="tucorreo@ejemplo.com" value="${a.email}">
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="phone">
          <label class="field__label" for="f-phone">Teléfono <span class="req">*</span></label>
          <input class="input" id="f-phone" name="phone" type="tel" autocomplete="tel"
                 placeholder="+52 55 0000 0000" value="${a.phone}">
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="city">
          <label class="field__label" for="f-city">Ciudad <span class="req">*</span></label>
          <input class="input" id="f-city" name="city" type="text" autocomplete="address-level2"
                 placeholder="Ciudad de México" value="${a.city}">
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>
      </form>`;
  }

  function stepTwo(draft) {
    var answers = draft.answers;
    return window.Dom.h`
      <form id="adoption-form" novalidate>
        <div class="field" data-field="housing">
          <span class="field__label">¿Dónde vivirías con tu nueva mascota? <span class="req">*</span></span>
          <div class="option-grid">${window.Dom.raw(optionCards('housing', window.UserData.HOUSING_OPTIONS, answers.housing))}</div>
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="companions">
          <span class="field__label">¿Con quién compartes el hogar? <span class="req">*</span></span>
          <p class="field__hint">Puedes elegir varias opciones.</p>
          <div class="option-grid">${window.Dom.raw(optionCards('companions', window.UserData.COMPANIONS_OPTIONS, answers.companions, 'checkbox'))}</div>
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="experience">
          <span class="field__label">Tu experiencia con animales <span class="req">*</span></span>
          <div class="option-grid option-grid--3">${window.Dom.raw(optionCards('experience', window.UserData.EXPERIENCE_OPTIONS, answers.experience))}</div>
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="outdoor">
          <span class="field__label">Tiempo de paseo o juego al día <span class="req">*</span></span>
          <div class="option-grid option-grid--3">${window.Dom.raw(optionCards('outdoor', OUTDOOR_OPTIONS, answers.outdoor))}</div>
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>

        <div class="field" data-field="aloneHours">
          <label class="field__label" for="f-alone">Horas que la mascota estaría sola</label>
          <div class="select-wrap">
            <select class="select" id="f-alone" name="aloneHours">
              <option value="2" ${answers.aloneHours === '2' ? window.Dom.raw('selected') : ''}>Menos de 2 horas</option>
              <option value="4" ${answers.aloneHours === '4' ? window.Dom.raw('selected') : ''}>Entre 2 y 5 horas</option>
              <option value="7" ${answers.aloneHours === '7' ? window.Dom.raw('selected') : ''}>Entre 5 y 8 horas</option>
              <option value="10" ${answers.aloneHours === '10' ? window.Dom.raw('selected') : ''}>Más de 8 horas</option>
            </select>
          </div>
        </div>
      </form>`;
  }

  function summaryRow(label, value) {
    if (!value) { return ''; }
    return window.Dom.h`
      <div class="row between" style="gap:var(--s-4);padding:6px 0;border-bottom:1px dashed var(--c-border)">
        <span style="font-size:var(--fs-sm);color:var(--c-text-mute)">${label}</span>
        <strong style="font-size:var(--fs-sm);text-align:right">${value}</strong>
      </div>`;
  }

  function labelFor(options, value) {
    var found = options.filter(function (option) { return option.value === value; })[0];
    return found ? found.label : '';
  }

  function stepThree(draft, pet) {
    var answers = draft.answers;
    var companions = answers.companions.map(function (value) {
      return labelFor(window.UserData.COMPANIONS_OPTIONS, value);
    }).join(', ');

    return window.Dom.h`
      <form id="adoption-form" novalidate>
        <div class="field">
          <label class="field__label" for="f-message">Mensaje para el refugio</label>
          <p class="field__hint">Cuéntales por qué quieres adoptar a ${pet.name}. Un mensaje sincero ayuda mucho en la valoración.</p>
          <textarea class="textarea" id="f-message" name="message" maxlength="600"
                    placeholder="Ej. Vivo con mi pareja en un departamento con parque cerca. Buscamos un compañero tranquilo…">${draft.message}</textarea>
          <span class="field__hint"><span id="message-count">0</span>/600 caracteres</span>
        </div>

        <div class="block" style="background:var(--c-surface-2);box-shadow:none">
          <h3 class="block__title">${window.Dom.raw(window.Icon.render('clipboard'))} Resumen de tu solicitud</h3>
          ${window.Dom.raw([
            summaryRow('Mascota', pet.name + ' · ' + pet.breed),
            summaryRow('Refugio', pet.shelter ? pet.shelter.name : '—'),
            summaryRow('Contacto', draft.applicant.name + ' · ' + draft.applicant.email),
            summaryRow('Teléfono', draft.applicant.phone),
            summaryRow('Ciudad', draft.applicant.city),
            summaryRow('Vivienda', labelFor(window.UserData.HOUSING_OPTIONS, answers.housing)),
            summaryRow('Convivencia', companions),
            summaryRow('Experiencia', labelFor(window.UserData.EXPERIENCE_OPTIONS, answers.experience)),
            summaryRow('Tiempo de juego', labelFor(OUTDOOR_OPTIONS, answers.outdoor)),
            summaryRow('Horas solo', answers.aloneHours ? answers.aloneHours + ' h' : '')
          ].join(''))}
        </div>

        <div class="field" data-field="acceptTerms" style="margin-top:var(--s-4)">
          <label class="option" style="flex-direction:row;align-items:flex-start;text-align:left;gap:var(--s-3)">
            <input type="checkbox" name="acceptTerms" ${draft.acceptTerms ? window.Dom.raw('checked') : ''}>
            <span style="font-weight:500;font-size:var(--fs-sm);line-height:1.5">
              Me comprometo a cuidar, esterilizar y mantener al día la salud de la mascota,
              y acepto el seguimiento del refugio durante el primer año.
            </span>
          </label>
          <span class="field__error">${window.Dom.raw(window.Icon.render('info'))}<span data-error-text></span></span>
        </div>
      </form>`;
  }

  /* --------------------------------------------------------------------------
   * Confirmación final
   * ------------------------------------------------------------------------ */
  function successView(pet, request) {
    return window.Dom.h`
      <div class="text-center" style="padding:var(--s-2) 0">
        <span class="empty__art" style="margin:0 auto var(--s-4);background:var(--c-success-soft);color:var(--c-success)">
          ${window.Dom.raw(window.Icon.render('checkCircle'))}
        </span>
        <h3 style="font-size:var(--fs-xl)">¡Solicitud enviada!</h3>
        <p style="margin-top:var(--s-2)">
          Tu solicitud para adoptar a <strong>${pet.name}</strong> ya está con
          ${pet.shelter ? pet.shelter.name : 'el refugio'}. Recibirás novedades por correo.
        </p>
        <p class="pill" style="margin-top:var(--s-4)">Folio ${request.id.toUpperCase()}</p>

        <div class="steps" style="margin-top:var(--s-5);text-align:left">
          <div class="steps__item is-current">
            <span class="steps__bar"><span></span></span>
            <span class="steps__label">1. Recibida</span>
          </div>
          <div class="steps__item">
            <span class="steps__bar"><span></span></span>
            <span class="steps__label">2. En revisión</span>
          </div>
          <div class="steps__item">
            <span class="steps__bar"><span></span></span>
            <span class="steps__label">3. Entrevista</span>
          </div>
        </div>

        <div class="empty__actions" style="margin-top:var(--s-5)">
          <button class="btn btn--primary" type="button" data-go-requests>
            ${window.Dom.raw(window.Icon.render('clipboard'))} Ver mis solicitudes
          </button>
          <a class="btn btn--ghost" href="#/mascotas">Seguir explorando</a>
        </div>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Apertura del flujo completo
   * ------------------------------------------------------------------------ */
  function open(pet) {
    if (!pet) { return null; }
    var draft = buildDraft();
    var submitting = false;

    function bodyFor(step) {
      if (step === 1) { return stepsBar(1) + stepOne(draft); }
      if (step === 2) { return stepsBar(2) + stepTwo(draft); }
      return stepsBar(3) + stepThree(draft, pet);
    }

    function footerFor(step) {
      var backButton = step > 1
        ? window.Dom.h`<button class="btn btn--ghost" type="button" data-step="back">
             ${window.Dom.raw(window.Icon.render('chevronLeft'))} Atrás
           </button>`
        : window.Dom.h`<button class="btn btn--ghost" type="button" data-modal-close>Cancelar</button>`;

      var nextButton = step < TOTAL_STEPS
        ? window.Dom.h`<button class="btn btn--primary grow" type="button" data-step="next">
             Continuar ${window.Dom.raw(window.Icon.render('arrowRight'))}
           </button>`
        : window.Dom.h`<button class="btn btn--primary grow" type="button" data-step="submit">
             ${window.Dom.raw(window.Icon.render('heartSolid'))} Enviar solicitud
           </button>`;

      return backButton + nextButton;
    }

    var modal = window.Modal.open({
      title: 'Solicitar adopción',
      subtitle: pet.name + ' · ' + pet.breed + (pet.shelter ? ' · ' + pet.shelter.name : ''),
      body: bodyFor(1),
      footer: footerFor(1),
      initialFocus: '#f-name',
      onMount: function (dialog, close) {
        var body = window.Dom.qs('.modal__body', dialog);
        var foot = window.Dom.qs('.modal__foot', dialog);

        /* --- Lectura de datos del formulario ---------------------------- */
        function collect() {
          var form = window.Dom.qs('#adoption-form', dialog);
          if (!form) { return; }

          if (draft.step === 1) {
            draft.applicant.name = form.querySelector('[name="name"]').value.trim();
            draft.applicant.email = form.querySelector('[name="email"]').value.trim();
            draft.applicant.phone = form.querySelector('[name="phone"]').value.trim();
            draft.applicant.city = form.querySelector('[name="city"]').value.trim();
          }

          if (draft.step === 2) {
            var housing = form.querySelector('[name="housing"]:checked');
            draft.answers.housing = housing ? housing.value : '';
            draft.answers.companions = window.Dom.qsa('[name="companions"]:checked', form).map(function (input) { return input.value; });
            var experience = form.querySelector('[name="experience"]:checked');
            draft.answers.experience = experience ? experience.value : '';
            var outdoor = form.querySelector('[name="outdoor"]:checked');
            draft.answers.outdoor = outdoor ? outdoor.value : '';
            var alone = form.querySelector('[name="aloneHours"]');
            draft.answers.aloneHours = alone ? alone.value : '4';
          }

          if (draft.step === 3) {
            var message = form.querySelector('[name="message"]');
            draft.message = message ? message.value.trim() : '';
            var terms = form.querySelector('[name="acceptTerms"]');
            draft.acceptTerms = !!(terms && terms.checked);
          }
        }

        /* --- Pintado de errores ---------------------------------------- */
        function paintErrors(errors) {
          window.Dom.qsa('.field', dialog).forEach(function (field) {
            field.classList.remove('has-error');
          });
          var firstKey = null;
          Object.keys(errors).forEach(function (key) {
            if (!firstKey) { firstKey = key; }
            var field = window.Dom.qs('[data-field="' + key + '"]', dialog);
            if (!field) { return; }
            field.classList.add('has-error');
            var text = window.Dom.qs('[data-error-text]', field);
            if (text) { text.textContent = errors[key]; }
          });

          if (firstKey) {
            var firstField = window.Dom.qs('[data-field="' + firstKey + '"]', dialog);
            var focusTarget = firstField ? firstField.querySelector('input, select, textarea') : null;
            window.A11y.focus(focusTarget || firstField);
            window.A11y.announce('Revisa los campos marcados en rojo.');
          }
        }

        /* --- Repintado del modal en cada paso -------------------------- */
        function renderStep() {
          body.innerHTML = bodyFor(draft.step);
          foot.innerHTML = footerFor(draft.step);
          window.Icon.inject(dialog);
          body.scrollTop = 0;

          var message = window.Dom.qs('#f-message', dialog);
          var counter = window.Dom.qs('#message-count', dialog);
          if (message && counter) {
            counter.textContent = String(message.value.length);
            message.addEventListener('input', function () {
              counter.textContent = String(message.value.length);
            });
          }

          var firstInput = body.querySelector('input, select, textarea');
          if (firstInput && draft.step !== 1) { window.A11y.focus(firstInput); }
        }

        /* --- Guardado -------------------------------------------------- */
        function submit() {
          if (submitting) { return; }
          submitting = true;

          var submitButton = window.Dom.qs('[data-step="submit"]', foot);
          if (submitButton) {
            submitButton.setAttribute('aria-disabled', 'true');
            submitButton.innerHTML = window.Dom.h`
              <span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.45);
                           border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite"></span>
              Enviando…`;
          }

          /* Espacio para una llamada real: Repository.createRequest(...) */
          window.setTimeout(function () {
            var request = window.State.createRequest(pet.id, {
              message: draft.message,
              applicant: Object.assign({}, draft.applicant),
              answers: Object.assign({}, draft.answers)
            });

            /* Actualizamos el perfil con los datos confirmados */
            window.State.updateUser({
              name: draft.applicant.name,
              email: draft.applicant.email,
              phone: draft.applicant.phone,
              city: draft.applicant.city
            });

            if (window.App) { window.App.refreshNavigation(); }

            body.innerHTML = successView(pet, request);
            foot.innerHTML = window.Dom.h`
              <button class="btn btn--ghost btn--block" type="button" data-modal-close>Cerrar</button>`;
            window.Icon.inject(dialog);

            window.Toast.success(
              'Tu solicitud para ' + pet.name + ' quedó registrada',
              '¡Solicitud enviada!'
            );

            var goRequests = window.Dom.qs('[data-go-requests]', dialog);
            if (goRequests) {
              goRequests.addEventListener('click', function () {
                close();
                window.Router.navigate('/solicitudes');
              });
            }
            submitting = false;
          }, 620);
        }

        /* --- Interacción ---------------------------------------------- */
        dialog.addEventListener('click', function (event) {
          var next = event.target.closest('[data-step="next"]');
          var back = event.target.closest('[data-step="back"]');
          var send = event.target.closest('[data-step="submit"]');
          if (!next && !back && !send) { return; }

          collect();

          if (back) {
            draft.step = Math.max(1, draft.step - 1);
            renderStep();
            return;
          }

          if (next) {
            var errors = validateStep(draft.step, draft);
            if (Object.keys(errors).length) { paintErrors(errors); return; }
            draft.step = Math.min(TOTAL_STEPS, draft.step + 1);
            renderStep();
            return;
          }

          if (send) {
            var finalErrors = validateStep(3, draft);
            if (Object.keys(finalErrors).length) { paintErrors(finalErrors); return; }
            submit();
          }
        });

        /* La tecla Enter avanza de paso en lugar de enviar prematuramente */
        dialog.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            if (draft.step < TOTAL_STEPS) {
              event.preventDefault();
              var nextButton = window.Dom.qs('[data-step="next"]', foot);
              if (nextButton) { nextButton.click(); }
            }
          }
        });

        /* Contador inicial del mensaje */
        var initialMessage = window.Dom.qs('#f-message', dialog);
        var initialCounter = window.Dom.qs('#message-count', dialog);
        if (initialMessage && initialCounter) { initialCounter.textContent = String(initialMessage.value.length); }
      }
    });

    return modal;
  }

  window.AdoptionForm = {
    open: open,
    validateStep: validateStep,
    buildDraft: buildDraft
  };
})();

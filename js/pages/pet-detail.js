/* ============================================================================
 * pet-detail.js — Ficha completa de una mascota
 * ----------------------------------------------------------------------------
 * Galería con miniaturas, datos clave, descripción, estado de salud verificado,
 * información del refugio, barra de acción fija en móvil y recomendaciones de
 * mascotas similares.
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Bloques
   * ------------------------------------------------------------------------ */
  function gallery(pet) {
    var favorite = window.State.isFavorite(pet.id);

    var thumbs = pet.photos.map(function (photo, index) {
      return window.Dom.h`
        <button class="gallery__thumb ${index === 0 ? 'is-active' : ''}" type="button"
                data-photo="${index}" aria-label="Ver foto ${index + 1} de ${pet.name}">
          ${window.Media.portrait({
            id: photo, name: pet.name, alt: '', width: 300, className: 'gallery__thumb-img'
          })}
        </button>`;
    }).join('');

    return window.Dom.h`
      <div class="gallery reveal" style="--i:0">
        <div class="gallery__main">
          <img id="gallery-main-img"
               src="${window.Media.photoUrl(pet.cover, 1000)}"
               srcset="${window.Media.srcset(pet.cover, 1000)}"
               sizes="(max-width: 980px) 100vw, 560px"
               alt="${pet.name}, ${pet.breed} en adopción"
               fetchpriority="high" decoding="async">
          <div class="gallery__actions">
            <button class="fab ${favorite ? 'is-active' : ''}" type="button" data-fav="${pet.id}"
                    aria-pressed="${favorite ? 'true' : 'false'}"
                    aria-label="${favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
                    title="${favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
              ${window.Dom.raw(window.Icon.render(favorite ? 'heartSolid' : 'heart'))}
            </button>
            <button class="fab" type="button" data-action="share" data-pet="${pet.id}"
                    aria-label="Compartir esta ficha" title="Compartir">
              ${window.Dom.raw(window.Icon.render('share'))}
            </button>
          </div>
          <span class="badge badge--glass badge--float">
            ${window.Dom.raw(window.Icon.render('location'))} ${pet.location}
          </span>
        </div>

        ${pet.photos.length > 1 ? window.Dom.raw(window.Dom.h`
          <div class="gallery__thumbs" role="group" aria-label="Fotos de ${pet.name}">
            ${window.Dom.raw(thumbs)}
          </div>`) : ''}
      </div>`;
  }

  function facts(pet) {
    var items = [
      { icon: 'cake', value: pet.ageLabel, label: 'Edad' },
      { icon: 'scale', value: pet.weightLabel, label: 'Peso' },
      { icon: pet.sex === 'hembra' ? 'heart' : 'paw', value: pet.sexLabel, label: 'Sexo' },
      { icon: 'paw', value: pet.sizeLabel, label: 'Tamaño' }
    ];

    return window.Dom.h`
      <div class="facts">
        ${window.Dom.raw(items.map(function (item) {
          return window.Dom.h`
            <div class="fact">
              ${window.Dom.raw(window.Icon.render(item.icon))}
              <strong>${item.value}</strong>
              <span>${item.label}</span>
            </div>`;
        }).join(''))}
      </div>`;
  }

  function healthBlock(pet) {
    var rows = [
      { key: 'vaccinated', label: 'Vacunas al día', hint: pet.health.vaccinated ? 'Carné actualizado' : 'Pendiente' },
      { key: 'sterilized', label: 'Esterilizado/a', hint: pet.health.sterilized ? 'Intervención realizada' : 'Se realiza antes de la entrega' },
      { key: 'dewormed', label: 'Desparasitado', hint: pet.health.dewormed ? 'Tratamiento vigente' : 'Pendiente' },
      { key: 'microchipped', label: 'Microchip', hint: pet.health.microchipped ? 'Identificación registrada' : 'Se coloca en la adopción' }
    ];

    var html = rows.map(function (row) {
      var ok = !!pet.health[row.key];
      return window.Dom.h`
        <div class="health__item">
          <span class="health__check ${ok ? '' : 'health__check--no'}">
            ${window.Dom.raw(window.Icon.render(ok ? 'check' : 'clock'))}
          </span>
          <span>
            ${row.label}
            <small>${row.hint}</small>
          </span>
        </div>`;
    }).join('');

    return window.Dom.h`
      <section class="block">
        <h2 class="block__title">${window.Dom.raw(window.Icon.render('shield'))} Salud verificada</h2>
        <div class="health">${window.Dom.raw(html)}</div>
        ${pet.health.notes ? window.Dom.raw(window.Dom.h`
          <p class="field__hint" style="margin-top:var(--s-4)">${pet.health.notes}</p>`) : ''}
      </section>`;
  }

  function shelterBlock(pet) {
    if (!pet.shelter) { return ''; }
    var shelter = pet.shelter;

    return window.Dom.h`
      <section class="block">
        <h2 class="block__title">${window.Dom.raw(window.Icon.render('home'))} Quién lo cuida hoy</h2>
        <div class="shelter">
          <span class="shelter__logo">${window.Format.initials(shelter.name)}</span>
          <div class="grow">
            <strong style="font-family:var(--f-display);font-size:var(--fs-lg)">${shelter.name}</strong>
            ${shelter.verified
              ? window.Dom.raw(window.Dom.h`<span class="badge badge--success" style="margin-left:var(--s-2)">
                  ${window.Dom.raw(window.Icon.render('checkCircle'))} Verificado</span>`)
              : ''}
            <div class="shelter__meta">
              <span>${window.Dom.raw(window.Icon.render('location'))} ${shelter.city}</span>
              <span>${window.Dom.raw(window.Icon.render('clock'))} ${shelter.hours}</span>
              <span>${window.Dom.raw(window.Icon.render('phone'))} ${shelter.phone}</span>
              <span>${window.Dom.raw(window.Icon.render('mail'))} ${shelter.email}</span>
            </div>
          </div>
        </div>
        <div class="row" style="gap:var(--s-3);margin-top:var(--s-4);flex-wrap:wrap">
          <a class="btn btn--ghost btn--sm" href="tel:${shelter.phone.replace(/\s/g, '')}">
            ${window.Dom.raw(window.Icon.render('phone'))} Llamar
          </a>
          <a class="btn btn--ghost btn--sm" href="mailto:${shelter.email}?subject=Consulta sobre ${pet.name}">
            ${window.Dom.raw(window.Icon.render('mail'))} Escribir
          </a>
        </div>
      </section>`;
  }

  function actionBar(pet, existingRequest) {
    if (existingRequest) {
      return window.Dom.h`
        <div class="action-bar">
          <p class="applied-note grow">
            ${window.Dom.raw(window.Icon.render('checkCircle'))}
            <span>
              Ya enviaste una solicitud (${window.Format.statusLabel(existingRequest.status)}).
              <a href="#/solicitudes" style="text-decoration:underline">Ver seguimiento</a>
            </span>
          </p>
        </div>`;
    }

    var favorite = window.State.isFavorite(pet.id);

    return window.Dom.h`
      <div class="action-bar">
        <button class="btn btn--ghost btn--icon" type="button" data-fav="${pet.id}"
                aria-pressed="${favorite ? 'true' : 'false'}"
                aria-label="${favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
          ${window.Dom.raw(window.Icon.render(favorite ? 'heartSolid' : 'heart'))}
        </button>
        <button class="btn btn--primary" type="button" data-action="adopt" data-pet="${pet.id}">
          ${window.Dom.raw(window.Icon.render('heartHand'))} Solicitar adopción
        </button>
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Vista
   * ------------------------------------------------------------------------ */
  function view(params) {
    var petId = params && params.id;
    var pet = window.Repository._sync.getPet(petId);

    if (!pet) {
      window.A11y.setTitle('Mascota no encontrada');
      return window.Dom.h`
        <div class="empty" style="margin-top:var(--s-10)">
          <span class="empty__art">${window.Dom.raw(window.Icon.render('search'))}</span>
          <h3>No encontramos a esa mascota</h3>
          <p>Puede que su ficha ya no esté publicada porque encontró familia. Mira quién sigue esperando.</p>
          <div class="empty__actions">
            <a class="btn btn--primary" href="#/mascotas">
              ${window.Dom.raw(window.Icon.render('pawSolid'))} Ver mascotas en adopción
            </a>
          </div>
        </div>`;
    }

    window.A11y.setTitle(pet.name + ' · ' + pet.breed);

    var existingRequest = window.State.getRequestForPet(pet.id);
    var similar = window.Repository._sync.similarPets(pet, 4);

    var traits = (pet.personality || []).map(function (trait) {
      return window.Dom.h`<span class="trait">${window.Dom.raw(window.Icon.render('check'))} ${trait}</span>`;
    }).join('');

    var tags = (pet.tags || []).map(function (tag) {
      return window.Dom.h`<span class="badge badge--primary">${tag}</span>`;
    }).join('');

    return window.Dom.h`
      <div>
        <a class="back-link" href="#/mascotas" data-action="back">
          ${window.Dom.raw(window.Icon.render('chevronLeft'))} Volver al catálogo
        </a>

        <div class="detail">
          <div>
            ${window.Dom.raw(gallery(pet))}
          </div>

          <div class="detail__panel">
            <header class="detail__header reveal" style="--i:1">
              <h1>${pet.name}</h1>
              <p class="detail__sub">
                ${window.Dom.raw(window.Icon.render(pet.speciesIcon))} ${pet.breed}
                <span aria-hidden="true">·</span>
                ${pet.speciesLabel}
                <span aria-hidden="true">·</span>
                ${pet.location}
              </p>
              <div class="detail__badges">
                ${window.Dom.raw(tags)}
                <span class="badge badge--success">
                  ${window.Dom.raw(window.Icon.render('shield'))} Salud ${pet.healthScore}/4
                </span>
                <span class="badge">${window.Dom.raw(window.Icon.render('clock'))} Publicado ${window.Format.relative(pet.publishedAt)}</span>
              </div>
            </header>

            ${window.Dom.raw(facts(pet))}

            ${window.Dom.raw(window.Cards.block(
              'Sobre mí',
              'paw',
              window.Dom.h`<p>${pet.description}</p>` +
              (traits ? window.Dom.h`<div class="traits" style="margin-top:var(--s-4)">${window.Dom.raw(traits)}</div>` : '')
            ))}


            ${window.Dom.raw(healthBlock(pet))}
            ${window.Dom.raw(shelterBlock(pet))}

            ${window.Dom.raw(window.Cards.demoNote(
              'El proceso incluye una entrevista y una visita al refugio. La adopción es gratuita; solo pedimos compromiso y seguimiento.',
              'info'
            ))}
          </div>
        </div>

        ${window.Dom.raw(actionBar(pet, existingRequest))}

        ${similar.length ? window.Dom.raw(window.Dom.h`
          <section style="margin-top:var(--s-10)">
            <div class="section-head">
              <div class="section-head__title">
                ${window.Dom.raw(window.Icon.render('sparkles'))}
                <div>
                  <h2>También podrían encajar</h2>
                  <p>${window.Format.speciesPlural(pet.species)} con características parecidas</p>
                </div>
              </div>
              <a class="link-more" href="#/mascotas?especie=${pet.species}">
                Ver todos ${window.Dom.raw(window.Icon.render('arrowRight'))}
              </a>
            </div>
            <div class="carousel">
              ${window.Dom.raw(similar.map(function (candidate, index) {
                return window.PetCard.card(candidate, { index: index });
              }).join(''))}
            </div>
          </section>`) : ''}
      </div>`;
  }

  /* --------------------------------------------------------------------------
   * Montaje
   * ------------------------------------------------------------------------ */
  function mount(root, params) {
    if (!root) { return; }
    var pet = window.Repository._sync.getPet(params && params.id);

    /* --- Galería: cambio de foto principal --- */
    function onClick(event) {
      var thumb = event.target.closest('[data-photo]');
      if (thumb && pet) {
        var index = Number(thumb.getAttribute('data-photo'));
        var photo = pet.photos[index];
        var main = document.getElementById('gallery-main-img');
        if (main && photo) {
          main.style.opacity = '0';
          window.setTimeout(function () {
            main.src = window.Media.photoUrl(photo, 1000);
            main.srcset = window.Media.srcset(photo, 1000);
            main.style.opacity = '';
          }, 140);
        }
        window.Dom.qsa('[data-photo]', root).forEach(function (node) {
          node.classList.toggle('is-active', node === thumb);
        });
        return;
      }

      /* --- Compartir: Web Share API con respaldo de copiado --- */
      var share = event.target.closest('[data-action="share"]');
      if (share) {
        var url = window.location.href;
        if (navigator.share) {
          navigator.share({
            title: 'Adopta · ' + (pet ? pet.name : 'Mascota'),
            text: pet ? 'Conoce a ' + pet.name + ', ' + pet.breed + ' en adopción.' : '',
            url: url
          }).catch(function () { /* el usuario canceló */ });
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            window.Toast.success('Enlace copiado al portapapeles', 'Listo para compartir');
          });
        } else {
          window.Toast.info('Copia el enlace de la barra de direcciones para compartir.');
        }
      }
    }

    root.addEventListener('click', onClick);
    window.Views.onLeave(function () { root.removeEventListener('click', onClick); });
  }

  window.Views = window.Views || {};
  window.Views['pet-detail'] = { render: view, mount: mount };
})();

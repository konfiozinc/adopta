/* ============================================================================
 * search.js — Comportamiento del buscador (debounce + autocompletado)
 * ----------------------------------------------------------------------------
 * Centraliza la lógica de búsqueda para Inicio y Catálogo: escritura con
 * retardo, sugerencias navegables con el teclado, historial de búsquedas y
 * limpieza del campo.
 * ========================================================================== */
(function () {
  'use strict';

  var DEBOUNCE_MS = 220;

  /* Conecta un buscador ya presente en el DOM.
   * options: { onInput(value), onSubmit(value), suggestions(bool) } */
  function wire(root, options) {
    var opts = options || {};
    var box = window.Dom.qs('[data-search-box]', root);
    if (!box) { return null; }

    var input = window.Dom.qs('[data-search-input]', box);
    var clearButton = window.Dom.qs('[data-search-clear]', box);
    var timer = null;
    var suggestBox = null;
    var activeIndex = -1;
    var suggestions = [];

    function closeSuggestions() {
      if (suggestBox && suggestBox.parentNode) { suggestBox.parentNode.removeChild(suggestBox); }
      suggestBox = null;
      activeIndex = -1;
      suggestions = [];
    }

    function openSuggestions(term) {
      suggestions = window.Repository.suggest(term, 6);
      closeSuggestions();

      if (!suggestions.length) {
        return;
      }

      suggestBox = window.Dom.el(window.Dom.h`
        <div class="suggest" role="listbox" aria-label="Sugerencias de búsqueda">
          ${window.Dom.raw(suggestions.map(function (item, index) {
            var pet = item.pet;
            return window.Dom.h`
              <button class="suggest__item" type="button" role="option" data-suggest-index="${index}">
                <span class="suggest__thumb" style="position:relative;overflow:hidden;display:block">
                  ${window.Media.portrait({
                    id: pet.cover, name: pet.name, alt: '', width: 160,
                    className: 'suggest__thumb'
                  })}
                </span>
                <span class="grow">
                  <strong>${item.text}</strong>
                  <small>${pet.speciesLabel} · ${pet.ageLabel} · ${pet.location}</small>
                </span>
                ${window.Dom.raw(window.Icon.render('arrowRight'))}
              </button>`;
          }))}
        </div>`);

      box.appendChild(suggestBox);
      window.Icon.inject(suggestBox);
      window.Media.hydrateImages(suggestBox);

      suggestBox.addEventListener('mousedown', function (event) {
        var button = event.target.closest('[data-suggest-index]');
        if (!button) { return; }
        event.preventDefault();
        var item = suggestions[Number(button.getAttribute('data-suggest-index'))];
        if (!item) { return; }
        input.value = item.text;
        updateClearState();
        closeSuggestions();
        commit(item.text);
        goToResults(item.text);
      });
    }

    function updateClearState() {
      box.classList.toggle('has-value', !!input.value);
    }

    function commit(value) {
      if (typeof opts.onInput === 'function') { opts.onInput(value); }
    }

    function goToResults(value) {
      if (typeof opts.onSubmit === 'function') { opts.onSubmit(value); }
    }

    function highlight(index) {
      if (!suggestBox) { return; }
      var items = window.Dom.qsa('.suggest__item', suggestBox);
      items.forEach(function (item, i) {
        item.classList.toggle('is-active', i === index);
      });
      activeIndex = index;
    }

    input.addEventListener('input', function () {
      updateClearState();
      var value = input.value;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        commit(value);
        if (opts.suggestions === false) { return; }
        if (value.trim().length >= 2) {
          openSuggestions(value);
        } else {
          closeSuggestions();
        }
      }, DEBOUNCE_MS);
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' && suggestBox) {
        event.preventDefault();
        highlight(Math.min(activeIndex + 1, suggestions.length - 1));
        return;
      }
      if (event.key === 'ArrowUp' && suggestBox) {
        event.preventDefault();
        highlight(Math.max(activeIndex - 1, 0));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        window.clearTimeout(timer);
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          var chosen = suggestions[activeIndex];
          input.value = chosen.text;
          updateClearState();
          closeSuggestions();
          commit(chosen.text);
          goToResults(chosen.text);
          return;
        }
        commit(input.value);
        goToResults(input.value);
        return;
      }
      if (event.key === 'Escape') {
        if (suggestBox) {
          closeSuggestions();
        } else {
          input.value = '';
          updateClearState();
          commit('');
        }
      }
    });

    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 2 && opts.suggestions !== false) {
        openSuggestions(input.value);
      }
    });

    input.addEventListener('blur', function () {
      window.setTimeout(closeSuggestions, 130);
    });

    if (clearButton) {
      clearButton.addEventListener('click', function () {
        input.value = '';
        updateClearState();
        closeSuggestions();
        commit('');
        input.focus();
      });
    }

    updateClearState();

    /* Vista previa del historial de búsquedas al enfocar un campo vacío */
    if (opts.showHistory !== false) {
      input.addEventListener('focus', function () {
        var history = window.State.get().recentSearches || [];
        if (input.value || !history.length || suggestBox) { return; }
        suggestions = history.map(function (term) {
          return { text: term, pet: null };
        });
        suggestBox = window.Dom.el(window.Dom.h`
          <div class="suggest" role="listbox" aria-label="Búsquedas recientes">
            <p class="suggest__empty" style="text-align:left;padding:var(--s-2) var(--s-3)">
              Búsquedas recientes
            </p>
            ${window.Dom.raw(history.map(function (term, index) {
              return window.Dom.h`
                <button class="suggest__item" type="button" role="option" data-suggest-index="${index}">
                  ${window.Dom.raw(window.Icon.render('clock'))}
                  <span class="grow"><strong>${term}</strong></span>
                </button>`;
            }).join(''))}
          </div>`);
        box.appendChild(suggestBox);
        window.Icon.inject(suggestBox);
        suggestBox.addEventListener('mousedown', function (event) {
          var button = event.target.closest('[data-suggest-index]');
          if (!button) { return; }
          event.preventDefault();
          var chosen = suggestions[Number(button.getAttribute('data-suggest-index'))];
          if (!chosen) { return; }
          input.value = chosen.text;
          updateClearState();
          closeSuggestions();
          commit(chosen.text);
          goToResults(chosen.text);
        });
      });
    }

    return {
      input: input,
      value: function () { return input.value; },
      setValue: function (value) {
        input.value = value || '';
        updateClearState();
      },
      close: closeSuggestions
    };
  }

  window.Search = { wire: wire };
})();

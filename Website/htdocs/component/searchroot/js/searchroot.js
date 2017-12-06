/*========================================================================
* $Id: searchroot.js 91149 2016-06-07 10:19:57Z jakob.praher $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2013
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/

define([
  "underscore",
  "api/v2/search",
  "utils/dom",
  "component!view",
  "client/template",
  "component!base",
  "jquery"
], function(
  _,
  Search,
  dom,
  ViewTemplate,
  Template,
  Base,
  $
) {

  var SearchTemplate = Template.extend({
  });

  SearchTemplate.View = Base.extend({

    events: function () {
      return _.extend({}, Base.prototype.events, {
        "keydown": "handleShortcut",
        "focusin [data-shortcut]": "updateActivedescendant"
      });
    },

    updateActivedescendant: function (e) {
      if (e.activedescendantUpdated) return;

      var focusedEl = e.target,
          parentEl = e.currentTarget;

      if (parentEl.hasAttribute("data-track-activedescendant")) {
        this.setActivedescendant(parentEl.getAttribute("data-shortcut"), focusedEl);
      }
      // prevent setting on nested elements
      e.activedescendantUpdated = true;
    },

    setActivedescendant: function (id, focusedEl) {
      this.activedescendants = this.activedescendants || {};
      this.activedescendants[id] = focusedEl;
    },

    getActivedescendant: function (id, parentEl) {
      var activedescendant = this.activedescendants && this.activedescendants[id];
      return activedescendant && dom.isChild(activedescendant, parentEl) ? activedescendant : null;
    },

    handleShortcut: function (e) {
      var keys = [],
          selector,
          $toSelect,
          // only allowing 0-9 and A-Z, since all characters are sent upper case. Preventing e.g. F4 => 115 => s
          key = (e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90) ? String.fromCharCode(e.keyCode >= 96 && e.keyCode <= 105 ? e.keyCode - 48 :  e.keyCode).replace(/\W/g, "") : undefined,
          $el,
          activedescendantEl,
          triggerAction = true;

      if (e.altKey) keys.push("alt");
      if (e.ctrlKey) keys.push("ctrl");
      if (e.metaKey) keys.push("meta");

      if (key && keys.length > 0) {
        if (e.shiftKey) keys.push("shift");
        keys.push(key);

        if (JSON.stringify(keys) === this.lastKeys) return;

        selector = ('[data-shortcut="' + keys.join("+") + '"]').toLowerCase();
        $el = this.$el.find(selector);

        if ($el.length > 0) {
          this.options.application.accessibilityContainer.enableFocusHighlighting();
          e.preventDefault();
          e.stopPropagation();
          document.activeElement && document.activeElement.blur();

          activedescendantEl = this.getActivedescendant($el.attr("data-shortcut"), $el[0]);
          if (activedescendantEl) {
            triggerAction = false;
            $el = $(activedescendantEl);
          }
          dom.focus($el);
          if ($el[0] && $el[0].select) {
            $el[0].select();
          } else if (triggerAction) {
            $el.trigger("click");
          }
        }
      }

      this.lastKeys = JSON.stringify(keys);
    },

    getEditControls: function () {
    }

  });

  return SearchTemplate;
});

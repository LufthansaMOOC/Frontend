/*========================================================================
 * $Id: localized_model.js 75710 2013-10-09 08:11:33Z michael.biebl $
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

define(["underscore", "backbone", "i18n/i18n"], function(_, Backbone, i18n) {

  return Backbone.Model.extend({

    localizedProperties: [],

    get: function (key) {
      var value = Backbone.Model.prototype.get.apply(this, arguments);

      if (_.indexOf(this.localizedProperties, key) >= 0) {
        return this.localize(value);
      }

      return value;
    },

    localize: function (label) {
      if (!label) return;
      if (_.isString(label)) return i18n(label);

      var locale = i18n.locale;
      var value = label[locale];

      if (!value) {
        if (locale.length > 2) {
          locale = locale.substring(0, 2);
          value = label[locale];
        }
      }

      return value;
    }
  });

});

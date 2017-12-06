
/*========================================================================
* $Id: model.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "i18n/i18n",
    "component!list",
    "component!mustache",
    "utils/dom",
    "underscore",
    "backbone"
  ],
  function(
    i18n,
    ListTemplate,
    MustacheTemplate,
    dom,
    _,
    Backbone
  ) {
  var ListView = ListTemplate.View;

  var AdderEntry = Backbone.Model.extend({
  
    create: function (application, parent, insertBefore) {
      var templateType = this.get("templateType"),
          el = application.create(templateType, this.get("options"));

      if (insertBefore) {
        parent.el.insertBefore(el, insertBefore);
      } else {
        parent.el.appendChild(el);
      }
      window.setTimeout(function () {
        application.reload(function () {
            el.scrollIntoView();
            application.editTemplate(application.templateTree.getTemplateByEl(el));
        });
      }, 0);
    },

    toJSON: function () {
      var json = Backbone.Model.prototype.toJSON.apply(this, arguments);

      _.forEach(json, function (value, key) {
          json[key] = i18n(value);
      });

      return json;
    }
  });

  var AdderGroup = Backbone.Model.extend({
    toJSON: function () {
      var json = Backbone.Model.prototype.toJSON.apply(this, arguments);

      _.forEach(json, function (value, key) {
          json[key] = i18n(value);
      });

      return json;
    }
  });

  var Adders = Backbone.Collection.extend({
      model: AdderEntry
  });

  var AdderGroups = Backbone.Collection.extend({
      model: AdderGroup
  });

  AdderGroups.Adders = Adders;

  return AdderGroups;
});

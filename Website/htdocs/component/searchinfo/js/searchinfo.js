/*========================================================================
* $Id: searchinfo.js 98065 2017-05-11 15:06:51Z michael.biebl $
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

/*
* SearchInfoTemplate
* ==================
*
* A component to display did you mean and search history.
*
*/

define([
    "i18n/i18n",
    "client/template",
    "client/templateregistry",
    "component!base",
    "text!../mustache/template.mustache",
    "backbone"
  ], function(
    i18n,
    Template,
    TemplateRegistry,
    Component,
    DEFAULT_TEMPLATE,
    Backbone
  ) {

    TemplateRegistry.add({
        id: "searchinfo",
        name: "editor_searchinfo_title",
        weight: 6,

        getAdders: function (model) {
          return [{
            icon: "../img/imgsearchinfo.png",
            name: "editor_searchinfo_title", 
            description: "editor_searchinfo_description"
          }];
        },

        create: function (options) {
          return Backbone.View.prototype.make(
            "div",
            {
              "data-template": "searchinfo"
            }
          );
        }
    });

    var SearchInfo = Template.extend({

      hasContent: function () {
        return true;
      },

      getDefaultTemplate: function () {
        return DEFAULT_TEMPLATE;
      }

    });

    SearchInfo.View = Component.extend({
    });

    return SearchInfo;
});

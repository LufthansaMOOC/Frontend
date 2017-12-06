/*========================================================================
* $Id: datasources.js 75612 2013-10-05 06:23:56Z michael.biebl $
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
    "api/v2/search",
    "component!constraints",
    "client/templateregistry"
  ], function(
    i18n,
    Search,
    ConstraintsTemplate,
    TemplateRegistry
  ) {

    var DataSourcesTemplate = ConstraintsTemplate.extend({
    });
    DataSourcesTemplate.View = ConstraintsTemplate.View.extend({
      initialize: function () {
        this.options.title = this.options.title || i18n("datasources");
        this.options.suggest = false;
        ConstraintsTemplate.View.prototype.initialize.apply(this, arguments);
      }
    })

  return DataSourcesTemplate;
});

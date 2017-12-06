/*========================================================================
* $Id: settings.js 98419 2017-05-29 08:58:04Z daniel.eppensteiner $
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
  "backbone"
], function (
  Backbone
) {

  var SettingsCollection = Backbone.Collection.extend({
      }),
      Settings = new SettingsCollection();

  Mindbreeze.define("client/settingsapplistsview", ["component!applists"], function (ApplistsTemplate) {
    return ApplistsTemplate.View.extend({

      initialize: function (options) {
        this.options.model = this.options.application.models.applists;
        this.model = this.options.model;
        ApplistsTemplate.View.prototype.initialize.apply(this, arguments);
      }

    });
  });

  Mindbreeze.define("client/settingsprofilesettings", ["component!profilesettingsview"], function (ProfileSettings) {
    return ProfileSettings.View.extend({
      initialize: function (options) {
        ProfileSettings.View.prototype.initialize.apply(this, arguments);
      }
    });
  });

  Settings.add({
    name: "federated_sources",
    module: "client/settingsapplistsview"
  });

  return Settings;

});

/*=======================================================================
 * $Id: alerts.js 92617 2016-08-22 07:49:17Z daniel.eppensteiner $
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
    "model/persisted_collection",
    "service/stub",
    "utils/clone",
    "client/application",
    "api/v2/common",
    "underscore",
    "backbone"
  ], function (
    PersistedCollection,
    Stub,
    clone,
    Application,
    Common,
    _,
    Backbone
) {

  var EmailAlert = Backbone.Model.extend({

      defaults: {
        frequency: "weekly"
      },

      validate: function (atts, options) {
        if (!atts.frequency) return "No frequency";
        if (!atts.email) return "No email";
        if (!atts.query) return "No query";
        if (!atts.description) return "No description";
      },

      parse: function (atts) {
        var properties = Common.mapByPluck(atts.property, "key");

        return {
          id: atts.path.join("/"),
          path: atts.path,
          email: properties.email.value,
          query: JSON.parse(atts.data),
          description: properties.description.value
        };
      },

      toJSON: function() {
        var atts = this.attributes;

        return {
          path: ["emailalert", atts.frequency],
          data: JSON.stringify(atts.query),
          property: [{
              key: "email",
              value: atts.email
            },{
              key: "description",
              value: atts.description
          }]
        };
      }
  });

  var EmailAlertCollection = PersistedCollection.extend({
      model: EmailAlert,
      usePaths: true,

      initialize: function (unused, options) {
        options = options || {};
        options.serviceStub = options.serviceStub || new Stub({path: "persistedresources"});
        PersistedCollection.prototype.initialize.apply(this, arguments);
      },

      parse: function(response) {
        return response.persisted_resources;
      },

      get: function (key) {
        if (key === "length") {
          if (this.models.length) return this.models.length;
          return null;
        }
        return PersistedCollection.prototype.get.apply(this, arguments);
      }

  });

  // Actions
  var originalInitializeModels = Application.prototype.initializeModels;
  _.extend(Application.prototype, {

      initializeModels: function () {
        originalInitializeModels.apply(this, arguments);
        this.models.emailAlerts = new EmailAlertCollection(null, {
            channels: this.models.defaultChannels,
            appid: this.appid
        });
        this.models.emailAlerts.fetch({ path: ["emailalert","weekly"] }); // todo: move to template
      },

      subscribeForEmailAlert: function (options) {
        var subscription = new EmailAlert({
            email: "michael.biebl@mindbreeze.com", // todo: change
            description: this.getUnparsedUserQuery(),
            query: clone(this.models.search.input) // todo: cleanup
        });
        this.models.emailAlerts.add(subscription);
      }

  });

  return {
    Model: EmailAlert,
    Collection: EmailAlertCollection
  }

});

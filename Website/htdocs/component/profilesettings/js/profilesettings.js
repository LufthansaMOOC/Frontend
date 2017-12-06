/*========================================================================
* $Id: savedsearches.js 91712 2016-07-06 15:14:22Z daniel.eppensteiner $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2014
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/

define([
  "client/template",
  "i18n/i18n",
  "component!base",
  "component!settings",
  "client/views/list",
  "api/v2/search",
  "utils/browser",
  "utils/clone",
  "utils/dom",
  "utils/url",
  "utils/mustache",
  "utils/jsonpath",
  "model/persisted_collection",
  "service/stub",
  "client/application",
  "client/settings",
  "api/v2/common",
  "utils/localStorage",
  "backbone",
  "underscore",
  "jquery",
  "api/v2/persisted",
  "service/channel",
  "service/channels",
  "api/v2/resources",
  "client/resourceinfo",
  "model/persisted_collection_application_extensions"
], function (
  Template,
  i18n,
  Base,
  Settings,
  ListView,
  Search,
  Browser,
  clone,
  dom,
  url,
  Mustache,
  JSONPath,
  PersistedCollection,
  Stub,
  Application,
  Settings,
  Common,
  localStorage,
  Backbone,
  _,
  $,
  Persisted,
  Channel,
  Channels,
  Resources,
  ResourceInfo
) {

  var ProfileSettings = Template.extend({

    initialize: function() {
      var enableProfile = $(this.el).attr("data-enable-profile") == "true";
      if (enableProfile) {
        this.initializationPromise = new Channel.DeferredCallFinished();
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        var appID = this.application.appid || window.location.origin + window.location.pathname;

        getOrCreateProfileSettingsModel(this.application,
                                       {
                                          path: ["userprofile"],
                                          property: [{
                                            "key": "context",
                                            "value": appID
                                          }]
                                       }, this);
      } else {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
      }
    }

  });

  var ProfileSettingsModel = Backbone.Model.extend({

    parse: function (atts) {
      var properties = Common.mapByPluck(atts && atts.property, "key");
      if (!atts) return this.attributes;
      var dataJSON = atts.data;
      try { dataJSON = JSON.parse(atts.data) } catch (e) {}
      if (atts && properties) {
        return {
          id: atts.path.join("/"),
          path: atts.path,
          data: dataJSON,
          context: atts.property
        };
      }
    },

    toJSON: function() {
      var atts = this.attributes;
      return {
        path: atts.path,
        data: JSON.stringify(atts.data),
        property: atts.context
      };
    }

  });

  var ProfileSettingsCollection = PersistedCollection.extend({
    model: ProfileSettingsModel,
    usePaths: true,

    initialize: function (unused, options) {
      options = options || {};
      options.serviceStub = options.serviceStub || new Stub({path: "persistedresources"});
      PersistedCollection.prototype.initialize.apply(this, arguments);
      this.path = options.path;
      this.property = options.property;
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

  ProfileSettings.View = Base.extend({

    initialize: function () {

      this.options.application.saveProfile = this.options.application.saveProfile || function (options) {
        var preferencesModal = $('#preferences');
        var profilerSettingsEl = $('#profilesettings');

        var frontent_language = profilerSettingsEl.find(".frontent_language").val();
        var results_per_page = profilerSettingsEl.find(".results_per_page").val();

        preferencesModal.modal("hide");

        var profile_data = {
          "frontent_language": frontent_language,
          "results_per_page": results_per_page
        };

        this.reloadAfterSave = true;
        var model = null;

        var appID = this.appid || window.location.origin + window.location.pathname;

        if (this.models.profileSettings && this.models.profileSettings.size() > 0) {
          model = this.models.profileSettings.at(0);
          var data = model.get("data");
          data.settings = profile_data;
          model.save(null, {
            success: _.bind(function (model, response) {
              //Execute Settings
              this.models.search.set("count", parseInt(results_per_page), {silent: true});
              this.setLocale(frontent_language, _.bind(function () {
                i18n.patchI18nAttributes();
              }, this), {silent:true} );

              }, this),
            error: function (model, response) {}
          });
        }
        else {
          var data = {};
          data.settings = profile_data;
          model = new ProfileSettingsModel({
            data: data,
            context: [{
              "key": "context",
              "value": appID
            }],
            path: ["userprofile", "default"],
            appID: appID
          });
          this.models.profileSettings.add(model);
          this.models.search.set("count", parseInt(results_per_page), {silent: true});
          this.setLocale(frontent_language, _.bind(function () {
            i18n.patchI18nAttributes();
          }, this), {silent:true} );
        }
      };
    }

  });

  function getOrCreateProfileSettingsModel(application, options, that) {

    function triggerDone(template) {
      template.initializationPromise.triggerDone();
    };

    if (!application.models.profileSettings) {
      application.models.profileSettings = new ProfileSettingsCollection(null, {
          channels: application.models.defaultChannels,
          appid: application.appid,
          path: options.path,
          property: options.property
      });

      function fetchData(application, usersourceinfo) {

        var serviceFound = false;
        var pathFound = false;

        _.find(usersourceinfo.get("sources").sources, _.bind(function(source) {
          _.find(source.services, _.bind(function(service) {
            if (service.id == "persistedcollectionschema") {
              serviceFound = true;
              _.find(service.options, _.bind(function (options) {
                if (options.path == "userprofile") {
                  pathFound = true;
                  if (options.effective_available) {

                    application.models.profileSettings.fetch({
                      success: _.bind(function(response) {

                        if (this.application.options.profileFetched) {return}
                        this.application.options.profileFetched = true;

                        Settings.add({
                          name: "GeneralSettings",
                          module: "client/settingsprofilesettings"
                        },{ at: 0 });

                        if (response.models.length) {
                          var model = response.at(0);
                          var data = model.get("data");
                          if (_.isString(data)) {
                            data = JSON.parse(data);
                          }

                          var results_per_page = data.settings.results_per_page,
                              frontent_language = data.settings.frontent_language

                          if (results_per_page) {
                            this.application.models.search.set("count", parseInt(results_per_page), {silent: true});
                          }

                          if (frontent_language) {
                            var languageParameter = Browser.getURLParameter("language");
                            if (!languageParameter) {
                              this.application.setLocale(frontent_language, _.bind(function () {
                                i18n.patchI18nAttributes();
                                triggerDone(this);
                              }, this), {silent:true} );
                            }
                            triggerDone(this)
                          }

                        } else {
                          triggerDone(this);
                        }

                      }, that),
                      error: _.bind(function(response) {
                        triggerDone(this);
                      }, that)
                    });
                  } else {
                    triggerDone(that);
                  }
                }
              }, application))
              if (!pathFound) triggerDone(that);
            }
          }, application));
          if (!serviceFound) triggerDone(that);
        }, application));
      }

      var sources = application.models.userSourceInfo.get("sources") && application.models.userSourceInfo.get("sources").sources;
      if (sources) {
        _.each(sources, _.bind(function(source) {
          setTimeout(_.bind(function() {
            fetchData(this, this.models.userSourceInfo);
          }, this), 100);
        }, application))
      }

      application.models.userSourceInfo.on("change", _.bind(function(usersourceinfo){
        var sources = usersourceinfo.get("sources") && usersourceinfo.get("sources").sources;
        if (sources) {
          _.each(sources, _.bind(function(source) {
            fetchData(this, usersourceinfo);
          }, application))
        }
      }, application));

    } else {
      triggerDone(that);
    }

    return application.models.profileSettings;
  }

  return ProfileSettings;
});

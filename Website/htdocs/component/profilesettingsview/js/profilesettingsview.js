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

  });

  ProfileSettings.View = Base.extend({

    defaultOptions: {
      titleTagName: "h2"
    },

    initialize: function () {
      var that = this,
          title_icon = "",
          title = "";

      this.options = _.extend({
      }, this.defaultOptions, this.options);

      if (this.options.application.models.profileSettings.models.length) {
        this.updateHTML(this.options.application.models.profileSettings)
      } else {
        this.updateHTML()
      }
    },

    updateHTML: function(response) {
      if (response) {
        var model = response.at(0);
        var data = model.get("data");
        if (_.isString(data)) {
          data = JSON.parse(data);
        }

        var results_per_page = data.settings.results_per_page,
            frontent_language = data.settings.frontent_language;

        this.renderOptions(results_per_page, frontent_language);
      } else {
        this.renderOptions();
      }
    },

    renderOptions: function(results_per_page, frontent_language) {
      var resultOptions = ["1","3","5","6","7","8","9","10","15","20"];
      var options_result_per_page = "";

      if (!results_per_page) {
        var original_count = this.options.application.models.search.input.get("count");
        if (original_count) results_per_page = original_count;
      }


      _.each(resultOptions, function(val) {
        if (val == results_per_page) {
          options_result_per_page += '<option selected="selected">' + val + '</option>';
        } else {
          options_result_per_page += '<option>' + val + '</option>';
        }
      });

      var frontendOptions = ["bg-BG","cs-CZ","de","en-US","es-ES","fr-FR","hr-HR","hu-HU","it-IT","pt-PT","ro-RO","sk-SK","sl-SI","sr-Latn-CS","ru-RU","tr-TR","zh-Hans-CN","nl-NL","nb-NO","ja-JP","id-ID","pl-PL"];
      var options_frontend_language = "";

      if (!frontent_language) {
        var lang = typeof document !== "undefined" && document.documentElement.lang;
        if (!lang) lang = "en-US";
        frontent_language = lang;
      }

      _.each(frontendOptions, function(val) {
        if (val == frontent_language) {
          options_frontend_language += '<option selected="selected">' + val + '</option>';
        } else {
          options_frontend_language += '<option>' + val + '</option>';
        }
      });

      var profilerSettingsModal = this.innerHTML();
      profilerSettingsModal = profilerSettingsModal.replace("{{results_per_page}}", options_result_per_page);
      profilerSettingsModal = profilerSettingsModal.replace("{{frontent_language}}", options_frontend_language);

      this.el.innerHTML = profilerSettingsModal

      setTimeout(function() {
        i18n.patchI18nAttributes('#profilesettings');
      }, 0);
    },

    innerHTML: function() {
      var html = '<div id="profilesettings"> \
              <form> \
                <fieldset> \
                  <label for="frontent_language" data-i18n="FrontendLanguage"></label> \
                  <select class="frontent_language"> \
                    {{frontent_language}} \
                  </select> \
                  <br /> \
                  <label for="results" data-i18n="ResultsPerPage"></label> \
                  <select class="results_per_page"> \
                    {{results_per_page}} \
                  </select> \
                </fieldset> \
              </form> \
            <div> \
              <button type="button" class="btn" data-dismiss="modal" data-i18n="Close"></button> \
              <button type="button" class="btn btn-save-profile" data-action-object="{&quot;saveProfile&quot;: {}}" data-i18n="Save"></button> \
            </div> \
          </div>';
      return html;
    }

  });

  return ProfileSettings;
});

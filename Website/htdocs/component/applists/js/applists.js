/*========================================================================
* $Id: applists.js 86891 2015-10-13 05:52:22Z michael.biebl $
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
    "utils/string",
    "client/template",
    "client/views/list",
    "component!base",
    "component!channels",
    "underscore",
    "jquery"
  ], function (
    i18n,
    StringUtils,
    Template,
    ListView,
    Base,
    ChannelsTemplate,
    _,
    $
) {

  var AddView = Base.extend({

    events: {
      "submit": "add"
    },

    showError: function (string) {
      this.clearError();
      this.insertAt(this.make(
          "div",
          {
            "class": "alert alert-error"
          }, 
          '<button type="button" class="close" data-dismiss="alert">&times;<span class="mb-acc">' + i18n("Close") + '</span></button>' +
          i18n(string)
      ), 0);
    },

    clearError: function () {
      this.$el.find(".alert").remove();
    },

    isUrl: function (string) {
      return /^((?:f|ht)tp(?:s)?\:\/\/[^\/]+)/i.test(string);
    },

    add: function (e) {
      e.preventDefault();
      this.clearError();

      var form = e.target;
      var value = StringUtils.escape(form.url.value);

      if (value !== form.url.value || !this.isUrl(value)) {
        this.showError("please_enter_a_valid_url");
        return;
      }

      if (!/\/$/.test(value)) {
        value += "/";
      }

      if (!/\/api\/v2\/$/.test(value)) {
        value = value + "api/v2/";
      }

      this.model.add(value);

      form.url.value = "";
    },

    render: function () {
      this.el.innerHTML = '<form><input placeholder="' + i18n("web_client_url") + '" name="url"> <button class="btn"><i class="icon-plus"></i> <span class="mb-acc">' + i18n("custom_datasources_add") + '</span></button></form>';
      return this;
    }

  });

  var ChannelsView = ChannelsTemplate.View;

  var ApplistView = Base.extend({

    render: function () {
      var title = this.model.get("title");

      if (title) {
        if (!this.titleEl) {
          this.titleEl = this.make("h3");
          this.appendChild(this.titleEl, true);
        }
        this.titleEl.innerHTML = title;
      } else {
        this.removeOwnedNode(this.titleEl);
      }

      if (!this.channels && this.model.get("channels")) {
        this.channels = new ChannelsView({
          model: this.model.get("channels"),
          application: this.options.application
        }).render();
        this.appendChild(this.channels.el);
      }

      if (!this.addView && this.model.get("isCustomDataSources")) {
        this.addView = new AddView({
          model: this.model.get("channels")
        }).render();

        this.appendChild(this.addView.el);
      }

      return this;
    },

    remove: function () {
      if (this.channels) this.channels.remove();
      if (this.addView) this.addView.remove();
      Base.prototype.remove.apply(this, arguments);
    }

  });

  var ApplistsTemplate = Template.extend({

    model: function () {
      return this.application.models.applists;
    }

  });

  ApplistsTemplate.View = ListView.extend({

    initialize: function () {
      this.options.childViewConstructor = ApplistView;
      this.options.entryTagName = "div";
      this.options.entryClassName = "";

      ListView.prototype.initialize.apply(this, arguments);
    }

  });

  return ApplistsTemplate;

});

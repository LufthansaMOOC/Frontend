/*========================================================================
* $Id: settings.js 98659 2017-06-06 06:42:17Z daniel.eppensteiner $
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
    "client/template",
    "component!base",
    "client/views/list",
    "client/settings",
    "client/templatetree",
    "client/extensions",
    "utils/string",
    "i18n/i18n",
    "underscore"
  ], function (
    Template,
    Base,
    ListView,
    Settings,
    TemplateTree,
    Extensions,
    StringUtils,
    i18n,
    _
) {

  var SettingsTemplate = Template.extend({

    model: function () {
      return Settings;
    }

  }),
  SelectableListView = ListView.extend({

    isSelected: function (model) {
      if (!this._selected && this.model.length) {
        this.select(this.model.at(0));
      }
      return this._selected === model;
    },

    select: function (model) {
      this._selected = model;
    },

    createEntryView: function (options) {
      options.selectState = this;
      return ListView.prototype.createEntryView.apply(this, arguments);
    }
  }),
  TabView = SelectableListView.extend({
    tagName: "div",
    className: "btn-group btn-group-justified mb-role",

    defaultOptions: _.extend({}, SelectableListView.prototype.defaultOptions, {
      role: "tablist",
      entryTagName: "div",
      entryClassName: "btn-group",
      entryRole: "presentation"
    }),

    setModel: function () {
      SelectableListView.prototype.setModel.apply(this, arguments);
      if (this.model) {
        this.listenTo(this.model, "all", this.updateDisplay);
      }
      this.updateDisplay();
    },

    updateDisplay: function (type) {
      if (this.model && this.model.length > 1) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
    }
  }),
  SettingView = SelectableListView.extend({
    className: "",

    initialize: function () {
      SelectableListView.prototype.initialize.apply(this, arguments);
      this.updateChildRole();
    },

    setModel: function () {
      SelectableListView.prototype.setModel.apply(this, arguments);
      if (this.model) {
        this.listenTo(this.model, "all", this.updateChildRole);
        this.updateChildRole();
      }
    },

    updateChildRole: function (type) {
      if (this.model.length > 1) {
        this.$el.children().attr("role", "tabpanel");
      } else {
        this.$el.children().removeAttr("role");
      }
    }
  });

  TabView.EntryView = Base.extend({

    events: _.extend({}, Base.prototype.events, {
      "tabactivate": "selected",
      "tabdeactivate": "deselected"
    }),

    deselected: function () {
      var that = this;
      _.defer(function() {
        that.updateActive();
      });
    },

    selected: function () {
      this.options.selectState.select(this.model);
      this.updateActive();
    },

    updateActive: function () {
      var selected = this.options.selectState.isSelected(this.model);
      if (selected) {
        this.$el.find("button").addClass("active");
      } else {
        this.$el.find("button").removeClass("active");
      }
    },

    render: function () {
      var selected = this.options.selectState.isSelected(this.model);
      var titlei18n = StringUtils.escape(StringUtils.stripHtml(this.model.get("name")))
      this.el.innerHTML = '<button class="btn' + (selected ? " active" : "") + '" role="tab" aria-selected="' + selected + '" aria-controls="settings_tabpanel_' + this.model.cid + '" data-i18n="'+titlei18n+'">' + i18n(StringUtils.escape(StringUtils.stripHtml(this.model.get("name")))) + '</button>';
      return this;
    }

  });

  SettingView.EntryView = Base.extend({

    render: function () {
      var that = this,
          model = this.model,
          moduleName = model.get("module"),
          options = model.get("options"),
          selected = this.options.selectState.isSelected(model);

      this.el.id = "settings_tabpanel_" + this.model.cid;
      if (!selected) {
        this.el.setAttribute("aria-hidden", "true");
        this.$el.hide();
      } else {
        this.el.removeAttribute("aria-hidden");
        this.$el.show();
      }

      Mindbreeze.require([moduleName], function (View) {
        var view = new View(_.extend(
              {
                application: that.options.application,
                model: model
              },
              options
            ));

        that.appendChild(view.render().el, true);
      });

      return this;
    }

  });

  SettingsTemplate.View = Base.extend({

    setModel: function () {
      if (this.settings) this.settings.remove();
      if (this.tabs) this.tabs.remove();

      Base.prototype.setModel.apply(this, arguments);

      if (this.model) {
        this.tabs = new TabView({
          model: this.model,
          application: this.options.application
        });
        this.appendChild(this.tabs.render().el, true);

        this.settings = new SettingView({
          model: this.model,
          application: this.options.application,
          tagName: "div",
          className: "",
          entryTagName: "div"
        });

        this.appendChild(this.settings.render().el, true);
      }
    },

    remove: function () {
      if (this.settings && this.settings.remove) {
        this.settings.remove();
      }
      Base.prototype.remove.apply(this, arguments);
    }

  });

  return SettingsTemplate;

});

/*========================================================================
 * $Id: include.js 98065 2017-05-11 15:06:51Z michael.biebl $
 *
 * Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2015
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
  "utils/mustache",
  "backbone",
  "underscore"
], function(
  Template,
  Base,
  MustacheTemplate,
  Backbone,
  _
) {

  var Include = Template.extend({

      model: function (options) {
        return options.application.models.templateinfo;
      },

      getOptions: function (options) {
        return _.extend(
          {},
          options,
          {
            parentModel: Template.prototype.model.call(this, options)
          }
        );
      },

      createSubView: function (childNode, options, model) {
        return;
      }

  });

  Include.View = Base.extend({

      initialize: function (options) {
        Base.prototype.initialize.apply(this, arguments);
        this.listenTo(this.model, "change", this.update);
        this.locationTemplate = new MustacheTemplate(options.location);
        this.update();
      },

      update: function () {
        var that = this,
            currentLocation = this.locationTemplate.render(this.model).replace(/resource:\/\//i, "");

        if (currentLocation !== this.location) {
          this.disable(function () {
            that.location = currentLocation;
            that.enable();
          });
        }
      },

      enable: function () {
        var that = this;
        this.options.application.api.resources.get(this.location, function (string_content, errors) {
            that.$el.html(string_content);
            that.options.template.node.collect();
            that.options.template.node.initializeChildren(that.options.application, that.options.parentModel, function () {
                // TODO: add events to templatetree
                that.model.trigger("templateupdate");
            });
        }, this.options.application.models.defaultChannels);
      },

      disable: function (callback) {
        var that = this;

        this.options.template.node.destroyChildren(function () {
          that.$el.html("");
          if (callback) {
            callback.apply(this, arguments);
          }
        });
      },

      remove: function () {
        this.disable();
        Base.prototype.remove.apply();
      }

  });

  return Include;
});

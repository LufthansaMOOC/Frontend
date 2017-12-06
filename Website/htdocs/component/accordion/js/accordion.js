/*========================================================================
* $Id: accordion.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "underscore",
    "jquery"
  ], function(
    Template,
    Base,
    _,
    $
  ) {

  var AccordionTemplate = Template.extend({

    schema: new Template.Schema({
      attributes: {

        enabled: {
          type: "boolean",
          title: "editor_facet_collapsible_label",
          "default": false
        },

        "default-open": {
          type: "boolean",
          title: "editor_facet_default_open_label",
          "default": false
        }
      }
    }),

    createView: function (options) {
      options = _.extend({}, options, this.schema.parseAttributes(this.attributeModel.get()), this.schema.parseAttributes(this.attributeModel.getCamelCase()));
      options.defaultOpen = this.get("default-open");
      return Template.prototype.createView.apply(this, [options].concat(Array.prototype.slice.call(arguments, 1)));
    },

    createSubView: function (childNode, options, model) {
      var view = childNode.template.createView({
        application: options.application,
        collapsible: options.enabled,
        defaultOpen: options.defaultOpen, // TODO: not only default open but saved open
        accordion: options.enabled ? this.instances.instances[0] : null,
        model: model,
        node: childNode
      });

      if (view && childNode.template
        && view.el !== childNode.template.el
        && view.el !== childNode.template.el.parentNode) {
        $(childNode.template.el).after(view.el);
      }
    }

  });

  AccordionTemplate.View = Base.extend({
    events: {},

    initialize: function () {
      Base.prototype.initialize.apply(this, arguments);

      if (this.options.enabled) {
        this.el.setAttribute("role", "tablist");
        this.el.setAttribute("tabindex", "0");
        this.el.setAttribute("aria-multiselectable", "true");
        this.$el.addClass("mb-role");
      }
    },

    isOpen: function (openId, defaultOpen) {
      var open =  typeof defaultOpen === "undefined" ? this.options.defaultOpen : defaultOpen,
          setting = this.options.application.models.tabs.setting(openId);

      if (typeof setting !== "undefined") {
        open = setting === true;
      }
      return !!open;
    },

    setEditable: function () { }

  });

  return AccordionTemplate;

});

/*========================================================================
* $Id: alert.js 75794 2013-10-10 17:21:37Z michael.biebl $
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
    "underscore",
    "client/template",
    "client/views/list",
    "text!../mustache/template.mustache"
  ], function (
    _,
    Template,
    ListView,
    DEFAULT_TEMPLATE
  ) {

  var AlertTemplate = Template.extend({
    hasContent: function () { return true; },

    model: function (options) {
      return options.application.models.channels.alerts;
    },

    createView: function(options)  {
      var view = new this.constructor.View(_.extend(this.attributeModel.getCamelCase(),
          options, {
            el: this.el,
            model: this.model(options),
            elementTemplate: options.node && options.node.children && options.node.children[0] && options.node.children[0].template
      }));
      this.instances.push(view);
      return view;
    }

  });

  AlertTemplate.View = ListView.extend({

    defaultOptions: {
      entryTagName: "div",
      entryClassName: ""
    },

    createEntryView: function (options) {
      options = _.clone(options);
      options.elementTemplate = this.options.elementTemplate;

      return ListView.prototype.createEntryView.apply(this, [options]);
    }

  });

  AlertTemplate.View.EntryView = ListView.EntryView.extend({

      createChildView: function (options) {
        return options.elementTemplate.createView(options);
      }
  });

  AlertTemplate.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

  return AlertTemplate;
});

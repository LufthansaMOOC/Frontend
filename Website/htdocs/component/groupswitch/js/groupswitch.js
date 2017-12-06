/*========================================================================
* $Id: sortswitch.js 80698 2014-08-19 08:48:14Z michael.biebl $
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
    "text!../mustache/template.mustache",
    "underscore"
  ], function (
    Template,
    Base,
    DEFAULT_TEMPLATE,
    _
  ) {

  var DEFAULT_ORDERBY = "mes:relevance";

  var SortModel = function (original) {
    this.original = original;

    var that = this,
        prototypes = [],
        parent = this.original.constructor.__super__;

    while (parent) {
      prototypes.push(parent);
      parent = parent.__super__;
    }
    prototypes.reverse();

    prototypes.push(this.original.constructor.prototype);

    _.forEach(prototypes, function (prototype) {
      _.forEach(prototype, function (f, name) {
        if (!SortModel.prototype[name]) {
          that[name] = function () {
            f.apply(this.original, arguments);
          }
        }
      });
    });
  };

  _.extend(SortModel.prototype, {

    get: function (attribute) {
      if (attribute === "isSelected") {
        var orderby = this.getInput().get("groupby.property");
        return orderby === this.get("name");
      }
      return this.original.get.apply(this.original, arguments);
    },

    submodel: function () {
      return new SortModel(this.original.submodel.apply(this.original, arguments));
    },

    getInput: function () {
      return this.original.input.treeModel ? this.original.input.treeModel : this.original.input;
    }

  });

  var SortSwitch = Template.extend({

    hasContent: function () { return true; },

    createSubView: function (node, options, model) {
      model = new SortModel(model);

      return Template.prototype.createSubView.apply(this, [node, options, model]);
    }
  });

  SortSwitch.View = Base.extend({
  });

  SortSwitch.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

  return SortSwitch;
});

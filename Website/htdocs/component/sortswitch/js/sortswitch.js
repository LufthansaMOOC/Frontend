/*========================================================================
* $Id: sortswitch.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "utils/string",
    "client/template",
    "component!base",
    "text!../mustache/template.mustache",
    "underscore"
  ], function (
    StringUtils,
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
        var orderby = this.getInput().get("orderby");
        if (!orderby) orderby = DEFAULT_ORDERBY;
        return orderby === this.get("name");
      }
      if (attribute && attribute.length > 1 && attribute[1] === "order_direction") {
        return this.original.get.apply(this.original, arguments) || "DESCENDING";
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

      var renderView = Template.prototype.createSubView.apply(this, [node, options, model]),
          subView = Template.prototype.createSubView.apply(this, [node, options, model]),
          originalRender = subView.render;

      renderView.el.parentNode.removeChild(renderView.el);

      subView.render = function () {
        var renderedHTML = renderView.el.innerHTML;
        if (renderedHTML !== this.el.innerHTML) {
          this.el.innerHTML = renderedHTML;
        }

        this.$el.find("[data-bind]").each(function () {
          var key = this.getAttribute("data-bind"),
              value = model.get(key.split("."));

          if (/input/i.test(this.tagName)) {
            if (/checkbox|radio/i.test(this.type)) {
              this.checked = this.value === value;
            } else {
              this.value = value;
            }
          }
        });

        return this;
      }
      return subView;
    }
  });

  SortSwitch.View = Base.extend({
  });

  SortSwitch.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

  return SortSwitch;
});

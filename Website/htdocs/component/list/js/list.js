/*========================================================================
* $Id: list.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "api/v2/search",
    "client/template",
    "component!base",
    "jquery",
    "underscore"
  ], function(
    Search,
    Template,
    ComponentBase,
    $,
    _
  ) {

  var ListTemplate = Template.extend({

    initialize: function () {
      Template.prototype.initialize.apply(this, _.toArray(arguments));
      this.$el = $(this.el);
    },

    schema: new Template.Schema({
      inputAttributes: {
      }
    }),

    hasContent: function() { return true; },

    getContentSchema: function() {
      return  {
        type: "template",
        repeated: true
      };
    },

    getContent: function() { return _.map(this.children, function(node) { return node.template;}); },

    setContent: function(v, options) {
      if (options.at) {
        this.children[options.at].template = v;
      }
      else if (_.isArray(v) && v.length == this.children.length) {
        for (var i = 0; i < v.lenght; i++) {
          this.children[i].template = v;
        }
      }
    },

    createView: function(options)  {
      var view = new this.constructor.View(_.extend({}, options, {
            model: this.model(options),
            application: options.application,
            template: this,
            el: this.el,
            elementTemplate: this.children[0].template
      }));
      this.instances.push(view);
      return view;
    },

    remove: function (options) {
      _.forEach(this.instances, function (view) {
          view.remove();
      });
      this.instances = [];
      _.forEach(options.node.children, function (childNode) {
          childNode.template.remove({
              node: childNode
          });
      });
    }
});

  var ListView = ComponentBase.extend({

    initialize: function() {
      ComponentBase.prototype.initialize.apply(this, arguments);

      this.collection = this.options.model;
      this.collection.on("change",this.rebuildAll,this);
      this.collection.on("add",this.rebuildAll,this);
      this.views = [];
      this.rebuildAll();
    },

    addView: function(view) {
      this.views.push(view);
    },

    removeViews: function() {
      _.each(this.views,
          function(view) {
            view.remove();
          }
      );
    },

    remove: function(model) {
      if (model && model !== this.model) return; // don't delete for other models

      this.removeViews();
      ComponentBase.prototype.remove.apply(this, arguments);
      this.collection.off("change");
      this.collection.dispose && this.collection.dispose();
      // this.dispose();
      return this;
    },

    getModels: function () {
      return this.collection && (this.collection.get() || this.collection.models);
    },

    rebuildAll: function(dontuse, collection, options) {
      var that = this,
          elts = this.getModels();

      options = options || {};

      this.removeViews(); _.each(elts, function (elt, i) {
        var position = i;
        var model = that.collection.submodel ? that.collection.submodel("[" + JSON.stringify(i) + "]") : that.collection.at(i);
        var view = that.createChildView(model, position);

        if (view) {
          that.addView(view);
          var viewEl = view.render().el;
          that.insertAt(viewEl, position);
        }
      });
    },

    createChildView: function (model, position) {
      return this.options.elementTemplate ? this.options.elementTemplate.createView({model: model, position: position, application: this.options.application}) : new this.childView({model: model, position: position, parent: this, application: this.options.application});
    }
  });

  // TODO: how to export ListView alone?
  ListTemplate.View = ListView;

  return ListTemplate;
});

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


/**
* A View for displaying lists.
*/
define([
    "component!base",
    "client/views/label",
    "underscore"
  ], function(
    Base,
    LabelView,
    _
  ) {

  var Children = function () {
    this.instances = [];
  }

  Children.prototype = {

    push: function (view) {
      if (!view) return;

      var that = this,
          originalRemove = view.remove;

      view.remove = function () {
        that.instances = _.without(that.instances, this);
        originalRemove.apply(this, arguments);
        view.remove = originalRemove;
      };

      this.instances.push(view);
    },

    remove: function (view) {
      if (view) {
        this.instances = _.without(this.instances, view);
      } else {
        _.forEach(this.instances, function(view) {
          view.remove();
        });
        this.instances = [];
      }
    }

  }

  var ListView = Base.extend({

    tagName: "ul",
    className: "nav nav-stacked nav-pills",

    defaultOptions: {
      entryTagName: "li"
    },

    initialize: function () {
      Base.prototype.initialize.apply(this, arguments);

      this.children = new Children();

      var that = this;

      _.each(this.model && this.model.models, function (child) {
        that.addOne(child, that.model);
      });
    },

    setModel: function () {
      Base.prototype.setModel.apply(this, arguments);

      if (this.model) this.listenTo(this.model, "add", this.addOne);
    },

    setEditable: function () {
    },

    createEntryView: function (options) {
      return new this.constructor.EntryView(_.extend({
            application: this.options.application,
            tagName: this.options.entryTagName,
            className: this.options.entryClassName,
            role: this.options.entryRole,
            childViewConstructor: this.options.childViewConstructor || LabelView,
            referenceList: this.children
          },
          options
      )).render();
    },

    addOne: function (model, collection, options) {
      options = options || {}

      var at = typeof options.at === "undefined" ? collection && _.indexOf(collection.models, model) : options.at;
      var view = this.createEntryView({
        model: model
      });

      this.children.push(view);

      this.insertAt(view.el, at);
    },

    remove: function(model) {
      if (model && model !== this.model) return; // don't delete for other models
      this.children.remove();
      Base.prototype.remove.apply(this, arguments);
    }

  });

  ListView.EntryView = Base.extend({
    tagName: "li",

    initialize: function () {
      var options = _.clone(this.options);
      delete options.tagName;
      delete options.className;

      this.childView = this.createChildView(options);
      if (this.childView) this.childView.render();
      Base.prototype.initialize.apply(this, arguments);
      if (this.childView && this.childView.el) {
        this.insertAt(this.childView.el, 0);
      }
    },

    setEditable: function () {
    },

    createChildView: function (options) {
      return new this.options.childViewConstructor(options);
    },

    setModel: function () {
      Base.prototype.setModel.apply(this, arguments);
      if (this.childView) {
        this.childView.setModel(this.model);
      }
    },

    remove: function (model) {
      if (model && model !== this.model) return; // don't delete for other models

      if (this.options.referenceList) this.options.referenceList.remove(this);

      if (this.childView) {
        this.childView.remove();
        delete this.childView;
      }
      Base.prototype.remove.apply(this, arguments);
    }
  });

  return ListView;
});

/*========================================================================
* $Id: constraints.js 98896 2017-06-12 13:14:58Z daniel.eppensteiner $
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
    "api/v2/search",
    "client/template",
    "component!mustache",
    "component!filteredfacet",
    "client/templateregistry",
    "underscore",
    "backbone"
  ], function(
    i18n,
    Search,
    Template,
    MustacheTemplate,
    FilteredFacet,
    TemplateRegistry,
    _,
    Backbone
  ) {

    var _toDisable = [];
    var _disableDeferred = function () {
      var i, entry;

      for (i=_toDisable.length - 1; i >= 0; i--) {
        entry = _toDisable[i];
        entry.target.toggleFacetValue(false, entry.model, { silent: i > 0 });
      }

      _toDisable = [];
    };


    var SearchInTemplate = Template.extend({
      editableName: "editor_searchin_title",

      schema: new Template.Schema({
          attributes: {
            displayed: {
              type: "int",
              title: "editor_facet_displayed_label"
            },
            collapsible: {
              type: "boolean",
              title: "editor_facet_collapsible_label",
              "default": false
            },
            "default-open": {
              type: "boolean",
              title: "editor_facet_default_open_label",
              "default": false
            },
            "show-checkbox": {
              type: "boolean",
              title: "editor_facet_show_checkbox_label",
              "default": true,
              "defaultValue": true,
              visible: false
            },
            "show-all": {
              type: "boolean",
              title: "editor_facet_show_all_label",
              "default": true,
              "defaultValue": true,
              visible: false
            }
          }
      }),

      getDefaultTemplate: function () {
        return FilteredFacet.DEFAULT_TEMPLATE;
      },

      hasContent: function () {
        return true;
      },

      createView: function(options)  {
        var model = this.model(options),
            view;
        view = new this.constructor.View(_.extend(this.attributeModel.getCamelCase(), options, {
          model: model,
          facetName: this.get("template"),
          application: options.application,
          collapsible: this.get("collapsible", options.collapsible),
          defaultOpen: this.get("default-open", options.defaultOpen),
          displayed: this.get("displayed", options.displayed),
          el: this.el,
          elementTemplate: this.children && this.children[0] && this.children[0].template,
          showCheckbox: this.get("show-checkbox", options.showCheckbox),
          showAll: this.get("show-all", options.showAll)
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
      },

      name: function () {
        return null;
      }
  });

  var ConstraintValueView = FilteredFacet.ValueView.extend({
    getInput: function () {
      return this.options.application.models.search.input;
    }
  });

  var SearchInView = FilteredFacet.View.extend({

    initialize: function () {
      this.options.title = this.options.title || i18n("client_sidepane_refinements_label");
      this.options.suggest = false;
      FilteredFacet.View.prototype.initialize.apply(this, arguments);

      var that = this;
      this.listenTo(this.collection, "remove", this.entryRemoved);
    },

    entryRemoved: function (model) {
      var channelIds = _.pluck(this.options.application.models.channels.models, "id"),
          channelActive = _.intersection(channelIds, model.get("source_ids")).length > 0;

      if (!channelActive) {
        this.disableDeferred(model);
      }
    },

    disableDeferred: function (model) {
      _toDisable = _toDisable || [];
      _toDisable.push({
        model: model,
        target: this
      });
      _.defer(_disableDeferred);
    },

    setModel: function (model) {
      FilteredFacet.View.prototype.setModel.apply(this, arguments);
      if (this.model) {
        this.listenTo(this.model, "change", this.render);
      }
    },

    getConstraintsModelPath: function () {
      return "source_context.constraints";
    },

    getCollection: function () {
      var that = this,
          ConstraintCollection = Backbone.Collection.extend({

            initialize: function () {
              Backbone.Collection.prototype.initialize.apply(this, arguments);
              this.listenTo(that.model.treeModel || that.model, "change", this.update);
              this.update();
            },

            removeAll: function () {
              var i;

              for (i = this.models.length - 1; i>=0; i--) {
                this.remove(this.models[i]);
              }
            },

            update: function () {
              this.removeAll();
              if (that.model) {
                this.add(this.getModels());
              }
            },

            getModels: function () {
              return _.map(that.model.get(), function (value, id) {
                return _.extend({}, value, { id: id });
              });
            }

          });
      return new ConstraintCollection();
    },

    getInput: function () {
      return this.options.application.models.search.input;
    },

    getWiring: function () {
      return this.options.application.models.search.wiring;
    },

    createChildView: function (options) {
      return new ConstraintValueView(options);
    },

    remove: function () {
      FilteredFacet.View.prototype.remove.apply(this, arguments);
      return this;
    }
  });

  SearchInTemplate.View = SearchInView;

  return SearchInTemplate;
});

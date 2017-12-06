/*========================================================================
* $Id: constraints.js 81611 2014-10-21 08:07:52Z michael.biebl $
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
          application: options.application,
          el: this.el,
          elementTemplate: this.children && this.children[0] && this.children[0].template,
          emptyFilterName: "None"          
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
      this.filterID = "source";
      var that = this;
      this.listenTo(this.collection, "remove", this.entryRemoved);
      
      if (this.collection.delegate) 
        this.collection.delegate.update();
      else 
        this.collection.update();
    },
    
    entryRemoved: function (model) {
      this.disableDeferred(model);
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

    _setConstraint: function(filtered, filter_base, options) {
      var input = this.getInput();
      if (!input.get(this.getConstraintsModelPath())) {
        var basePath = "pattern_constraints[" + JSON.stringify(this.options.name) + "]";
        var dynamicConstraint = {
          exclude: this.options.exclude && this.options.exclude === 'true' || false,
          or: this.options.pattern,
          source: {} 
        };
        input.set(basePath, dynamicConstraint, {silent: true});
      }
      FilteredFacet.View.prototype._setConstraint.apply(this, arguments);
    },

    toggleFacetValue: function(checked, model, options) {
      options.silent = true;
      FilteredFacet.View.prototype.toggleFacetValue.apply(this, arguments);
      var input = this.getInput(),
          source = input.get(this.getConstraintsModelPath() + ".source.filter_base");
      if (!source || _.isEmpty(source)) {
        input.unset(this.getConstraintsModelPath());
      }
      else {
        input.change();
      }
    },

    getConstraintsModelPath: function () {
      return "pattern_constraints[" + JSON.stringify(this.options.name) + "]";
    },

    /*
    getConstraintsModel: function() {
      var constraintsModel = this.getInput().submodel(this.getConstraintsModelPath());
      
    },*/

    getCollection: function () {
      var that = this,
          ConstraintCollection = Backbone.Collection.extend({

            initialize: function () {
              Backbone.Collection.prototype.initialize.apply(this, arguments);
              this.listenTo(that.model.treeModel || that.model, "change", this.update)
              this.listenTo(that.options.application.models.tabs, "change", this.update);
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
              return _.map(that.model.models, function (model, id) {
                var atts = model.attributes;
                var query_expr = {};

                if (atts && atts.selectedTabName) {
                  var tabModel = that.options.application.models.tabs.getByName(atts.selectedTabName);
                  if (tabModel) {
                    var constraint =  tabModel.get("constraint");
                    if (constraint) {
                      query_expr['tab_constraint'] = constraint;
                    }
                  }
                }
                if (atts && atts.user && atts.user.query) {
                  query_expr['user_query'] = atts.user.query;
                }
                if (atts && atts.user && atts.user.constraint) {
                  query_expr['user_constraint'] = atts.user.constraint;
                }                
                if (_.isNumber(id)) {
                  id = id.toString();
                }
                return {
                  id: id,
                  html: atts.name,
                  name: atts.name,
                  query_expr: { id: id, and: query_expr }
                };
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

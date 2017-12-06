/*========================================================================
* $Id: filteredfacets.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "api/v2/common",
    "api/v2/search",
    "client/template",
    "component!base",
    "component!filteredfacet",
    "client/views/list",
    "utils/dom",
    "i18n/i18n",
    "jquery",
    "underscore",
    "backbone"
  ], function (
    Common,
    Search,
    Template,
    Base,
    FilteredFacet,
    ListView,
    dom,
    i18n,
    $,
    _,
    Backbone
  ) {

    var Facets = Backbone.Collection.extend({

        initialize: function (models, options) {
          this.options = options;
          Backbone.Collection.prototype.initialize.apply(this, arguments);

          if (this.options.properties && this.options.name !== null) {
            this.configuredCollection = new Search.FacetValueCollection(this.options.name, this.options.properties);
            this.options.searchModel.addFacet(this.configuredCollection, { silent: true });
          }
          this.facets = options.searchModel.submodel("facets");
          this.listenTo(this.facets, "change", this.update);
        },

        update: function () {
          var that = this;
          var ids = [];
          var facets = _.filter(this.facets.get(), function (facet) {
            return that.options.facetFilter(facet);
          });

          if (this.options.sortFacets) {
            this.options.sortFacets(facets);
          }

          _.each(facets, function (facet, at) {
            var id = facet.id;
            ids.push(id);
            var collection = that.get(id);
            if (!collection && that.options.properties) {
              collection = new Search.FacetValueCollection(id, that.options.properties);
              that.options.searchModel.addFacet(collection, { silent: true, addToFacets: false });
              collection.id = id;
              that.add(collection, {
                  at: at
              });
            }
          });

          var toRemove = _.difference(_.pluck(this.models, "id"), ids);
          toRemove = _.select(toRemove, function (id) {
            var field = that.options.formqueryadapter.field(id);
            return !field || !that.options.searchModel.input.get(["user", "query"].concat(field.path));
          });
          this.remove(toRemove);
        },

        _prepareModel: function(attrs, options) {
          if (!attrs.collection) attrs.collection = this;
          return attrs;
        }

    });

    var FacetTemplate = Template.extend({

        initialize: function () {
          Template.prototype.initialize.apply(this, _.toArray(arguments));
        },

        createView: function(options)  {
          var facetTemplate = options.node.firstChildOfType("filteredfacet");
          if (facetTemplate) {
            facetTemplate.remove();
          }

          var view = new this.constructor.View(_.extend(this.attributeModel.getCamelCase(),
              options, {
                application: options.application,
                el: this.el,
                suggest: this.get("suggest"),
                userInput: this.get("user-input"),
                userInputTemplate: this.get("user-input-template"),
                collapsible: this.get("collapsible", options.collapsible),
                defaultOpen: this.get("default-open", options.defaultOpen),
                displayed: this.get("displayed"),
                template: this,
                facetTemplate: facetTemplate,
                idOrder: this.get("id-order"),
                nameOrder: this.get("name-order")
          }));
          this.instances.push(view);
          return view;
        },

        schema: new Template.Schema({
            attributes: {
              suggest: {
                type: "boolean",
                title: "editor_facet_suggest_label",
                "default": true,
                visible: false
              },
              "user-input": {
                type: "string",
                title: "editor_facet_user_input_label",
                model_stored: false,
                defaultValue: "auto",
                values: [
                  { value: "auto", text: i18n("editor_facet_user_input_value_auto") },
                  { value: "", text: i18n("editor_facet_user_input_value_enabled") },
                  { value: "disabled", text: i18n("editor_facet_user_input_value_disabled") },
                ]
              },
              "user-input-template": {
                type: "SearchFormComponent",
                model_stored: false,
                title: "editor_facet_user_input_template_label",
                values: [
                  { value: null },
                  { value: "suggest", text: i18n("editor_facet_user_input_template_value_suggest") },
                  { value: "inputdate", text: i18n("editor_facet_user_input_template_value_inputdate") }
                ],
                depends: "/^\\s*$/.test(attributes['user-input'])"
              },
              displayed: {
                type: "int",
                title: "editor_facet_displayed_label",
                "default": Number.MAX_VALUE
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
              "id-order": {
                type: "list",
                title: "editor_facet_id_order_label",
                visible: false
              },
              "name-order": {
                type: "list",
                title: "editor_facet_name_order_label",
                visible: false
              }
            }
        }),

        hasContent: function() { return true; },
        getContentSchema: function() {
          return  {
            type: "template"
          };
        },

        getContent: function() { return this.children[0].template; },
        setContent: function(v, i) { this.children[0].template = v; },

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

    FacetTemplate.DEFAULT_TEMPLATE = '<div style="display: none" role="presentation"><div data-template="filteredfacet"></div></div>';

    FacetTemplate.View = ListView.extend({

        filteredFacetOptionRegex: /^(titleTagName|titleClassName|facetEntryTagName|facetEntryClassName|facetEntryRole|facetContainerTagName|facetContainerClassName|suggest|userInput.*|displayed|collapsible|defaultOpen|accordion|andAvailable)$/,

        defaultOptions: {
          entryTagName: "div",
          entryRole: "presentation"
        },

        initialize: function () {
          var that = this;
          if (!this.attributeModel) {
            this.attributeModel = new dom.AttributeModel(this.el, "data-");
          }
          var idPattern = this.attributeModel.get("id-pattern");
          var namePattern = this.attributeModel.get("name-pattern");
          var facetFilter = function(facet) { return facet.configured || false; };
          var name = this.attributeModel.get("name");

          if (idPattern) {
            idPattern = new RegExp(idPattern);
            facetFilter = function(facet) { 
              return facet !== null && facet.id && facet.id.match(idPattern);
            };
          } else if (namePattern) {
            namePattern = new RegExp(namePattern);
            facetFilter = function(facet) { 
              return facet !== null && facet.name && facet.name.match(namePattern);
            };
          }

          this.origModel = this.model;
          this.model = new Facets([], {
            formqueryadapter: this.options.application.formqueryadapter,
            facetFilter: facetFilter,
            sortFacets: this.getSortFacetsFunction(this.options),
            name: name,
            searchModel: this.origModel,
            properties: this.properties || this.options.facetTemplate && this.options.facetTemplate.firstChildOfType("mustache").template.properties
          });

          var options = this.options;
          var filteredFacetOptions = this.options.filteredFacetOptions || {};
          _.each(options, function (value, key) {
            if (that.filteredFacetOptionRegex.test(key)) {
              filteredFacetOptions[that.cleanFacetOptionName(key)] = options[key];
              delete options[key];
            }
          });
          this.options.filteredFacetOptions = filteredFacetOptions;
          ListView.prototype.initialize.apply(this, arguments);
        },

        getSortFacetsFunction: function (options) {
          var sortFunction,
              orderProperty,
              orderFunction,
              orderList,
              compareFunction;

          if (options.idOrder) {
            orderList = options.idOrder;
            orderProperty = "id";
          } else if (options.nameOrder) {
            orderList = options.nameOrder;
            orderProperty = "name";
          }

          if (orderProperty) {
            orderFunction = Common.getOrderFunctionByList(orderList, orderProperty);
            compareFunction = Common.getCompareFunction("ORDER", "ASCENDING");
            sortFunction = function (facets) {
              orderFunction(facets);
              return facets.sort(compareFunction);
            };
          }

          return sortFunction;
        },

        cleanFacetOptionName: function (name) {
          return name && name.replace(/^facet(.)/, function (match, start) { return start.toLowerCase(); });
        },

        createEntryView: function (options) {
          options = _.extend(
            {},
            options,
            this.options.filteredFacetOptions,
            {
              origModel: this.origModel,
              facetTemplate: this.options.facetTemplate
            }
          );
          return ListView.prototype.createEntryView.apply(this, arguments);
        }
    });

    FacetTemplate.View.EntryView = ListView.EntryView.extend({

      createChildView: function (options) {
        options = _.clone(options);
        delete options.childViewConstructor;
        var childView = options.facetTemplate.template.createView(_.extend(
            {},
            options,
            {
              el: $(options.facetTemplate.template.el).clone(),
              collection: options.model,
              model: options.origModel,
              facetName: options.model.id,
              node: options.facetTemplate.template
            }
        )).render();

        return childView;
      },

      setModel: function (model) {
        Base.prototype.setModel.apply(this, arguments);
      }
    });

    return FacetTemplate;

});

/*========================================================================
* $Id: results.js 72480 2013-05-02 16:02:46Z michael.biebl $
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

/*
* FacetsTemplate
* ==============
*
* A component to display facets.
*
*/

define([
    "i18n/i18n",
    "api/v2/search",
    "api/v2/common",
    "model/tree",
    "model/readonlytree",
    "model/computed",
    "model/filtered_collection",
    "client/template",
    "component!mustache",
    "utils/mustache",
    "utils/string",
    "component!base",
    "component!suggest",
    "component!searchform",
    "component!accordion",
    "client/views/tree",
    "client/views/list",
    "client/templateregistry",
    "utils/dom",
    "utils/keys",
    "utils/trace",
    "jquery",
    "client/application",
    "underscore",
    "backbone"
  ], function(
    i18n,
    Search,
    Common,
    TreeModel,
    ReadOnlyTreeModel,
    ComputedModel,
    FilteredCollection,
    Template,
    MustacheTemplate,
    MustacheAdapter,
    StringUtils,
    ComponentBase,
    SuggestTemplate,
    SearchForm,
    Accordion,
    TreeView,
    ListView,
    TemplateRegistry,
    dom,
    keys,
    Trace,
    $,
    Application,
    _,
    Backbone
  ) {

    var DEFAULT_TEMPLATE = 
      "<script type=\"text/x-mustache-template\" data-tag-name=\"span\"><span class=\"{{#showAddAnd?}}mb-add-and-available{{/showAddAnd?}} mb-tooltip\">{{{html}}}{{#showAddAnd?}} <a class=\"action mb-add-and\"><i class=\"icon-plus-sign\"></i></a>{{/showAddAnd?}}</span><span class=\"pull-right\" title=\"{{count}}\">{{#count?}}&nbsp;{{count}}{{/count?}}{{#excluded}}&ndash;{{/excluded}}</span></script>";

    var AUTO_USER_INPUT = {
      "Date": "inputdate",
      "String": "suggest"
    }
    var AUTO_USER_INPUT_OPTIONS = {
      "Date": {
        isrange: "true"
      }
    }

    var AdderGroup = function () {
    };

    _.extend(AdderGroup.prototype, Backbone.Events, {
        id: "filteredfacet",
        name: "editor_facet_title",
        weight: 4,

        getAdders: function (model, application) {
          var that = this;

          if (this.previousModel && this.changeListener) {
            this.previousModel.off("change", this.changeListener);
            delete this.previousModel;
            delete this.changeListener;
          }

          if (model.type === "view") {
            this.previousModel = model;
            this.changeListener = function () {
              that.trigger("changed", this);
            }
            model.on("change", this.changeListener);

            var available_facets = application.models.search.get("available_facets") || [];
            available_facets = available_facets.sort(function (a, b) {
              a = a && a.name;
              b = b && b.name;

              return a < b ? -1 : 1;
            });
            return _.collect(available_facets, function (facet) {
                return {
                  name: facet.name,
                  icon: "../img/imgfacet.png",
                  options: {
                    name: facet.name
                  }
                }
            });
          }
        },

        create: function (options) {
          return Backbone.View.prototype.make(
            "div",
            {
              "data-template": "filteredfacet",
              "data-name": options.name,
              "data-title": options.title
            },
            DEFAULT_TEMPLATE
          );
        }
    });

    TemplateRegistry.add(new AdderGroup());

  var FacetTemplate = Template.extend({

    editableName: "editor_facet_title",

    initialize: function () {
      Template.prototype.initialize.apply(this, _.toArray(arguments));
      this.$el = $(this.el);
    },
    
    getDefaultTemplate: function () {
      return DEFAULT_TEMPLATE;
    },

    createView: function(options)  {
      var view = new this.constructor.View(_.extend(this.attributeModel.getCamelCase(),
        options, {
        application: options.application,
        el: options.el || this.el,
        suggest: this.get("suggest", options.suggest),
        userInput: this.get("user-input", options.userInput),
        disableUserInput: this.get("disable-user-input", options.disableUserInput),
        userInputTemplate: this.get("user-input-template", options.userInputTemplate),
        alwaysVisible: this.get("always-visible", options.alwaysVisible),
        collapsible: this.get("collapsible", options.collapsible),
        defaultOpen: this.get("default-open", options.defaultOpen),
        displayed: this.get("displayed", options.displayed),
        template: this,
        dropdownfilter: this.get("dropdownfilter", options.dropdownfilter),
        dropdownfilter_containerClassName: this.get("container-class-name", options.dropdownfilter_containerClassName),
        dropdownfilter_titleClassName: this.get("title-class-name", options.dropdownfilter_titleClassName),   
        facetTitle: this.get("title", options.title),
        facetName: this.get("name", options.facetName),
        elementTemplate: options.node && options.node.children && options.node.children[0] && options.node.children[0].template,
        showCheckbox: this.get("show-checkbox", options.showCheckbox),
        showAll: this.get("show-all", options.showAll),
        titleTemplate: this.get("title-template", options.titleTemplate),
        restoreFocus: this.get("restoreFocus", options.restoreFocus)
      }));
      this.instances.push(view);
      return view;
    },

    schema: new Template.Schema({
      attributes: {
        name: {
          type: "string",
          title: "editor_facet_title",
          required: true,
          model_stored: true
        },
        title: {
          type: "i18nString",
          title: "editor_facet_title_label"
        },
        suggest: {
          type: "boolean",
          title: "editor_facet_suggest_label",
          "default": true,
          visible: false
        },
        disableUserInput: {
          type: "boolean",
          title: "editor_facet_disable_userinput",
          "default": false,
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
          depends: "/^\s*$/.test(attributes['user-input'])"
        },
        "always-visible": {
          type: "boolean",
          title: "editor_facet_always_visible_label",
          "default": false,
          depends: "/^\s*$/.test(attributes['user-input'])"
        },
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
        andAvailable: {
          type: "boolean",
          title: "editor_facet_and_available_label",
          "default": false
        },
        "order-criteria": {
          type: "string",
          title: "client_toolbar_sortingalgorithm_label",
          values: [
            { value: "", text: i18n("editor_facet_filter_default") },
            { value: "COUNT", text: i18n("editor_facet_displayed_label") },
            { value: "VALUE", text: i18n("editor_facet_title_label") }            
          ]
        },
        "order-direction": {
          type: "string",
          title: "order_direction",
          values:  [
            { value: "", text: i18n("editor_facet_filter_default") },
            { value: "ASCENDING", text: i18n("sort_ascending") },
            { value: "DESCENDING", text: i18n("sort_descending") }
          ]
        },
        "predefined-order": {
          type: "string",
          title: "predefined_order"
        },
        "title-template": {
          title: "editor_facet_title_template_label",
          visible: false
        },
        "show-checkbox": {
          type: "boolean",
          title: "editor_facet_show_checkbox_label",
          "default": true,
          "defaultValue": true,
          visible: false
        },
        "restoreFocus": {
          type: "boolean",
          title: "editor_facet_restoreFocus",
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
        },
        "intersect-values": {
          type: "boolean",
          title: "editor_facet_intersect_values",
          "default": false,
          "defaultValue": false
        },
        dropdownfilter: {
          type: "boolean",
          title: "editor_facet_dropdownfilter",
          "default": false,
          "defaultValue": false
        }
        /*,
        "order-criteria": {
          type: "string",          
          title: "editor_facet_order_criteria",
          values: [
            { value: "COUNT", text: i18n("editor_facet_user_input_value_auto") },
            { value: "VALUE", text: i18n("editor_facet_user_input_value_enabled") }            
          ]
        },
        "order-direction": {
          type: "string",   
          title: "editor_facet_order_direction",
          values: [
            { value: "ASCENDING", text: i18n("editor_facet_user_input_value_auto") },
            { value: "DESCENDING", text: i18n("editor_facet_user_input_value_enabled") }            
          ]
        }*/
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
          childNode && childNode.template && childNode.template.remove({
              node: childNode
          });
      });
    }
});

  var FacetValueView = ComponentBase.extend({

/*
 * TODO: should work but doesn't
    events: function () {
      return _.extend({},
        ComponentBase.prototype.events,
        {
          "click a.mb-add-and": "addAnd"
        }
      );
    },
*/

    initialize: function(args) {
      ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));

      if (this.model && this.model.get("id") === this.options.facetView.modelIdPathToFocus) {
        delete this.options.facetView.modelIdPathToFocus;
        this.focus = true;
      }

      this.listenTo(this.options.constraintsModel, "change", this.updateState);
      if (this.options && this.options.facetView && this.options.facetView.monitorFacetValueChecked) {
         this.options.facetView.monitorFacetValueChecked(this);
      }

      this.contentView = this.options.elementTemplate.createView({
        model: this.model,
        application: this.options.application,
        useOutputOnly: !!this.model.output,
        labelid: this.options.labelid
      });

      this.patchRenderData(this.contentView);
      this.contentView.el.id = this.options.labelid;
    },

    patchRenderData: function (view) {
      var originalRenderData = view.renderData,
          andAvailable = this.options.andAvailable;

      view.renderData = function () {
        var renderData = originalRenderData.apply(this, arguments);
        return {
          get: function (key) {
            if (key === "showAddAnd" && !andAvailable) {
              return andAvailable;
            }
            return renderData.get.apply(renderData, arguments);
          }
        };
      };
    },

    handleAction: function (e, traceContext) {
      var target = e.currentTarget;
      if ($(target).hasClass("mb-add-and")) {
        this.options.application.trigger("actionHandled");
        this.addAnd(e);
        e.stopPropagation();
        e.preventDefault();
      } else {
        ComponentBase.prototype.handleAction.apply(this, _.toArray(arguments));
      }
    },

    addAnd: function (e) {
      var that = this,
          application = this.options.application,
          facetName = this.options.facetName,
          model = this.model,
          entries = application.models.search.get(["facets", facetName, "entries"]),
          selectedIds = model.get("query_expr.and.id"),
          filteredEntries = _.filter(entries, function (entry) {
            return !entry.excluded && entry.query_expr.id !== model.get("query_expr.id") && _.indexOf(selectedIds, entry.query_expr.id) < 0;
          }).concat([{ suggest: true }]);


      this.andSelectorView = new AndSelectorView({
        model: new Backbone.Collection(filteredEntries),
        facetEntryView: this,
        application: application
      });

      this.el.appendChild(this.andSelectorView.el);
    },

    _cleanupQueryExpr: function (query_expr) {
      if (!query_expr) return;

      query_expr = _.extend({}, query_expr);

      if (query_expr.and) {
        delete query_expr.description;
        delete query_expr.id;
        delete query_expr.path;
      }

      return query_expr;
    },

    addOrUpdateUserGeneratedEntry: function (facetName, label, query_expr) {
      var application = this.options.application,
          model = this.model,
          facetEntries = application.models.search.output.submodel(["facets", facetName, "entries"]),
          description = this.model.get("query_expr.description") + "<br>" + label,
          query_expr = Search.and(this._cleanupQueryExpr(this.model.get("query_expr")), query_expr),
          newModel = application.models.search.output.createStringFacetValue(description, {
            count: 0,
            html: description,
            query_expr: query_expr
          });

      query_expr.description = description;
      query_expr.id = "user_generated_" + _.uniqueId();
      query_expr.value = { str: description };
      newModel.isUserGenerated = true;
      newModel.showAddAnd = this.options.andAvailable;

      if (this.model.get("isUserGenerated")) {
        newModel.query_expr.id = this.model.get("query_expr").id;
        (this.model.output || this.model).load(newModel);
        this.options.facetView.toggleFacetValue(true, this.model);
      } else {
        facetEntries.load([newModel], {silent: false, merge: true});
        this.options.facetView.toggleFacetValue(false, model, { silent: true });
        this.options.facetView.toggleFacetValue(true, newModel);
      }

      if (this.andSelectorView) {
        this.andSelectorView.remove();
      }
      delete this.andSelectorView;
    },

    updateState: function () {
      if (this.checkBox) {
        this.checkBox.checked = this.options.facetView.isFacetValueChecked(this.model);
      }
    },

    setModel: function () {
      this.stopListening(this.options.constraintsModel);

      ComponentBase.prototype.setModel.apply(this, arguments);

      if (this.model) {
        this.listenTo(this.options.constraintsModel, "change", function() {
          if (this.checkBox) {
            this.checkBox.checked = this.options.facetView.isFacetValueChecked(this.model);
          }
        });
      }
    },

    setEditable: function () {
    },

    render: function() {
      var that = this;

      var contentViewEl = this.contentView.render().el;
      contentViewEl.setAttribute("tabindex", "-1");
      contentViewEl.setAttribute("data-prevent-refocus", "true");

      if (this.options.showCheckbox) {
        this.label = this.make("label", { "class": "checkbox" });
        this.checkBox = this.make("input", {"type": "checkbox" });
        this.updateState();
        $(this.checkBox).change(Trace.instrument(_.bind(this.onFacetValueChange, this), "uiAction", function () {
          return ["facet selection changed"];
        }));
        this.label.appendChild(this.checkBox, true);
        this.label.appendChild(contentViewEl);
        this.appendChild(this.label, true);
      } else {
        this.appendChild(contentViewEl, true);
      }

      $(contentViewEl).find(".mb-tooltip").each(function() {
        var obj = $(this);
        var element = obj.get(0);
        
        // if (element.clientWidth < element.scrollWidth) {
        obj.attr('title', obj.text());
        // }
      });

      if (this.focus) {
        delete this.focus;
        if (this.options.restoreFocus){
          window.setTimeout(function () {
            if (that.checkBox) that.checkBox.focus();
          }, 0);
        }
      }

      return this;
    },
    
    onFacetValueChange: function(e, traceContext) {
      this.options.facetView.toggleFacetValue(e.target.checked, this.model, { traceContext: traceContext });
      this.updateState();
    },

    remove: function () {
      if (this.model && this.model.get("id") && document.activeElement === this.checkBox) {
        this.options.facetView.modelIdPathToFocus = this.model.get("id");
      }

      $(this.checkBox).off();
      if (this.andSelectorView) {
        this.andSelectorView.remove();
      }
      delete this.andSelectorView;
      if (this.contentView) {
        this.contentView.remove();
      }
      delete this.contentView;
      ComponentBase.prototype.remove.apply(this, arguments);
    }
  });

  Application.prototype.toggleExpandable = function (options) {
    if (options.eventTarget.innerText == "Not available") return;
    if (options.event.toggleHandled) return;                    
    options.event.toggleHandled = true;           

    var controlledId = options.id || options.eventTarget.getAttribute("aria-controls"),
      controlledEl = document.getElementById(controlledId),
      expandedAttrEl = options.eventTarget.hasAttribute("aria-expanded") ? options.eventTarget : controlledEl,
      expanded = expandedAttrEl.hasAttribute("aria-expanded") ? !(expandedAttrEl.getAttribute("aria-expanded") === "false") : $(expandedAttrEl).is(":visible");

    if (expanded) {
      this.closeExpandable(options);
    } else {
      this.openExpandable(options);
    }
  }

  Application.prototype.openExpandable = function (options) {
    var that = this,
      eventId = _.uniqueId("event"),
      enabledSelector = options.eventTarget.getAttribute("data-enabled-selector"),
      controlledId = options.id || options.eventTarget.getAttribute("aria-controls"),
      controlledEl = document.getElementById(controlledId);

    if (enabledSelector && !$(enabledSelector).is(":visible")) {
      return true;
    }

    if (options.eventTarget.hasAttribute("aria-expanded")) {
      options.eventTarget.setAttribute("aria-expanded", "true");
    }

    controlledEl.setAttribute("aria-expanded", "true");
    $("body").addClass(controlledId + "-visible");
    dom.focus(controlledEl);

    if (options.closeOnFocusout) {
      $(controlledEl).on("focusout." + eventId, function () {
          window.setTimeout(function () {
            var focusInControlledEl = dom.isChild(document.activeElement, controlledEl);
            if (!focusInControlledEl) {
                $(controlledEl).off("focusout." + eventId);
                that.closeExpandable(options);
            }
          }, 10);
      });
    } 
  }

  Application.prototype.closeExpandable = function (options) {
    var controlledId = options.id || options.eventTarget.getAttribute("aria-controls"),
        controlledEl = document.getElementById(controlledId);

    if (options.eventTarget && options.eventTarget.hasAttribute("aria-expanded")) {
      options.eventTarget.setAttribute("aria-expanded", "false");
    }
    controlledEl.setAttribute("aria-expanded", "false");
    $("body").removeClass(controlledId + "-visible");
  }

  FacetTemplate.ValueView = FacetValueView;
  FacetTemplate.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

  FacetTemplate.View = ComponentBase.extend({
    events: function () {
      return _.extend({},
        ComponentBase.prototype.events,
        {
          "click a.mb-toggle": "toggleDisplayed",
          "keypress a.mb-toggle": "toggleDisplayed",
          "accordionactivate": "handleAccordionactivate",
          "accordiondeactivate": "handleAccordiondeactivate",
          "click .dropdown-toggle": "toggleDropdown",
          "keypress .dropdown-toggle": "toggleDropdown"
      });
    },

    defaultOptions: {
      titleTagName: "h3",
      titleClassName: "",
      containerTagName: "ul",
      containerClassName: "nav nav-stacked nav-pills",
      dropdownfilter_containerClassName: "nav nav-stacked nav-pills mb-flexbox",
      dropdownfilter_titleClassName: "btn btn-default dropdown-toggle full-width",
      entryTagName: "li",
      entryClassName: "",
      collapsible: false,
      andAvailable: false,
      alwaysVisible: false,
      disableUserInput: false
    },
    
    initialize: function () {
      if (this.options.dropdownfilter) {
        var filterName = this.options.name;
        var titleElId = "filter-title-" + filterName; 

        var dropdown_containerClassName = this.options.containerClassName || this.defaultOptions.dropdownfilter_containerClassName;
        var dropdown_titleClassName = this.options.titleClassName || this.defaultOptions.dropdownfilter_titleClassName;

        this.el.setAttribute("data-title-el-id", titleElId);
        this.el.setAttribute("data-container-class-name", dropdown_containerClassName);
        this.el.setAttribute("data-title-class-name", dropdown_titleClassName);
        this.el.setAttribute("class", "dropdownfilter");

        this.$referencedTitle = $(document.getElementById(this.el.getAttribute("data-title-el-id")));

        this.options.titleClassName = dropdown_titleClassName;
        this.options.className = dropdown_containerClassName;
        this.options.titleTagName = "div";
        this.options.titleTemplate = this.options.titleTemplate || '<span data-i18n="no_restriction">{{i18n.no_restriction}}</span>';
        this.options.emptyFilterName = i18n("no_restriction");
      }
      
      this.options = _.extend({
        labelid: _.uniqueId("label")
      }, this.defaultOptions, this.options);

      this.initializeUserInputOptions();

      this.options.displayed = this.options.displayed || Number.MAX_VALUE;

      if (this.options.titleTemplate) {
        this.titleAdapter = new MustacheAdapter(this.options.titleTemplate);
      }

      ComponentBase.prototype.initialize.apply(this, arguments);

      if (this.options.collapsible && !this.options.accordion) {
        this.options.accordion = new Accordion.View({
          el: this.el,
          enabled: true,
          "default-open": this.options.defaultOpen,
          application: this.options.application
        });
      }

      if (_.isString(this.options.orderCriteria)) {
        this.options.orderCriteria = this.options.orderCriteria.split(/\s*,\s*/);
      }
      if (_.isString(this.options.orderDirection)) {
        this.options.orderDirection = this.options.orderDirection.split(/\s*,\s*/);
      }
      if (_.isString(this.options.predefinedOrder)) {
        this.options.predefinedOrder  = JSON.parse("[" +this.options.predefinedOrder + "]");
      }

      if (_.isArray(this.options.orderCriteria) && _.isArray(this.options.orderDirection) && this.options.orderCriteria.length && this.options.orderDirection.length) {
        var predefinedOrder = _.isArray(this.options.predefinedOrder) ? [].concat(this.options.predefinedOrder) : [];
        var subcriteria = null;
        for (var i = this.options.orderCriteria.length -1 ; i > 0; --i ) {
          var result = { criteria: this.options.orderCriteria[i],
                         direction: this.options.orderDirection[i],
                         options: {} }

          if (subcriteria) {
            result.options.subCriteria = subcriteria;
          }
          if (result.criteria == "PREDEFINED" && predefinedOrder && predefinedOrder.length) {
            result.options.predefinedOrder = predefinedOrder.pop();
          }
          subcriteria = result;
        }
        this.orderOptions = {criteria: this.options.orderCriteria[0],
                             direction: this.options.orderDirection[0]                            
                            };

        if (subcriteria) {
          this.orderOptions.subCriteria = subcriteria;
        }
        if (this.orderOptions.criteria == "PREDEFINED" && predefinedOrder && predefinedOrder.length) {
            this.orderOptions.predefinedOrder = predefinedOrder.pop();
        }        
      }
      
      
      this.options.intersectValues = this.options.intersectValues === true || _.isString(this.options.intersectValues) && this.options.intersectValues === "true";

      this.filterID = this.options.facetName ? ("filter_" + this.options.facetName) : _.uniqueId("cid");
      if (this.options.collection) {
        this.collection = this.options.collection;
      } else {
        this.collection = this.getCollection();
        if (this.model.addFacet) this.model.addFacet(this.collection, { silent: true });
      }

      this.constraintsModel = this.getConstraintsModel();

      this.options._displayed = this.options.displayed;

      if (this.collection.models) {
        var that = this;
        this.collection = new FilteredCollection([], {
          delegate: this.collection,
          filter: function (models) {
            var filtered = _.filter(models, function (entry, index) {
              var checked;

              if (!entry.id) entry.id = entry.get("id");
              
              try {
                checked = that.isFacetValueChecked(entry);
              } catch (e) {
                checked = false;
              }
              return index < that.options._displayed || checked;
            });

            _.defer(function () {
              that.updateContent();
            });

            return filtered;
          }
        });
      }

      this.listenTo(this.collection, "add", this.updateContent);
      this.listenTo(this.collection, "remove", this.updateContent);

      if (this.options.dropdownfilter) {
        this.listenTo(this.constraintsModel, "change", this.updateTitle);
      }

      this.updateContent();
    },

    /*
    * the options suggest, userInput and userInputTemplate
    * lead to userInputTemplate to be set up correctly.
    * suggest and userInput are deleted.
    */
    initializeUserInputOptions: function () {
      if (typeof this.options.userInput !== "undefined") {
        delete this.options.suggest;
      }
      if (/disabled|auto/i.test(this.options.userInput)) {
        delete this.options.userInputTemplate
				if (/disabled/i.test(this.options.userInput)) {
          delete this.options.userInput;
        }
      }
      if (this.options.userInputTemplate) {
       delete this.options.suggest;
       delete this.options.userInput;
      }
      if (/auto/i.test(this.options.userInput)) {
        delete this.options.suggest;
      }

      if (this.options.suggest) {
        this.options.userInput = "auto";
      } else if (this.options.suggest === false) {
        delete this.options.userInputTemplate;
        delete this.options.userInput;
      }

      delete this.options.suggest;

      if (this.options.userInputTemplate) {
        Mindbreeze.require(["component!" + this.options.userInputTemplate]);
      } else {
        this.options.alwaysVisible = false;
      }
    },

    handleAccordionactivate: function () {
      this.options.application.models.tabs.setting(this.openId(), true);
      this.updateTitle();
    },

    handleAccordiondeactivate: function () {
      this.options.application.models.tabs.setting(this.openId(), false);
      this.updateTitle();
    },

    getUserQuery: function () {
      var field = this.options.application.formqueryadapter.field(this.options.facetName);
      if (field) {
        return this.getInput().get(["user", "query"].concat(field.path));
      }
    },
    
    _useAutoUserInput: function () {
      return /auto/i.test(this.options.userInput);
    },

    _getUserInputOptions: function (Component, dataType) {
      var options = {};
      if (this._useAutoUserInput()) {
        options = AUTO_USER_INPUT_OPTIONS[dataType] || {};
      }

      options.appendTo = this.el;

      options = _.extend({}, options, new dom.AttributeModel(this.el, "data-user-input-").get());
      _.each(this.options, function (value, key) {
        if (/userInput.*/.test(key)) {
          options[dom.AttributeModel.camelCaseToSeparated(key).substring(11)] = value;
        }
      });
      delete options.template
      delete options[""]

      if (Component.prototype.schema) {
        options = Component.prototype.schema.parseAttributes(options);
      }

      options.grouped = false;

      options = _.extend({
          model: this.model,
          placeholder: "search",
          application: this.options.application,
          channel: this.model.wiring.channel,
          property: this.options.facetName,
          sources: ["DOCUMENT_PROPERTY"],
          parentView: this,
          excludedFilterID: this.filterID,
          addQueryConstraints: true
        }, options);
     
      return options;
    },

    _getUserInputTemplate: function (dataType) {
      if (this.options.userInputTemplate) return this.options.userInputTemplate;
      if (this._useAutoUserInput()) return AUTO_USER_INPUT[dataType];
    },

    updateContent: function () {

      if (this.options.dropdownfilter) {
        this.options.alwaysVisible = this.el.getAttribute("data-always-visible") === "true";
        var that = this;
      
        that.updateTitle();

        if (!this.options.alwaysVisible) {
          if (this.collection.length) {
            this.$referencedTitle.show();
          } else {
             this.$referencedTitle.hide();
          }
        }
      }
      _.defer(_.bind(function () {
          if (!this.model) return;

          var that = this,
              hasEntries = this.collection.models.length > 0,
              hasUserQuery = this.getUserQuery(),
              showFilter = this.options.alwaysVisible || hasEntries || hasUserQuery,
              showToggle = this.collection && this.collection.delegate && this.collection.delegate.models && this.collection.delegate.models.length > this.options.displayed, 
              dataType = this.collection.delegate ? this.collection.delegate.dataType : this.collection.dataType,
              userInputTemplate;

          this.collection.cutoff && this.collection.cutoff();

          if (showFilter) {
            this.$el.show();
            if (!this.groupView) {
              this.groupView = this.appendChild(this.make("div", {
                    "role": this.options.collapsible ? "tabpanel" : "",
                    "aria-labelledby": this.options.labelid,
                    "id": "panel_" + this.options.labelid,
              }), true);

              if (!this.isOpen()) {
                this.groupView.setAttribute("aria-hidden", "true");
                this.groupView.style.display = "none";
              }
            }

            if (!this.$toggleEl) {
              this.$toggleEl = $(this.groupView.appendChild(this.make("a",
                  {
                    "class": "action mb-center mb-toggle hidden-phone mb-action-sheet-visible",
                    "href": "#",
                    "role": "button"
                  },
                  ""))).hide();
            }

            if (this.options.charttype) {
              if (!this.chartView) {
                this.chartView = true;
                Mindbreeze.require(["component!" + "piechart"], function (Component) {
                    that.chartView = new Component.View({
                      charttype: that.options.charttype,
                      model: that.collection && that.collection.delegate || that.collection,
                      title: "",
                      series: [ "facets", that.options.facetName ],
                    });
                    that.chartView.render();
                    that.groupView.appendChild(that.chartView.el);
                });
              }
            }

            userInputTemplate = this._getUserInputTemplate(dataType);
            if (userInputTemplate && !this.userInputView) {
              this.userInputView = true; // temporary, until component is loaded
              Mindbreeze.require(["component!" + userInputTemplate], function (Component) {
                var options = that._getUserInputOptions(Component, dataType);

                that.userInputView = new Component.View(options);
                that.userInputView.render();
                that.userInputView.el.setAttribute("aria-label", i18n("facet_suggest", { criteria: that.getTitle() })); // todo: do in view
                that.groupView.appendChild(that.userInputView.el);

                var inputModel = that.options.model;
                inputModel = inputModel.submodel("user.query");

                var searchFormOptions = _.extend({}, that.options, {model: inputModel, outerModel: that.options.model, el: that.el});
                that.searchForm = new SearchForm.View(searchFormOptions);
                that.searchForm.disableEditing();
              });
            }
            if (!this.titleEl) {
              this.titleEl = this.make(this.options.titleTagName, {
                  "class": this.options.titleClassName,
                  "id": this.options.labelid
              });
              if (this.options.collapsible) {
                this.titleEl.setAttribute("role", "tab");
                this.titleEl.setAttribute("aria-controls", "panel_" + this.options.labelid);
                this.titleEl.setAttribute("aria-expanded", this.isOpen());
                this.titleEl.setAttribute("title", i18n(this.isOpen() ? "Close" : "Open"));
              }
              this.insertAt(this.titleEl, 0, true);
            }

            this.updateTitle();
          }


          if (hasEntries) {
            if (!this.treeView) {
              this.treeView = new FacetTemplate.TreeView(_.extend(
                  {},
                  this.options,
                  {
                    facetView: this,
                    filterID: this.filterID,
                    el: null,
                    model: this.collection,
                    constraintsModel: this.constraintsModel,
                    facetTitle: this.options.facetTitle,
                    dropdownfilter: this.options.dropdownfilter,
                    dropdownfilter_containerClassName: this.options.dropdownfilter_containerClassName,
                    dropdownfilter_titleClassName: this.options.dropdownfilter_titleClassName,
                    facetName: this.options.facetName,
                    wiring: this.model.wiring,
                    tagName: this.options.containerTagName,
                    className: this.options.containerClassName,
                    entryTagName: this.options.entryTagName,
                    entryClassName: this.options.entryClassName,
                    labelid: this.options.labelid,
                    addGroupRole: false,
                    restoreFocus: this.options.restoreFocus
                  }
              )).render();
              dom.insertAt(this.groupView, this.treeView.el, 0);
            }
          } else {
            if (this.treeView) {
              this.treeView.remove();
              delete this.treeView;
            }
          }

          if (this.$toggleEl) {
            if (showToggle) {
              var cutoff = this.collection.cutoff();
              if (cutoff) {
                this.$toggleEl.addClass("mb-more-available");
                if ( $(".mb-more-available-is-open").length ) {
                  this.$toggleEl.removeClass("mb-more-available-is-open");
                }
                this.$toggleEl.html(i18n("show_more"));
              } else {
                this.$toggleEl.addClass("mb-more-available-is-open");
                this.$toggleEl.removeClass("mb-more-available");
                this.$toggleEl.html(i18n("show_less"));
              }
              this.$toggleEl.show();
            } else {
              this.$toggleEl.hide();
            }
          }

          if (!showFilter) {
            this.$el.hide();
            this.removeOwnedNode(this.titleEl);
            delete this.titleEl;
            this.removeOwnedNode(this.progressEl);
            delete this.progressEl

            if (this.userInputView) {
              this.userInputView.$el.remove();
              delete this.userInputView;
            }

            if (this.groupView) {
              if (this.groupView.parentNode) this.groupView.parentNode.removeChild(this.groupView);
              delete this.$toggleEl;
              delete this.groupView;
            }
          }

      }, this));
  
      if (this.options.dropdownfilter) {
        _.defer(function () {
          if (that.groupView) {
            $(that.groupView).addClass("dropdown-menu");
          }
        });
      }

    },

    updateTitle: function () {
      if (this.options.dropdownfilter) {
        var title = this.getTitle();
        if (!this.titleEl) {
          this.titleEl = this.make(this.options.titleTagName, {
              "class": this.options.titleClassName,
              "id": this.options.labelid,
              "aria-haspopup": true,
              "aria-expanded": false,
              "data-action-object": JSON.stringify({ toggleExpandable: { id: "panel_" + this.options.labelid, closeOnFocusout: false }})
          });
          this.insertAt(this.titleEl, 0, true);
          var getDropdownFacetTitle = this.options.facetTitle || this.getFacetTitleOfModel() || this.options.title || "";
          $(this.el).prepend("<h3>" + getDropdownFacetTitle + "</h3>");
        }
        if (this.options.dropdownFacetValue) {
          if (this.el.firstChild.innerHTML != this.options.dropdownFacetValue) {
            $(this.el).prepend("<h3>" + this.options.dropdownFacetValue + "</h3>");
          }
        }
        this.titleEl.innerHTML = title;
        this.titleEl.setAttribute("title", StringUtils.stripHtml(title));
      } else {
        var title = this.getTitle();
        if (this.titleAdapter) {
          title = this.titleAdapter.render(new Backbone.Model({ title: title, isOpen: this.isOpen() ? true : undefined }));
        }
        this.titleEl.innerHTML = title;
      }
    },

    openId: function () {
      return "facet." + this.options.facetName + ".opened";
    },

    isOpen: function () {
      return !this.options.accordion || this.options.accordion.isOpen(this.openId(), this.options.defaultOpen);
    },

    toggleDisplayed: function (e) {
      if (e && "keypress" === e.type && (e.which !== keys.enter && !(e.which === keys.space && /button/i.test(e.currentTarget.getAttribute("role"))))) {
        return true;
      }
      e.preventDefault();
      if (this.collection.delegate) {
        if (this.options._displayed === Number.MAX_VALUE) {
          this.options._displayed = this.options.displayed;
        } else {
          this.options._displayed = Number.MAX_VALUE;
        }
        this.collection.reset();
      }
    },

    getTitle: function () {
      this.options.dropdownFacetValue = this.options.facetTitle || this.getFacetTitleOfModel() || this.options.title || "";
      if (this.options.dropdownfilter) {
        this.getFacetTitleOfModel();
        var checkedNames = _.keys(this.checkedFacetValues() || {}),
            title = checkedNames.join(", ") || i18n(this.el.getAttribute("data-all-title")) || this.treeView && this.treeView.getAnyModelName() || i18n("not_available");

        return (i18n(this.el.getAttribute("data-title-prefix")) || "") + title + " <span class=\"caret\"></span>";
      } else {
        var title = this.options.facetTitle || this.getFacetTitleOfModel() || this.options.title || "";
        if (title) {
          this.cachedTitle = title;
        } else {
          title = this.cachedTitle;
        }
        if (!title) {
          return i18n(this.options.facetName);
        }
        return title;
      }
    },

    getFacetTitleOfModel: function () {
      try {
        return this.originalFacetTitle = this.model.get(["facets", this.options.facetName, "name"]);
      } catch(e) {}
    },
    
    // handler function for suggest selection
    submit: function (e, traceContext, value, usedAutocomplete, options) {
      var cid = _.uniqueId("c");
      var lookupValue = StringUtils.trim(value);
      var that = this;
      var model;
      var collection = (this.treeView && this.treeView.model.delegate) || (this.treeView && this.treeView.model);
      options = _.extend({}, options, { traceContext: traceContext });

      if (this.treeView) {
        model = collection.get(lookupValue);
        if (!model)  {
          lookupValue = StringUtils.normalizeString(lookupValue); 
          collection.each(function(m) {
              if (model != null) return;

              var id = m.get("query_expr.id"); 
              id = StringUtils.normalizeString(id); 

              if (id == lookupValue) {
                model = m;
                return;
              }
              id = m.get("query_expr.id");
              if (id && id.toLowerCase() == lookupValue) {
                model = m;
                return;
              }
          });
        }
      }

      if (this.options.disableUserInput) {
        if (!usedAutocomplete) return;
      }
      
      if (!model && usedAutocomplete) {
        Search.addFacetValue(this.model, collection.name, value);
        model = collection.get(value);
      }

      if (model) {
        this.searchForm.clearModel({silent: true});

        if (that.userInputView.el && that.userInputView.el.value) {
          that.userInputView.el.value = "";
        }
        
        this.toggleFacetValue(true, model, options);
        _.defer(function () {
          that.userInputView && that.userInputView.clear();
        });
      } else {
        this.searchForm.submit.apply(this.searchForm, arguments);
      }
    },

    createFacet: function (value) {
        value = _.escape(value);
        var query_expr = {
          id: value,
          label: this.options.facetName,
          regex: "^" + value + "$",
          description: value
        };
        var output = new ReadOnlyTreeModel({
            id: value,
            query_expr: query_expr,
            value: value,
            html: value,
            excluded: true
        });
        return new ComputedModel(this.model.wiring, {
            input: this.getInput(), 
            output: output
        });
    },
    
    monitorFacetValueChecked: function(valueView) {
      if (!valueView || !valueView.model || !valueView.model.isAny || !valueView.updateState) {
        return;
      }
      if (valueView.model.get("siblings")) {
        valueView.listenTo(valueView.model.get("siblings"), "add remove", valueView.updateState);
      }
    },

    isFacetValueChecked: function(model) {
      if (!model) return false;

      var checkedFacetValues = this.checkedFacetValues();

      if (model.isAny) {
        if (!checkedFacetValues) return true;

        var siblingIds = _.map(model.get("siblings").models, function (sibling) { return sibling.get("query_expr").id });
        var intersection = _.intersection(_.keys(checkedFacetValues), siblingIds);
        var isSiblingChecked = intersection.length > 0;

        if (!isSiblingChecked) return true;
      }
      
      var query_expr = model.get("query_expr");
      if (!query_expr) return false;

      var checked = checkedFacetValues;
      return !!(checked && checked[query_expr.id]);
    },

    checkedFacetValues: function () {
      var constraint = this.getConstraint(),
          query_exprs = _.values(constraint && constraint.filter_base),
          i, path;

      if (!query_exprs || query_exprs.length < 1) return;

      for (i=0; i<query_exprs.length; i++) {
        var path = query_exprs[i].path;
        if (path) {
          query_exprs = query_exprs.concat(path);
        }
      }

      return _.reduce(query_exprs, function (result, query_expr) {
        result[query_expr.id] = query_expr;
        return result;
      }, {});
    },

    
    getConstraint: function () {
      return this.constraintsModel && this.constraintsModel.get([this.filterID]);
    },

    toggleFacetValue: function(checked, model, options) {
      if (this.options.dropdownfilter) {
        this.options.application.closeExpandable({ id: "panel_" + this.options.labelid });
        //Close autocomplete (IE) and Inputfocus
        document.activeElement.blur();
      }

      if (!model) return;

      var filtered = this.allFilterConstraints(),
          filter_base = this.checkedFacetValues(),
          query_expr;

      if (model.isAny) {
        var parentQueryExpr;
        var siblings = model.get("siblings");
        siblings = siblings && siblings.models;

        if (siblings && siblings.length > 0) {
          var path = siblings[0].get("query_expr").path;
          parentQueryExpr = path && path.length > 0 && path[path.length - 1];
        }

        if (parentQueryExpr) {
          filter_base = this._deselectChildren(filtered, parentQueryExpr, filter_base);
          filter_base[parentQueryExpr.id] = parentQueryExpr;
          this._setConstraint(filtered, filter_base, options)
        } else {
          options = _.extend({}, options, { path: [this.filterID] });
          this.constraintsModel.unset(null, options);
        }
      } else {
        query_expr = model.get ? model.get("query_expr") : model.query_expr
        filter_base = filter_base || {};
        if (checked) {
          filter_base[query_expr.id] = query_expr;
        } else {
          // deselect children
          filter_base = this._deselectChildren(filtered, query_expr, filter_base);
          delete filter_base[query_expr.id];

          // select parent
          if (query_expr.path && query_expr.path.length > 0) {
            var parent_query_expr = query_expr.path[query_expr.path.length - 1];
            filter_base[parent_query_expr.id] = parent_query_expr;
          }
        }

        this._setConstraint(filtered, filter_base, options)
      }
    },

    toggleDropdown: function (e) {
      if (e && "keypress" === e.type && (e.which !== keys.enter && !(e.which === keys.space && /button/i.test(e.currentTarget.getAttribute("role"))))) {
        return true;
      }

      e.preventDefault();
    },

    _setConstraint: function (filtered, filter_base, options) {
      options = _.extend({}, options, { path: [this.filterID] });
      filtered = _.reduce(filtered, function (result, value, key) { if (!filter_base[key]) { result[key] = value; } return result; }, {});

      // remove all parents from root
      _.each(filter_base, function (query_expr) {
          _.each(query_expr.path, function (query_expr) {
              delete filter_base[query_expr.id];
              delete filtered[query_expr.id];
          });
      });

      var selectedParents = _.flatten(_.map(filter_base, function (query_expr) {
        return query_expr.path;
      }));

      selectedParents.push(undefined);
      selectedParents = _.uniq(_.map(selectedParents, function (entry) { return entry && entry.id; }));

      filtered = _.reduce(filtered, function (filtered, query_expr, key) {
        var parent_query_expr = query_expr.path && query_expr.path[query_expr.path.length - 1]
        if (_.indexOf(selectedParents, parent_query_expr && parent_query_expr.id) >= 0) {
          filtered[key] = query_expr;
        }
        return filtered;
      }, {});

      // remove all children where no sibling is checked
      filtered = _.reduce(filtered, function (result, query_expr) {
        if (!query_expr.path || query_expr.path.length === 0) result[query_expr.id] = query_expr;
        _.each(query_expr.path, function (path_query_expr) {
          if (!filtered[path_query_expr.id]) {
            result[query_expr.id] = query_expr;
          }
        });
        return result;
      }, {});

      // remove all children from filtered parents
      filtered = _.reduce(filtered, function (result, query_expr) {
        if (!query_expr.path || query_expr.path.length === 0) result[query_expr.id] = query_expr;
        _.each(query_expr.path, function (path_query_expr) {
          if (!filtered[path_query_expr.id]) {
            result[query_expr.id] = query_expr;
          }
        });
        return result;
      }, {});

      var filter_base_count = _.keys(filter_base).length
      if (filter_base_count > 0) {
        var filterExpr = {
            label: this.options.facetName,
            filtered_name: this.originalFacetTitle,
            filtered: filtered,
            filter_base: filter_base
        };

        if (this.options.intersectValues) {
          filterExpr.filter_join = "AND";
          delete filterExpr.filtered;
        }

        this.constraintsModel.set(
          null, filterExpr, options
        );
      } else {
        this.constraintsModel.unset(null, options);
      }
    },

    _deselectChildren: function (filtered, query_expr, filter_base) {
      _.each(filtered, function (filter) {
          var pathToCompare = _.pluck(query_expr.path || [], "id").concat(query_expr.id);
          if (filter.path && filter.path.length === pathToCompare.length) {
            var same = true;
            for (var i=0; same && i<pathToCompare.length; i++) {
              same = pathToCompare[i] === filter.path[i].id;
            }
            if (same) {
              delete filter_base[filter.id];
            }
          }
      });

      return filter_base;
    },

    allFilterConstraints: function () {
      var models = [],
          i;

      models = models.concat((this.collection.delegate && this.collection.delegate.models) || this.collection.models);

      for (i=0; i<models.length; i++) {
        var entries = models[i].get("entries");
        if (entries && entries.models && entries.models.length) {
          models = models.concat(entries.models);
        }
      }

      var filtered = _.reduce(models,
                           function(result, model) {
                             var query_expr = model.get("query_expr");
                             result[query_expr.id] = query_expr;
                             return result;
                           }, {});
      return filtered;
    },

    getConstraintsModelPath: function () {
      return "user.constraints";
    },

    getInput: function () {
      return this.model.input;
    },

    getConstraintsModel: function () {
      return this.getInput().submodel(this.getConstraintsModelPath());
    },

    getCollection: function () {
      var that = this,
          comparator;

      if (this.orderOptions) {
        comparator = Common.getCompareFunction(this.orderOptions.criteria, this.orderOptions.direction, this.orderOptions);
      }

      if (this.options.andAvailable && (!this.options.orderCriteria || this.options.orderCriteria == "COUNT"))  {
        comparator = function (a, b) {
          var orderCriteria = that.options.orderCriteria || that.options.application.models.search.get(["facets", that.options.facetName, "order_criteria"]),
              orderDirection = that.options.orderDirection || that.options.application.models.search.get(["facets", that.options.facetName, "order_direction"]),
              compareFunction = that.options.application.models.search.output.getFacetCompareFunction(orderCriteria, orderDirection);

          // only change sorting of COUNT-ordered filters
          if ("COUNT" === orderCriteria) {
            var aIsUserGenerated = a.get("isUserGenerated"),
                bIsUserGenerated = b.get("isUserGenerated"),
                aChecked = that.isFacetValueChecked(a),
                bChecked = that.isFacetValueChecked(b),
                aValue, bValue,
                originalResult;

            if (aIsUserGenerated !== bIsUserGenerated) {
              if (aChecked === bChecked) {
                if (aIsUserGenerated) {
                  return -1;
                }
                return 1;
              } else if (aChecked) {
                return -1;
              }
              return 1;
            }
            originalResult = compareFunction(a.get(), b.get());
            if (originalResult === 0) {
              aValue = a.get("value");
              bValue = b.get("value");
              return ("" + aValue).localeCompare(bValue, i18n.locale);
            }
            return originalResult;
          } else {
            return compareFunction(a.get(), b.get());
          }
        }
      }

      this.collectionCreated = true
      return new Search.FacetValueCollection(this.options.facetName, this.properties || this.options.elementTemplate.properties, 
          { comparator: comparator, entriesLevel: this.options.entriesLevel});
    },

    remove: function () {
      if (this.searchForm) {
        this.searchForm.remove();
        delete this.searchForm
      }
      if (this.userInputView && this.userInputView.remove) {
        this.userInputView.remove();
        delete this.userInputView;
      }
      if (this.treeView) {
        this.treeView.remove();
        delete this.treeView;
      }
      if (this.collection && this.collection.dispose && this.collectionCreated) {
        this.collection.dispose();
        delete this.collection;
      }
      if (this.constraintsModel && this.constraintsModel.dispose) {
        this.constraintsModel.dispose();
        delete this.constraintsModel;
      }
      delete this.$toggleEl;
      delete this.titleEl;
      delete this.groupView;
      ComponentBase.prototype.remove.apply(this, arguments);
    }
  });
  
  FacetTemplate.TreeView = TreeView.extend({

    initialize: function () {
      this.options.childrenPath = this.options.childrenPath || "entries";
      this.options.childViewConstructor = this.options.childViewConstructor || FacetTemplate.ValueView;
      this.options.labelid = this.options.labelid;
      if (this.options.addGroupRole !== false) {
        if (this.options.labelid) {
          this.el.setAttribute("aria-labelledby", this.options.labelid);
        }
      }
      TreeView.prototype.initialize.apply(this, arguments);
      this.listenTo(i18n, "change:locale", this.updateAnyModel);
    },

    addOne: function (model, collection, options) {
      options = options || {};
      if (this.options.showAll) {
        this.addAnyIfNotExists();
      }

      options = _.clone(options);
      options.at = options.at || collection && _.indexOf(collection.models, model);
      if (typeof options.at !== "undefined") options.at = options.at + 1;

      TreeView.prototype.addOne.apply(this, [model, collection, options]);
    },
    
    addAnyIfNotExists: function(options) {
      if (this.anyModel || this.options.disableEmptyFilter) {
        return;
      }
      var cid = _.uniqueId("c");

      var anyModel = new ReadOnlyTreeModel({id: cid, siblings: this.model});
      anyModel.isAny = true;
      this.anyModel = anyModel;
      this.updateAnyModel();

      this.addOne(this.anyModel, null, {at: 0}); 
    },

    getAnyModelName: function () {
      var anyModelName = i18n("All");
      if (this.options.emptyFilterName) {
        anyModelName = i18n(this.options.emptyFilterName);
      }
     return anyModelName;
    },

    updateAnyModel: function () {
      if (!this.anyModel) return;

      var anyModelName = this.getAnyModelName();

      this.anyModel.update({
        value: anyModelName,
        html: anyModelName 
      });
    },

    getWiring: function () {
      return this.options.wiring;
    },

    createEntryView: function (options) {
      options = _.clone(options);
      options.elementTemplate = this.options.elementTemplate;
      options.facetView = this.options.facetView;
      options.constraintsModel = this.options.constraintsModel;
      options.facetTitle = this.options.facetTitle,
      options.facetName = this.options.facetName,
      options.wiring = this.options.wiring;
      options.labelid = _.uniqueId("label");
      options.andAvailable = this.options.andAvailable;
      options.alwaysVisible = this.options.alwaysVisible;
      options.dropdownfilter = this.options.dropdownfilter;
      options.showCheckbox = this.options.showCheckbox;
      options.restoreFocus = this.options.restoreFocus;

      return TreeView.prototype.createEntryView.apply(this, [options]);
    }
  })

  FacetTemplate.TreeView.EntryView = TreeView.EntryView.extend({

    initialize: function () {
      TreeView.EntryView.prototype.initialize.apply(this, arguments);

      this.listenTo(this.options.constraintsModel, "change", function() {
        var childModel = this.getChildModel();
        if ((childModel && !this.childListView)
        || (!childModel && this.childListView)) {
          this.updateChildListView();
        }
      });
    },

    getChildModel: function () {
      if (!this.model) return;

      var isValueChecked = this.options.facetView.isFacetValueChecked(this.model);
      var childModel = this.model.get(this.options.childrenPath);
      if (isValueChecked && childModel && childModel.models && childModel.models.length > 0) {
        return childModel;
      }
    }

  });

  var AndSelectorView = ListView.extend({
    className: "dropdown-menu show mb-filter-dropdown",// role="menu" aria-labelledby="dropdownMenu">

    initialize: function () {
      this.options.childViewConstructor = this.options.childViewConstructor || AndSelectorView.LinkView;
      ListView.prototype.initialize.apply(this, arguments);
      var that = this;

      // handle events aborted by other actions
      this.listenTo(this.options.application, "actionHandled", this.remove);
      $(document).on("click." + this.cid, function (e) {
          if ($(e.target).closest(that.el).length) {
            return true;
          }
          that.remove();
      });
    },

    submit: function (e, traceContext, value, usedAutocomplete, options) {
      if (options && options.silent) return;
      var facetName = this.options.facetEntryView.options.facetName;

      this.options.facetEntryView.addOrUpdateUserGeneratedEntry(facetName, _.escape(value), {
          label: facetName,
          unparsed: value
      });
      this.remove();
    },

    remove: function () {
      $(document).off("click." + this.cid);
      ListView.prototype.remove.apply(this, arguments);
    },

    createEntryView: function (options) {
      var args = Array.prototype.slice.apply(arguments);

      options = options || {};
      options.facetEntryView = this.options.facetEntryView;
      args[0] = options;

      if (options.model.get("suggest")) {
        var userInputView = new SuggestTemplate.View({
            placeholder: "search",
            application: this.options.application,
            channel: this.options.application.models.search.wiring.channel,
            property: this.options.facetEntryView.options.facetName,
            sources: ["DOCUMENT_PROPERTY"],
            parentView: this,
            excludedFilterID: this.filterID,
            addQueryConstraints: true
        });
        userInputView.render();
        userInputView.el.setAttribute("aria-label", i18n("facet_suggest", { criteria: this.options.facetEntryView.options.facetView.getTitle() }));
        return userInputView;
      }

      return ListView.prototype.createEntryView.apply(this, args);
    }
  });
  AndSelectorView.LinkView = ComponentBase.extend({
    tagName: "a",

    events: {
      "click": "select"
    },

    createChildView: function () {
    },

    select: function (e) {
      this.options.facetEntryView.addOrUpdateUserGeneratedEntry(this.options.facetEntryView.options.facetName, this.model.get("value") || this.model.get("html"), this.model.get("query_expr"));
    },

    render: function () {
      if (!this.model) return this;

      this.el.tabindex = -1;
      this.el.innerHTML = this.model.get("html");
      return this;
    }
  });

  return FacetTemplate;
});

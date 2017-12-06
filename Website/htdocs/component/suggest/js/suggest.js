/*========================================================================
* $Id: searchform.js 73821 2013-07-17 11:51:32Z michael.biebl $
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

TABS source replaces category of the following sources:

  DOCUMENT_PROPERTY => no documents outside of current tab can be found

the following sources are not replaced:

  QUERY_TERM
  CONCEPT
*/

define([
    "api/v2/common",
    "underscore",
    "backbone",
    "component!base",
    "model/filtered_collection",
    "client/template",
    "client/templateregistry",
    "utils/dom",
    "utils/string",
    "jquery",
    "jquery-ui-autocomplete",
    "i18n/i18n"
  ],
  function(
    Common,
    _,
    Backbone,
    ComponentBase,
    FilteredCollection,
    Template,
    TemplateRegistry,
    dom,
    StringUtils,
    $,
    JQueryUI,
    i18n
  ) {

    var SuggestGroupTitleView = ComponentBase.extend({
      tagName: "li",
      className: "ui-autocomplete-category",

      initialize: function (options) {
        this.collection = this.model.collection;
        this.listenTo(this.collection, "remove", this.removeIfEmpty);
      },

      removeIfEmpty: function () {
        if (this.collection.models.length < 1) {
          this.remove();
        }
      },

      render: function () {
        var value = _.escape(this.options.customValue) || i18n("suggest_my_recent_searches");
        $(this.el).attr( "id",(_.escape(this.options.customValue) || i18n("suggest_my_recent_searches")).replace(/\s+/g, '') );
        $(this.el).attr( "role", "presentation" );
        this.el.innerHTML = '<i class="icon-time"></i> ' + value;
        return this;
      }

    });

    var SuggestEntryView = ComponentBase.extend({
        tagName: "li",

        render: function () {
          $(this.el).append(
            $('<a/>')
              .append(
                $('<span/>')
                  .addClass("pull-right")
                  .append(
                    $('<button/>')
                      .addClass("action mb-btn-no-decor")
                      .attr("tabindex","0")
                      .attr("title","Delete")
                      .attr("data-action-name","destroyModel")
                      .append(
                        $('<i/>')
                          .addClass("icon-trash")
                      )
                  )
              )
              .append( _.escape(this.model.get("query")) )
          );
          //$(this.el).attr("role","option");
          return this;
        }

    });

    var SuggestEntry = Backbone.Model.extend({

        initialize: function () {
          Backbone.Model.prototype.initialize.apply(this, arguments);
          this.id = this.get("query");
        },

        isValid: function () {
          return this.get("query");
        },

        getSuggestModel: function () {
          return {
            value: this.get("query"),
            label:  this.get("query"),
            model: this,
            category: i18n("suggest_my_recent_searches")
          }
        }

    });

    var SuggestCollection = Backbone.Collection.extend({
        model: SuggestEntry,

        initialize: function (models, options) {
          if (!options || !options.storageKey) {
            throw new Error("SuggestCollection options must contain a 'storageKey'!");
          }
          this.storageKey = options.storageKey;
          this.sync("read");

          Backbone.Collection.prototype.initialize.apply(this, arguments);
          this.listenTo(this, "add", this.save);
          this.listenTo(this, "update", this.save);
          this.listenTo(this, "remove", this.save);
        },

        getStorageKey: function () {
          return this.storageKey;
        },

        save: function () {
          this.sync("update");
        },

        add: function (models, options) {
          //models.query = _.escape(models.query);
          var that = this;

          options = options || {};
          options.at = options.at || 0;

          if (!_.isArray(models)) {
            models = [ models ];
          }

          models = _.filter(_.map(models, function (model) {
                return that._prepareModel(model, options);
            }), function (model) {
              return model.isValid();
          });

          this.remove(_.pluck(models, "id"), options);

          return Backbone.Collection.prototype.add.call(this, models, options);
        },

        sync: function (method) {
          var that = this;

          if (method === 'read') {
            try {
              var values = JSON.parse(localStorage[this.getStorageKey()]);
              _.forEach(values, function (value) {
                  that.add(value);
              });
            } catch (e) {
            }
          } else if (method === 'update') {
            localStorage[this.getStorageKey()] = JSON.stringify(this.toJSON());
          }
        }
    });

    SuggestCollection.getOrCreateForProperty = function (property) {
      this.instances = this.instances || [];
      this.instances[property] = this.instances[property] || new SuggestCollection(null, { storageKey: "querySuggestions_" + property });

      return this.instances[property];
    }

    var SuggestTemplate = Template.extend({

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      createView: function(options)  {
        var channelURL = this.attributeModel.get("service");
        var channel;
        if (channelURL) {
          var channels  = channelURL.split(/\s+/);
          channel = _.map(channels, function(channelURL) { return options.application.channels.channelFactory.createChannel(channelURL); });
        }
        else {
          channel = options.model.wiring.channel;
        }

        var source = this.attributeModel.get("source");
        var sources;
        var useOld = false;

        var recentQueriesActivated = false;
        var searchInTabsActivated = true;

        var suggest_timeout = this.get("suggest-timeout");

        if (source) {
          sources = source.split(/\s+/);
          recentQueriesActivated = _.contains(sources, "RECENT_QUERY");
          searchInTabsActivated = _.contains(sources, "TABS");
          sources = _.without(sources, "RECENT_QUERY","TABS", "EXTERNAL", "CONCEPT");
          useOld = true;
        }

        var initialSource = this.attributeModel.get("initial-source");
        var initialSources;
        var initialRecentQueriesActivated = recentQueriesActivated;
        var initialSearchInTabsActivated = searchInTabsActivated;

        if (initialSource) {
          initialSources = initialSource.split(/\s+/);
          initialRecentQueriesActivated = _.contains(initialSources, "RECENT_QUERY");
          initialSearchInTabsActivated = _.contains(initialSources, "TABS");
          initialSources = _.without(initialSources, "RECENT_QUERY","TABS", "EXTERNAL", "CONCEPT");
          useOld = true;
        }

        var grouped = this.attributeModel.get("grouped");
        var initialGrouped = this.attributeModel.get("initial-grouped");
        if (grouped) {
          grouped = this.attributeModel.get("grouped") === "true";
        }
        if (initialGrouped) {
          initialGrouped = this.attributeModel.get("initial-grouped") === "true";
        } else {
          initialGrouped = grouped;
        }

        var count = this.attributeModel.get("count");
        if (count) {
          count = parseInt(count);
          if (isNaN(count)) {
            count = 4;
          }
        } else {
          count = 4;
        }

        var propertyConstraint = this.attributeModel.get("property-constraint");
        if (propertyConstraint && _.isString(propertyConstraint)) {
          propertyConstraint = {"unparsed": propertyConstraint};
        }

		    var sourceIdPattern = this.attributeModel.get("source-id-pattern");
        var initialSourceIdPattern = this.attributeModel.get("initial-source-id-pattern");

        if (sourceIdPattern) {
          if (!useOld) {
            var recentQueriesActivated = new RegExp("^(" + sourceIdPattern+ ")$").test("recent_query");
            var searchInTabsActivated = new RegExp("^(" + sourceIdPattern+ ")$").test("tabs");
          } else {
            _.each(sources, function(src) {
              sourceIdPattern = sourceIdPattern.concat("|" + src.toLowerCase());
            });
          }
        }
        else {
          if (sourceIdPattern !== null) {
            sourceIdPattern = "";
            searchInTabsActivated = false;
          } else {
            sourceIdPattern = "document_property";
            searchInTabsActivated = true;
          }
        }

        if (initialSourceIdPattern) {
          if (!useOld) {
            var initialRecentQueriesActivated = new RegExp("^(" + initialSourceIdPattern+ ")$").test("recent_query");
            var initialSearchInTabsActivated = new RegExp("^(" + initialSourceIdPattern+ ")$").test("tabs");
          } else {
            _.each(initialSources, function(src) {
              initialSourceIdPattern = initialSourceIdPattern.concat("|" + src.toLowerCase());
            });
          }
        }
        else {
          if (initialSourceIdPattern !== null) {
            initialRecentQueriesActivated = false;
            initialSourceIdPattern = "";
          } else {
            initialRecentQueriesActivated = true;
            initialSourceIdPattern = "";
          }
        }

        var headlineTranslation = {};
        if ( this.get("source-id-document_property-title") ) headlineTranslation.DOCUMENT_PROPERTY = { value: this.get("source-id-document_property-title") };
        if ( this.get("source-id-recent-query-title") ) headlineTranslation.RECENT_QUERY = { value: this.get("source-id-recent-query-title") };
        if ( this.get("source-id-words-and-terms-title") ) headlineTranslation.WordsandTerms = { value: this.get("source-id-words-and-terms-title") };
        if ( this.get("source-id-popularsearches-title") ) headlineTranslation.PopularSearches = { value: this.get("source-id-popularsearches-title") };

        var defaultTabTitle = this.attributeModel.get("default-tab-title");
        var sourceIdOrder = this.get("source-id-order");
        var initialSourceIdOrder = this.get("initial-source-id-order");

        var property = this.attributeModel.get("property");
        var showOnfocus = this.get("show-onfocus");

        var view = new SuggestView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el,
              channel: channel,
              property: property,
              recentQueriesActivated: recentQueriesActivated,
              grouped: grouped,
              suggest_timeout: suggest_timeout,
              placeholder: this.attributeModel.get("placeholder"),
              title: this.attributeModel.get("title"),
              ariaLabel: this.attributeModel.get("aria-label"),
              showOnfocus: showOnfocus,
              propertyConstraint: propertyConstraint,
              count: count,
              source: source,
              sources: sources,
              headlineTranslation: headlineTranslation,
              defaultTabTitle: defaultTabTitle,
              sourceIdPattern: sourceIdPattern,
              initialSourceIdPattern: initialSourceIdPattern,
              sourceIdOrder: sourceIdOrder,
              initialSourceIdOrder: initialSourceIdOrder,
              initialSource: initialSource,
              initialSources: initialSources,
              initialRecentQueriesActivated: initialRecentQueriesActivated,
              searchInTabsActivated: searchInTabsActivated,
              initialSearchInTabsActivated: initialSearchInTabsActivated,
              initialGrouped: initialGrouped,
              disabled: this.attributeModel.get("disabled") === "true"
        }));
        this.instances.push(view);
        return view;
      },

      schema: new Template.Schema({
        attributes: {
          "source-id-pattern": {
            type: "string",
            title: "editor_suggest_source_id_pattern",
            "default": "document_propertytabs"
          },
          "initial-source-id-pattern": {
            type: "string",
            title: "editor_suggest_initial_source_id_pattern",
            "default": "recent_query"
          },
          property: {
            type: "string",
            title: "editor_suggest_property",
            required: true
          },
          "property-constraint": {
            type: "QueryExpr",
            title: "editor_suggest_property_constraint"
          },
          "source-id-order": {
            type: "string",
            title: "editor_suggest_source_id_order",
          },
          "initial-source-id-order": {
            type: "string",
            title: "editor_suggest_initial_source_id_order",
          },
          "default-tab-title": {
            type: "string",
            title: "editor_suggest_default_tab_title",
          },
          count: {
            type: "int",
            title: "editor_suggest_count",
            required: false
          },
          service: {
            type: "string",
            title: "editor_suggest_service",
            required: false
          },
          suggest_timeout: {
            type: "int",
            title: "editor_suggest_timeout",
            required: false
          },
          "show-onfocus": {
            type: "boolean",
            title: "editor_suggest_show_onfocus",
            defaultValue: false,
            visible: false
          },
          grouped: {
            type: "boolean",
            title: "editor_suggest_categoryGroup",
            "default": true,
            defaultValue: true
          },
          "initial-grouped": {
            type: "boolean",
            title: "editor_suggest_categoryInitialGroup",
            "default": true,
            defaultValue: true,
            visible: false
          },
          disabled: {
            type: "boolean",
            title: "editor_suggest_disabled",
            required: false,
            defaultValue: false
          },
        }
      }),

      hasContent: function() { return false; },

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

    var SuggestView = ComponentBase.extend({

      tagName: "input",

      events: function () {
        return _.extend({},
          ComponentBase.prototype.events,
          {
            "keypress": "handleKeypress",
            "change": "updateSilently",
            "blur": "updateSilently"
          });
      },

      updateSilently: function (event, traceContext) {
        this._triggerSelect(event, null, traceContext, { silent: true });
      },

      _triggerSelect: function(event, data, traceContext, options) {
        options = options || {};

        var that = this;
        var value = _.escape(that.el.value);
        var usedAutocomplete = !!data;

        if (data && data.item && data.item.value) {
          value = data.item.value;
          that.el.value = value;
        }
        if (!options.silent && that.options.parentView && that.options.parentView.submit) {
          that.submittedValue = value;

          var selectedTab = this.options.application.models.tabs.getSelectedTab();
          if (selectedTab && data && data.item && data.item.category != selectedTab.id ) {
            options.changeViewValue = data.item.tabID;
          }

          that.options.parentView.submit(event, traceContext, that.submittedValue, usedAutocomplete, options);
        }
      },

      initialize: function() {
        ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));

        if (!this.el.name && this.options.property) {
          this.el.name = this.options.property;
        }

        var that = this;

        var placeholderEl = document.createElement("DIV");
        placeholderEl.className = "autocomplete-result-placeholder";
        //$(placeholderEl).insertAfter(this.el);

        var appendToEl = "";
        if (this.options.appendTo && typeof this.options.appendTo !== 'undefined') {
          appendToEl = this.options.appendTo;
        } else {
          //appendToEl = placeholderEl;
          appendToEl =  this.$el.parent();
        }

        this.$el.autocomplete({
          source: _.bind(this._autocompleteSource, this),
          appendTo: appendToEl,
          position: { my: "left top", at: "left bottom", collision: "none" },
          minLength: 0,
          messages: {
            noResults: i18n("suggest_no_suggestions"),
            results: function (amount) {
              if (amount === 1) return i18n("suggest_result_singular");
              return i18n("suggest_result_plural", [amount]);
            }
          }
        }).focus(function(){
          that.showAutocomplete();
        });

        this.$el.on( "autocompleteselect", _.bind(this._triggerSelect, this));
        this.$el.on( "autocompletefocus", function( event, ui ) {
          that.submittedValue = null;
        });

        this.options.placeholder = this.options.placeholder && i18n(this.options.placeholder);
        this.options.title = this.options.title && i18n(this.options.title);
        this.options.ariaLabel = this.options.ariaLabel && i18n(this.options.ariaLabel);

        this.$el.data("uiAutocomplete")._renderItemData = _.bind(this._renderItemData, this);
        this.$el.data("uiAutocomplete")._renderItemOwn = _.bind(this._renderItemOwn, this);

        this.originalRenderMenu = this.$el.data("uiAutocomplete")._renderMenu;
        if (this.options.placeholder) {
          this.el.setAttribute("placeholder", this.options.placeholder);
        }
        if (this.options.title) {
          this.el.setAttribute("title", this.options.title);
        }

        if (this.options.ariaLabel) {
          this.el.setAttribute("aria-label", this.options.ariaLabel);
        }

        this.channel = this.options.channel;
        this.property = this.options.property || "title";
        this.options.count = this.options.count || 5;

        var user_useConstraintsOnly = this.el.getAttribute("data-use-constraints-only");
        if (user_useConstraintsOnly == "false") {
          this.options.useConstraintsOnly = false;
        }

        this.initializeRecentQueries();

        if (document.activeElement === this.el){
            this.showAutocomplete();
        }
      },

      showAutocomplete: function() {
        if (this.options.showOnfocus){
          this.$el.autocomplete("enable");
          this.$el.autocomplete("search", this.$el.val());
        }
      },

      initializeRecentQueries: function () {
        if (this.options.recentQueriesActivated || this.options.initialRecentQueriesActivated) {
          var querySuggestions = SuggestCollection.getOrCreateForProperty(this.property),
          filteredSuggestions = new FilteredCollection([], {
              delegate: querySuggestions,
              filter: function (models) {
                return models.slice(0, 5);
              }
          });

          this.recentQueries = filteredSuggestions;

          this.listenTo(this.model.input, "change", this.addRecentQuery);
        }
      },

      addRecentQuery: function () {
        var userQuery = this.options.application.getUnparsedUserQuery();
        if (userQuery) {
          if (this.options.recentQueriesActivated || this.options.initialRecentQueriesActivated) {
            this.recentQueries.delegate.add({ query: userQuery });
          }
        }
      },

      doInstrument: function (handlerName) {
        if (/handleKeypress/i.test(handlerName)) return false;

        return ComponentBase.prototype.doInstrument.apply(this, arguments);
      },

      setEditable: function () {
      },

      handleKeypress: function (e, traceContext) {

        if (e.keyCode === 13) {
          this.$el.autocomplete("close");
          this.$el.data("uiAutocomplete").disable();
          this._triggerSelect(e, null, traceContext);
          e.preventDefault();
          return false;
        }

        this.$el.autocomplete("enable");
      },

      getCategory: function (categoryName) {
        var customName = this.options.headlineTranslation && this.options.headlineTranslation[categoryName.replace(/\s+/g, '')] &&  this.options.headlineTranslation[categoryName.replace(/\s+/g, '')].value
        if (/DOCUMENT_PROPERTY/.test(categoryName)) {
          return {
            icon: "icon-file",
            name: i18n("editor_suggest_property"),
            customName: customName
          }
        }
        if (categoryName === "Popular Searches") {
          return {
            icon: "icon-bar-chart",
            name: i18n("suggest_popular_searches"),
            customName: customName
          }
        }
        if (categoryName === "Words and Terms") {
          return {
            icon: "icon-book",
            name: i18n("suggest_terms_and_words"),
            customName: customName
          }
        }
        return {
          icon: "",
          name: categoryName
        }
      },

      _renderMenu: function( ul, items ) {
        var that = this,
            currentCategory = "",
            categoryIndex = 0;

        $.each( items, function( index, item ) {
            var li,
                category = that.getCategory(item.originalCategory || item.category);

            if ( item.category != currentCategory ) {
              if (item.model) {
                categoryIndex++;
                var escapedName = _.escape( (that.options.headlineTranslation["RECENT_QUERY"] && that.options.headlineTranslation["RECENT_QUERY"].value) || item.category || category.name);
                var newLi = new SuggestGroupTitleView({ model: item.model, application: that.options.application, index: categoryIndex, customValue: escapedName}).render().$el.appendTo(ul);
              } else {
                categoryIndex++;
                var escapedName = _.escape(category.customName || item.category || category.name);
                var myLi = "<li role='presentation' class='ui-autocomplete-category' id='" + escapedName.replace(/\s+/g, '_') + "'><span class='ui-autocomplete-category-head'><i class='" + category.icon + "'></i> " + escapedName + "</span></li>";
                var myLi = $(myLi);

                var myUl = ul.append(myLi);
              }
              currentCategory = item.category;
            } else {
              if (item.model) {
                var escapedName = _.escape( (that.options.headlineTranslation["RECENT_QUERY"] && that.options.headlineTranslation["RECENT_QUERY"].value) || item.category || category.name);
              } else {
                var escapedName = _.escape(category.customName || item.category || category.name);
              }
            }

            li = that._renderItemData( ul, item );
            if ( item.category ) {
              li.attr( "aria-describedby", escapedName.replace(/\s+/g, '') );
            }

        });
        return ul
      },

      _renderItemData: function (ul, item) {
        return this._renderItemOwn( ul, item ).data( "ui-autocomplete-item", item );
      },

      _renderItemOwn: function (ul, item) {
        var category = this.getCategory(item.originalCategory || item.category);
        var escapedName = _.escape(category.customName || item.category || category.name).replace(/\s+/g, '');
        if (item.model) {
          return new SuggestEntryView({ model: item.model, application: this.options.application}).render().$el.appendTo(ul);
        } else {
          return $("<li aria-describedby='"+ escapedName +"'><a>" + item.label + "</a></li>").appendTo(ul);
          //return $("<li role='presentation' aria-describedby='"+ escapedName +"'><span>" + item.label + "</span></li>").appendTo(ul);
        }
      },

      _autocompleteSource: function(request, responseDone) {
        if (!this.$el.is(":visible")) return;
        if (!this.$el.is(":focus")) return;

        var isInitial = !request.term;
        var renderMenuFunction = this.originalRenderMenu;

        if ((isInitial && this.options.initialGrouped) || (!isInitial && this.options.grouped)) {
          renderMenuFunction = _.bind(this._renderMenu, this)
        }
        this.$el.data("uiAutocomplete")._renderMenu = renderMenuFunction;

        var that = this;
        if (this.options.disabled) {
          return;
        }

        if(!responseDone) return;

        var originalResponseDone = responseDone;
        responseDone = function (data) {

          var data_tabs = [];
          var data_recentQueries = [];
          var data_popularSearches = [];
          var data_wordsAndTerms = [];
          var data_documentProperty = [];

          _.forEach(data, function (entry) {
                if (entry.category === "DOCUMENT_PROPERTY") {
                  entry.category = entry.category || "Default";
                }
            });

            if ((isInitial && that.options.initialSearchInTabsActivated) || (!isInitial && that.options.searchInTabsActivated)) {
              var originalTabModels = that.options.application.models.tabs.models;
              var activeTabModel = that.options.application.models.tabs.getSelectedTab();
              var tabModels = [];

              if (data && data.length) {
                _.each(originalTabModels, function(tab) {
                  if(tab.get("name") != activeTabModel.get("name")) {
                    tabModels.push(tab);
                  }
                });
              } else {
                tabModels = originalTabModels;
              }

              if (that.el.value.length > 0) {
                var tabs = _.map(tabModels, function(tab) {
                  var valueToBeDisplayed = _.escape( $(that.el).val() );
                  var label = valueToBeDisplayed;

                  return {
                    category: tab.get("name"),
                    label: label,
                    score: 1000,
                    tabID: tab.id || tab.get("name"),
                    value: that.el.value,
                    originalCategory: "Tabs"
                  }
                })
              }

              if (tabs) {
                data_tabs = tabs;
              }
            }

            // rewrite original category to selected tab
            _.each(data, function (suggestion) {
              if (suggestion.category === "DOCUMENT_PROPERTY") {
                var selectedTabName = that.options.application.models.tabs.getSelectedTab() && that.options.application.models.tabs.getSelectedTab().get("name") || that.options.defaultTabTitle || "Default";
                suggestion.originalCategory = suggestion.category;
                suggestion.category = selectedTabName;
              }
            });

            var term = request.query;
            var recentQuerys = false;

            if ((isInitial && that.options.initialRecentQueriesActivated) || (!isInitial && that.options.recentQueriesActivated)) {
              if (that.recentQueries) {
                that.recentQueries.setFilter(function (models) {
                    return _.filter(models, function (model) {
                        return new RegExp(".*" + term.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + ".*", "i").test( model.get("query") );
                    }).slice(0, 5);
                });
                recentQuerys = true;
              }
            }

            _.defer(function () {

              if (recentQuerys) {
                data_recentQueries = _.map(that.recentQueries.models, function (suggestEntry) {
                  return suggestEntry.getSuggestModel();
                });

                var escapedValue = _.escape(that.el.value)
                _.each(data_recentQueries, function(obj) {

                  if (that.el.value) {
                    function escapeRegExp(string){
                      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    }
                    var re = new RegExp(escapeRegExp(escapedValue), "gi");
                    obj.label = StringUtils.addHighlights(obj.value, re);
                  } else {
                    obj.label = _.escape(obj.value);
                  }

                });
              }

              var selectedTab = that.options.application.models.tabs.getSelectedTab() && that.options.application.models.tabs.getSelectedTab().get("name") || "";
              data_tabs = _.sortBy(data_tabs, function(tab) {
                return tab.category != selectedTab
              })

              var result = [];

              if ( (data && (data.length > 0)) && (data_tabs && (data_tabs.length > 0)) ) {
                var activeTabModel = that.options.application.models.tabs.getSelectedTab();
                var valueToBeDisplayed = _.escape( $(that.el).val() );
                var label = valueToBeDisplayed;

                var flag = false;
                _.each(data, function(data) {  if (data.category == activeTabModel.get("name")) { flag = true; } });

                if (!flag) {
                  data.push({
                    category: (activeTabModel && activeTabModel.get("name")) || that.options.defaultTabTitle || "Default",
                    label: label,
                    score: 1000,
                    tabID: (activeTabModel && activeTabModel.id) || that.options.defaultTabTitle || "Default",
                    value: valueToBeDisplayed
                  });
                }
              }

              _.each(data, function(val) {
                if (val.category == "Words and Terms") {
                  data_wordsAndTerms.push(val);
                } else if (val.category == "Popular Searches") {
                  data_popularSearches.push(val);
                } else {
                  data_documentProperty.push(val);
                }
              });

              function getOrderedResults (source, isPattern) {
                if(isPattern) {
                  _.each(source, function(src) {
                    switch(src) {
                      case "document_property":
                      result = _.union(result, data_documentProperty);
                      break;
                      case "popularsearches":
                      result = _.union(result, data_popularSearches);
                      break;
                      case "words_and_terms":
                      result = _.union(result, data_wordsAndTerms);
                      break;
                      case "recent_query":
                      result = _.union(result, data_recentQueries);
                      break;
                      case "tabs":
                      result = _.union(result, data_tabs);
                      break;
                    }
                  });
                } else {
                  _.each(source, function(src) {
                    switch(src) {
                      case "DOCUMENT_PROPERTY":
                      result = _.union(result, data);
                      break;
                      case "TABS":
                      result = _.union(result, data_tabs);
                      break;
                      case "RECENT_QUERY":
                      result = _.union(result, data_recentQueries);
                      break;
                      default:
                      result = _.union(result, data);
                      break;
                    }
                  });
                }
                return result;
              }

              var orderedSources = that.options.source && that.options.source.split(/\s+/) || false;
              var orderedInitialSources = that.options.initialSource && that.options.initialSource.split(/\s+/) || false;

              var orderedSourceIdPattern = (that.options.sourceIdOrder && that.options.sourceIdOrder.split(",")) || false;
              var orderedInitialSourceIdPattern = ( that.options.initialSourceIdOrder && that.options.initialSourceIdOrder.split(",") ) || false;

              if (isInitial) {
                if (orderedInitialSourceIdPattern || orderedInitialSources) {
                  if (orderedInitialSourceIdPattern) var orderInitSource = true;
                  result = getOrderedResults(orderedInitialSourceIdPattern || orderedInitialSources, orderInitSource);
                } else {
                  result = getOrderedResults("document_property,popularsearches,recent_query".split(","), true);
                }
              } else {
                if (orderedSourceIdPattern || orderedSources) {
                  if (orderedSourceIdPattern) var orderSource = true;
                  result = getOrderedResults(orderedSourceIdPattern || orderedSources, orderSource);
                } else {
                  result = getOrderedResults("document_property,popularsearches,words_and_terms,recent_query,tabs".split(","), true);
                }
              }

              data = result;
              originalResponseDone(data);
            });

          }

        var options = this.options;

        if (options.suggest_timeout) {
          var request = {query: request.term, property: this.property, timeout_in_seconds: options.suggest_timeout};
        } else {
          var request = {query: request.term, property: this.property};
        }

        if(options.application.models.search.get("name")){
          request.name = options.application.models.search.get("name");
        }

        if (options.count && _.isNumber(options.count))
          request.count = options.count;

        //TODO filteredfacet
        if (options.sources) {
          request.source = options.sources;
        }

        var constraints = [];
        this._addQuery(constraints, options.propertyConstraint);
        this._addQuery(constraints, options.application.models.search.get("source_context.constraints"), true);

        if (options.addQueryConstraints) {
          this._addQuery(constraints, this._getSearchConstraint(options.useConstraintsOnly));
        }

        if (constraints.length > 0) {
          request.property_constraint = { and: constraints };
        }

        if (options.sourceIdPattern) {
          request.source_id_pattern = options.sourceIdPattern;
        }

        if (isInitial) {
          if (options.initialSourceIdPattern) {
            request.source_id_pattern = options.initialSourceIdPattern;
          } else {
            request.source_id_pattern = "";
            return;
          }
        }

        var that = this;

        var suggestInput = options.application.api.suggest.createInput(request);
        if (request.source_id_pattern === "recent_query" || (request.source && request.source.length === 0 && options.initialRecentQueriesActivated)) {
          responseDone([]);
        } else {
          options.application.api.suggest.call(this.channel,
              suggestInput.toJSON(),
              function(res) {
                if (res) {
                  if (!res)
                    return;
                  var results = _.values(res.results) || [];
                  _.each(results, function (result) {
                      if (result.source == "DOCUMENT_PROPERTY") {
                        result.temp_category = result.source;
                      }
                      else if (result.source_name) {
                        result.temp_category = result.source_name;
                      }
                      // result.source = result.source + "_" + result.source_name;
                  })
                  results.sort(function (a, b) {
                      if (a.source === b.source) {
                        return a.score - b.score;
                      } else if (a.source < b.source) {
                        return -1;
                      }
                      return 1;
                  });
                  var sourceCount = 0;
                  var source;
                  var source_id;
                  var suggestResult = [];
                  for (var i = 0; i < results.length; ++i) {
                    var result = results[i];
                    //TODO
                    if (source !== result.source || source_id !== result.source_id) {
                      sourceCount = 0;
                      source = result.source;
                      source_id = result.source_id;
                    }
                    sourceCount++;

                    if (sourceCount > options.count) {
                      continue;
                    }

                    suggestResult.push({value: result.value, label: result.html, category: result.temp_category, score: result.score });
                  }
                    responseDone(suggestResult);
                }
                else
                  responseDone([]);
              });
        }
      },

      _getSearchConstraint: function (constraintsOnly) {
        var input;
        if (this.options.parentView && this.options.parentView.options && this.options.parentView.options.outerModel) {
          input = this.options.parentView.options.outerModel.input.get();
        }
        else if (this.options.model && this.options.model.input) {
          input = this.options.model.input.get();
        }
        else {
          input = this.options.application.models.search.input.get();
        }
        if (!input) return;

        var queries = [];
        if (!constraintsOnly) this._addQuery(queries, input.query);
        if (input.user) {
          if (!constraintsOnly) this._addQuery(queries, input.user.query);
          this._addQuery(queries, input.user.constraints, true);
        }

        if (queries.length > 0) {
          return { and: queries };
        }
      },

      _addQuery: function (queries, query, transformPropertyList) {
        if (!query) return;

        if (transformPropertyList && !_.isArray(query)) {
          query = _.clone(query);
          delete query[this.options.excludedFilterID];
          query = Common.propertyListToArray(query);
          _.each(query, function (query) {
            query.filter_base = Common.propertyListToArray(query.filter_base);
            query.filtered = Common.propertyListToArray(query.filtered);
          });
          query = { and: query };
        }

        queries.push(query);
      },

      change: function (model, options) {
      },

      clear: function () {
        this.el.value = "";
      },

      setValue: function (value) {
        value = value || "";
        this.el.value = value;
      },

      computing: function () {
      },

      remove: function () {
        this.$el.off( "autocompleteselect" );
        this.$el.off( "autocompletefocus" );
        try {
          this.$el.autocomplete("destroy");
        } catch (e) {
          /* ignore */
        }
        ComponentBase.prototype.remove.apply(this, arguments);
      }
  });

  SuggestTemplate.View = SuggestView;

  return SuggestTemplate;
  }
);

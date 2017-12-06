/*========================================================================
* $Id: tabs.js 89180 2016-03-07 09:02:17Z michael.morisak $
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
 *
 * Component for displaying tabs from profile as well as tabs of datasources.
 *
 * Models: Tabs, userSourceInfo.sources.data_sources, search.source_context.constraints & profile
 *
 */

define([
    "client/application",
    "api/v2/search",
    "client/template",
    "client/views/list",
    "client/templateregistry",
    "utils/dom",
    "utils/localStorage",
    "component!mustache",
    "i18n/i18n",
    "utils/clone",
    "utils/jsonpath",
    "underscore",
    "jquery",
    "utils/inplace-edit"
  ], function(
    Application,
    Search,
    Template,
    ListView,
    TemplateRegistry,
    dom,
    localStorage,
    MustacheTemplate,
    i18n,
    deepClone,
    JSONPath,
    _,
    $
  ) {
    var TabConfig = Template.extend({
      schema: new Template.Schema({
        inputAttributes: {
          name: {
            title: "name",
            type: "string"
          },
          constraint: {
            title: "constraint",
            type: "QueryExpr"
          },
          options: {
            title: "options",
            type: "SearchRequest"
          }
        }
      }),

      hasContent: function () {
        return false;
      }
    });

    var Tabs = Template.extend({
      schema: new Template.Schema({
        inputAttributes: {
          tabs: {
            title: "tabs",
            type: "reference",
            repeated: true,
            reference: "children" 
          },
          datasourcetabs: {
            title: "editor_tabs_datasourcetabs",
            type: "boolean",
            "default": false
          },
          editable: {
            title: "editor_tabs_editable_label",
            type: "boolean",
            "default": false
          }
        }
      }),

      initialize: function () {
        var tabs = this.application.models.tabs;

        _.each(this.node.children, function (child) {
          if (child.el.getAttribute("data-tabconfig") === "true") {
            var options = new TabConfig(child.el, child).get();
            delete options.tabConfig;
            options.id = options.name;
            options.request = options.options;
            delete options.options;

            tabs.add(options);
          }
        });

        this.tabconfigs = _.filter(this.node.children, function (child) {
          return child.el.getAttribute("data-tabconfig") === "true";
        });
        this.node.children = _.filter(this.node.children, function (child) {
          return child.el.getAttribute("data-tabconfig") !== "true";
        });

        Template.prototype.initialize.apply(this, arguments);
      },

      createView: function(options)  {
        options = _.extend(
          this.attributeModel.getCamelCase(),
          options,
          {
            elementTemplate: this.node.children[0].template,
            datasourcetabs: this.get("datasourcetabs"),
            editable: this.get("editable")
          }
        );
        delete options.node;

        return Template.prototype.createView.apply(this, [options]);
      },

      getContentSchema: function() {
        return  {
          type: "template"
        };
      },

      hasContent: function () {
        return true;
      },

      remove: function () {
        if (this.addButton) {
          if (this.addButton.parentNode) {
            this.addButton.parentNode.removeChild(this.addButton);
          }
          delete this.addButton;
        }
        var tabs = this.application.models.tabs;
        _.each(this.tabconfigs, function (child) {
          var options = new TabConfig(child.el, child).get();
          delete options.tabConfig;
          options.id = options.name;

          tabs.remove(options);
        });
        Template.prototype.remove.apply(this, arguments);
      }
    });

    Tabs.View = ListView.extend({

        defaultOptions: _.extend({}, ListView.prototype.defaultOptions, {
          role: "tablist",
          entryRole: "presentation"
        }),

        initialize: function () {
          ListView.prototype.initialize.apply(this, arguments);

          if (this.el.getAttribute("role")) {
            this.$el.addClass("mb-role");
          }

          this.listenTo(this.options.application.models.profile, "change", this.profileUpdated);
          this.profileUpdated();

          if (this.options.editable) {
            this.addButton = $('<button class="action mb-btn-no-decor" data-action-object="{&quot;addTab&quot;: {}}" title="' + i18n("create_search_tab") + '" data-enable-if-model-valid="search"><i class="icon-plus"></i></button>')[0]
            this.$el.after(this.addButton);

            this.registerActions();

            var application = this.options.application,
                tabs = this.options.application.models.tabs;

            if (!application.parentApplication) {
              if (!tabs.comparator) {
                tabs.comparator = function (model) {
                  return model.sortIndex;
                };

                tabs._namePrefix = i18n("search_tab", [""]);

                tabs.sort = function () {
                  _.forEach(this.models, function (model, index) {
                      var sortIndex = index;
                      if (model.get("customTab")) {
                        sortIndex += 1000000;
                      }
                      model.sortIndex = sortIndex;
                  });

                  this.constructor.prototype.sort.apply(this, arguments);
                };

                tabs.sort();

                tabs._changed = function (model) {
                  var changedAttributes = model && model.changedAttributes();

                  if (changedAttributes && changedAttributes.name) {
                    var previousName = model.previous("name"),
                        selectedTabName = this.constraintsModel.get("view.name");

                    if (previousName === selectedTabName) {
                      this.constraintsModel.set("view.name", changedAttributes.name);
                    }
                  }
                };

                tabs.listenTo(tabs, "change", tabs._changed);
              }

              application.loadCustomTabs();

              if (!application._registeredTabUpdateHandlers) {
                application.listenTo(tabs, "change", application.tabsUpdated);
                application.listenTo(tabs, "add", application.tabsUpdated);
                application.listenTo(tabs, "remove", application.tabsUpdated);
                application._registeredTabUpdateHandlers = true;
              }
            }
          }
        },

        profileUpdated: function () {
          var application = this.options.application,
              profile = application.models.profile,
              model = this.model,
              activeTabName,
              activeSearchSource;
            
          if (!profile) return;

          activeTabName = profile.get("default_search_source");
          if (profile.get("search_sources") && profile.get("search_sources").length) {
            activeSearchSource = profile.get("search_sources[0]");
          }
          _.each(profile && profile.get("search_sources"), function (search_source, index) {
              model.add({
                id: search_source.name,
                name: search_source.name,
                constraint: search_source.constraint,
                request: search_source,
                _dataSourceTab: false
              }, {at: index, merge: true});
              if (search_source.name === activeTabName) {
                activeSearchSource = search_source;  
              }
          });
          if (activeSearchSource) {
            application.setView(activeSearchSource.name, activeSearchSource, null, { silent: true});
          }       

          if (profile.get("show_data_source_tabs")) {
            if (this._listeningForUserSourceInfoChanges) return;
            
            this._listeningForUserSourceInfoChanges = true;
            this.sourceContextConstraints = application.models.search.input.submodel("source_context.constraints");
            this.dataSources = application.models.userSourceInfo.submodel("sources.data_sources");

            if (this.options.datasourcetabs) {
              this.listenTo(this.sourceContextConstraints, "change", this.updateTabs);
              this.listenTo(this.dataSources.treeModel || this.dataSources, "change", this.updateTabs);
            }
          } else {
            if (this._listeningForUserSourceInfoChanges) {
              this.stopListening(this.sourceContextConstraints);
              this.stopListening(this.dataSources.treeModel || this.dataSources);
              delete this._listeningForUserSourceInfoChanges;
            }
            this.removeDataSourceTabs();
          }
          this.updateTabs();
          
          model.update();
        },

        removeDataSourceTabs: function () {
          var selectedDataSourceIds = this.getSelectedDataSourceIds();
          var selectedDataSources = this.getSelectedDataSources(selectedDataSourceIds);
          var isEverythingTabNeeded = this.isEverythingTabNeeded(selectedDataSources);

          var toRemove = this.model.filter(function (tab) {
                return tab.isDataSourceTab() && !(isEverythingTabNeeded && tab.id == "Everything");
              });

          if (toRemove && toRemove.length > 0) {
            this.model.remove(toRemove);
          }
        },

        updateTabs: function () {
          var selectedDataSourceIds = this.getSelectedDataSourceIds();
          var selectedDataSources = this.getSelectedDataSources(selectedDataSourceIds);
          this.addEverythingTabIfNeeded(selectedDataSources);

          var selectedDataSourceNames = _.map(selectedDataSources, function (dataSource) {
            return dataSource.name;
          });

          var dataSourceTabs = _.filter(this.model.models, function (tab) { return tab.get("_dataSourceTab"); });
          var dataSourceTabIds = _.pluck(dataSourceTabs, "id");

          var change = selectedDataSourceNames.length != dataSourceTabIds.length || _.intersection(selectedDataSourceNames, dataSourceTabIds).length !== selectedDataSourceNames.length;
          
          if (change) {
            var toRemove = _.difference(dataSourceTabIds, selectedDataSourceNames);
            var toAdd = _.difference(selectedDataSourceNames, dataSourceTabIds);
            this.model.remove(toRemove);

            this.model.add(_.map(
                _.filter(selectedDataSources, function (dataSource) { return _.indexOf(toAdd, dataSource.name) >= 0; }),
              function (dataSource) {
              return {
                id: dataSource.name,
                _dataSourceTab: true,
                name: dataSource.name,
                constraint: dataSource.query_expr
              };
            }));
          }

          if (this.el.getAttribute("tabindex")) {
            if (!!this.model.length) {
              this.$el.addClass("mb-role");
              this.el.setAttribute("tabindex", "0");
            } else {
              this.$el.removeClass("mb-role");
              this.el.setAttribute("tabindex", "-1");
            }
          }
        },

        isEverythingTabNeeded: function(selectedDataSources) {
          if (this.options.editable || (selectedDataSources && selectedDataSources.length)) {
              return !this.model.find(function (tab) {
                return !tab.isDataSourceTab() && !tab.isCustomTab();
              });
          }
          return false;
        },
      
        /*
         * add Everything tab if:
         *  - there are datasource tabs and no other tabs
         */
        addEverythingTabIfNeeded: function (selectedDataSources) {
          selectedDataSources = selectedDataSources || [];

          var addTab = this.isEverythingTabNeeded(selectedDataSources);
          if (addTab) {
            selectedDataSources.splice(0, 0, {
              name: "Everything",
              _dataSourceTab: true
            });
          }
        },

        getSelectedDataSources: function (selectedDataSources) {
          if (!this.dataSources) return [];
          return _.reduce(this.dataSources.get(), function (dataSources, dataSource) {
            if (selectedDataSources.length < 1 || _.indexOf(selectedDataSources, dataSource.query_expr && dataSource.query_expr.id) >= 0) {
              dataSources.push(dataSource);
            }
            return dataSources;
          }, []);
        },
        
        getSelectedDataSourceIds: function () {
          if (!this._listeningForUserSourceInfoChanges) {
            return [];
          }
          return _.reduce(this.sourceContextConstraints.get(), function (ids, constraint) {

            if (constraint.filter_base) {
              var dataSourceIds = _.filter(_.keys(constraint.filter_base), function (id) {
                  return /datasource_/.test(id);
              });
              if (dataSourceIds.length) ids = ids.concat(dataSourceIds);
            }

            return ids;
          }, []);
        },

        createEntryView: function (options) {
          options = _.clone(options);
          options.elementTemplate = this.options.elementTemplate;
          options.application = this.options.application;
          return ListView.prototype.createEntryView.apply(this, [options]);
        },

        registerActions: function () {
          var updateTabs = _.bind(this.updateTabs, this);
          if (Application.prototype.tabsUpdated) return;

          Application.prototype.tabsUpdated = function () {
            var customTabs = _.filter(this.models.tabs.models, function (tab) { return tab.get("customTab"); });
            try {
              localStorage.mbSavedTabs = JSON.stringify(_.map(customTabs, function (tab) { return tab.toJSON() }));
            } catch (e) {
            }
          };

          Application.prototype.loadCustomTabs = function () {
            var that = this,
                savedSearches;
            
            try {
              savedSearches = localStorage.mbSavedTabs && JSON.parse(localStorage.mbSavedTabs);
            } catch (e) {
              savedSearches = [];
            }

            _.forEach(savedSearches, function (savedSearch) {
                if (savedSearch.constraint) savedSearch.constraint.name = savedSearch.name
                if (savedSearch.request && savedSearch.request.constraint)  savedSearch.request.constraint.name = savedSearch.name
                that.models.tabs.add(savedSearch);
            });

            if (!this.options.enableProfile) {
              updateTabs();
            }
          }
          function and () {
            var parts = Array.prototype.slice.apply(arguments);
            parts = _.map(_.filter(_.flatten(parts), function (part) { return part }), function (part) {
                return _.extend({}, part);
            });

            if (parts.length < 1) return null;
            if (parts.length === 1) return parts[0];
            return { and: parts };
          }

          Application.prototype.addTab = function (options) {
            var selectedTab = this.models.tabs.getSelectedTab(),
                selectedTabName = selectedTab && selectedTab.get("name");

            var user = this.models.search.input.get("user")  && deepClone(this.models.search.input.get("user"));
            var userQuery = null;
            var queryFieldInfo = {path: []};

            // TODO: Search forms other than user input?
            if (user && user.query) {
              var queryFieldInfo = this.formqueryadapter.queryField() || {path: []};
              userQuery = deepClone(JSONPath.get(user.query, queryFieldInfo.path));
              // @since 15.3 set this as expandable
              userQuery.expandable = true;
            }

            var suffix = userQuery && selectedTabName ? ", " + selectedTabName  : "",
                name = this.models.tabs.nameFromQuery(userQuery, suffix) || this.models.tabs.nextName(null, suffix),
                sourceContext = this.models.search.input.get("source_context"),
                tab;      

            if (user) {
              var restOfUserQuery = null;
              if (user.query && queryFieldInfo.path.length) {
                restOfUserQuery = user.query;
                // mutates restOfUserQuery
                JSONPath.unset(restOfUserQuery, queryFieldInfo.path);
              }

              var constraint = and(userQuery, sourceContext && sourceContext.constraints && sourceContext.constraints.view),
              tab = new this.models.tabs.model({
                  name: name,
                  constraint: constraint,
                  user_constraints: user.constraints,
                  user_query: restOfUserQuery,
                  edit: true,
                  editable: true,
                  customTab: true
              }),
              callback = _.bind(function (application, view, model) {
                  if (model !== tab || !view.el.parentNode) return;
                  var $editable = view.$el.find("[data-edit]");

                  if ($editable.length) {
                    if (tab.get("edit")) {
                      this.inplaceEdit({
                          targetEl: $editable[0].parentNode,
                          model: tab,
                          deletable: true
                      });
                    } else {
                      this.stopListening(this.views, "afterRender:Tab", callback);
                    }
                  }
                }, this);

              if (selectedTab) {
                tab.setting(null, selectedTab.setting());
              }
              this.listenTo(this.views, "afterRender:Tab", callback);
              this.models.tabs.add(tab);
              this.changeView({model: tab});

              this.models.tabs.update();
            }
          };

        }
      });

    Tabs.View.EntryView = ListView.EntryView.extend({

      initialize: function () {
        ListView.EntryView.prototype.initialize.apply(this, arguments);
        
        this.listenTo(this.model, "change", this.render);
      },

      render: function () {
        this.childView.render();
        return this;
      },

      createChildView: function (options) {
        options = _.extend(
          {
            modelType: "Tab",
            focusNext: true
          },
          options
        );
        return options.elementTemplate.createView(options);
      }

    });

    Tabs.DEFAULT_TEMPLATE = 
        '<script type="text/x-mustache-template" data-tag-name="a" data-attr-role="tab" data-attr-class="action" data-attr-aria-selected="{{#selected?}}true{{/selected?}}{{^selected?}}false{{/selected?}}" data-attr-data-action-object="{&quot;changeView&quot;:{&quot;constraints.view&quot;: {{^constraint?}}null{{/constraint?}}{{{constraint}}} } }">{{#editable?}}<span data-event-mask="dblclick|taphold" data-edit data-action-object="{&quot;inplaceEdit&quot;: { &quot;deletable&quot;: true }}">{{/editable?}}{{{name}}}{{#editable?}}</span>{{/editable?}}</script>';
    return Tabs;
  });

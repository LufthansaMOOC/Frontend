/*=======================================================================
 * $Id: application.js 115426 2017-11-08 08:21:25Z michael.biebl $
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
     "underscore",
     "moment",
     "extensions",
     "i18n/i18n",
     "api/v2/api",
     "api/v2/common",
     "backbone",
     "utils/backbone-utils",
     "utils/dom",
     "utils/keys",
     "utils/string",
     "utils/flexbox",
     "client/extensions",
     "client/resourceinfo",
     "client/sourceinfo",
     "client/template",
     "client/templatetree",
     "client/templateregistry",
     "client/formqueryadapter",
     "client/queryprofiler",
     "jquery",
     "service/channels",
     "service/constrainedchannels",
     "model/properties",
     "model/tabs",
     "model/templateinfo",
     "model/tasks",
     "bootstrap",
     "utils/jsonpath",
     "utils/browser",
     "utils/clone",
     "component!stack",
     "component!preview",
     "api/v2/applist",
     "utils/mustache",
     "utils/accessibility",
     "require",
     "utils/trace",
     "plugins",
     "plugin-init",
     "utils/apptest"
   ], function(
     _,
     moment,
     Extensions,
     i18n,
     api,
     Common,
     Backbone,
     unused,
     dom,
     keys,
     StringUtils,
     flexbox,
     ClientExtensions,
     ResourceInfo,
     SourceInfo,
     Template,
     TemplateTree,
     TemplateRegistry,
     FormQueryAdapter,
     QueryProfiler,
     $,
     Channels,
     ConstrainedChannels,
     PropertiesModel,
     Tabs,
     Templateinfo,
     Tasks,
     bootstrap,
     JSONPath,
     browser,
     clone,
     Stack,
     Preview,
     Applist,
     MustacheAdapter,
     Accessibility,
     require,
     Trace,
     plugins,
     pluginInit
   ) {

  /*
  * Options
  * -------
  *
  * * enableRemoteSources: enable remote sources configured for client service (DEFAULT: true)
  * * enableProfile: enable the profile of the user (DEFAULT: false)
  * * enableSourceInfo: enable the ... (DEFAULT: ???)
  * * enableUserSourceInfo: enable the ... (DEFAULT: ???)
  *                                     ATTENTION: this can be security and performance relevant
  *                                     (e.g. Microsoft Exchange primary mailbox
  *                                     restriction)
  * * disableUserSourceInfo: don't load user specific source info. *deprecated*, use enableUserSourceInfo instead
  *
  *
  * * queryURLParameter: name of parameter used for starting queries, default: query
                         e.g. http://www.example.com/?query=test starts a search for test
  *
  * * datasourcesNameOrder: order of data sources by name, overrules datasourcesCategoryOrder, e.g. ["MyExchange", "M:"]
  *                         missing values are sorted in default order
  * * datasourcesGroupByCategory: group data sources by category (DEFAULT: true)
  * * datasourcesCategoryOrder: order of categories, e.g. ["Web", "Microsoft Exchange"]
  *                             missing values are sorted in default order
  * * updateTitle: update the document title after searching (DEFAULT: false)
  * * titleTemplate: a template for the document title, will be used when updateTitle is enabled.
  *                  available properties: computing, i18n, stackTitle and unparsedUserQuery
  *                  (DEFAULT: "{{#unparsedUserQuery?}}{{unparsedUserQuery}} - {{/unparsedUserQuery?}}" + document.title + "{{#computing?}} ...{{/computing?}}")
  * * enableImmediateDisplayOfFederatedResults: when federating, display results of each data source immediately, this doesn't guarantee global order of results (DEFAULT: false)
  *
  * Events
  * ------
  *
  * * ajaxError: triggered, if an error occurs on any channel. Arguments: channel, response
  *
  * Public API
  * ----------
  *
  * * getUserConstraints(): gets the currently set user constraints, e.g. like filters
  * * setUserConstraints(userConstraints, options): restores the userConstraints. You should use the userConstraints returned by **getUserConstraints** (triggers a change on the search model)
  * * getUnparsedUserQuery(): gets the query entered by the user as a string
  * * setUnparsedUserQuery(unparsedUserQuery, options): sets the user query to the given string (triggers a change on the search model)
  */

  /**
    * @static
    * @module client/application
    * @typedef ApplicationDefinition
    * @memberof client/application
    * @type {Object}
    *
    */

    var ApplicationDefinition = {};

  /**
    * Application API.
    *
    * @exports client/application
    */

  var Application = function (options) {
    var that = this,
        args = arguments;

    pluginInit.then(function () {
      that._initialize.apply(that, args);
    });
  };


    /**
    * @typedef Application
    * @memberof client/application
    * @type {Object}
    */

    /**
      * Register a application using the submitted definition.
      * @property {string} titleTemplate  For the title, a mustache template can be saved in order to display the query (unparsedUserQuery), the title of the current stack element (stackTitle) and the status, e.g. if the search is currently being performed (computing).
      * @property {bool} updateTitle If a search should start during initialization, when restrictions are stored? Values: true, false, default value: true
      * @property {bool} datasourcesGroupByCategory Display data sources grouped according to data source category. Values: true, false.  Default value: true
      * @property {bool} startSearch  If a search should start during initialization, when restrictions are stored? Values: true, false, default value: true
      * @property {string} queryURLParameter Name of the URL parameters for search terms (for example, opening the page http://www.example.com/?query=test will start a search for test). Default: query
      * @property {bool} enableRemoteSources activates registered federated data sources in the configuration. Values: true, false, default value: true
      * @property {bool} enableProfile activates the user profile. Values: true, false, default value: false
      * @property {bool} loginAsError Login requests are treated as errors. No login is displayed. Values: true, false, default value: false
      * @property {bool} enableImmediateDisplayOfFederatedResults when federating, display results of each data source immediately, this doesn't guarantee global order of results. Values: true, false, default value: false

      * @example
      new Application({
        loginAsError: true,
        startSearch: true,
        enableProfile: false,
        enableSourceInfo: false,
        enableUserSourceInfo: false,
        updateTitle: true,
        queryURLParamaeter: "unused",
        enableImmediateDisplayOfFederatedResults: false
      });
      */

  Application.extend = Backbone.Model.extend;
  Application.scriptLocation = ResourceInfo.scriptLocation;
  _.extend(Application.prototype, Backbone.Events, {

      scriptLocation: Application.scriptLocation,

      api: api,

      destroyed: false,

      _initialize: function (options) {
        var that = this,
            parentOptions = {};

        if (options.parentApplication) {
          parentOptions = _.clone(options.parentApplication.options || {});
        }

        this.options = _.extend({
            editing: false,
            locale: "en-US"
          }, parentOptions, options);

        if ( typeof this.options.enableSourceInfo !== "undefined" ) {
          if ( this.options.enableSourceInfo !== false ) {
            this.options.enableSourceInfo = true;
          }
        } else {
          this.options.enableSourceInfo = true;
        }

        if ( this.options.enableSourceInfo === true ) {
          if ( typeof this.options.enableUserSourceInfo !== "undefined" ) {
            if ( this.options.enableUserSourceInfo !== false ) {
              this.options.enableUserSourceInfo = true;
            }
          } else {
            this.options.enableUserSourceInfo = true;
          }
        } else {
          this.options.enableUserSourceInfo = false;
        }

        this.rootEls = this.options.rootEls || this.options.rootEl || document.body;
        this.rootElsClone = this.options.rootEls || this.options.rootEl || document.body.cloneNode(true);

        this.resolveTemplateReferences(this.rootEls);

        this.options = _.extend({}, this.getOptionsFromAttributes(this.rootEls), this.options);


        this.formqueryadapter = new FormQueryAdapter();
        this.jsonPath = JSONPath;
        this.models = {};
        this.views = _.extend({}, Backbone.Events);


        if (this.options.parentApplication) {
          this.parentApplication = this.options.parentApplication;
          this.parentApplication.on("destroy", function () {
              this.parentApplication.off(null, null, this);
              this.destroy();
            }, this);

          // remove reference from parent...
          delete this.options.parentApplication;
        }

        // take channels form parent application unless overwritten
        if (!this.parentApplication || options.sources || options.channels) {
          var channels = [];
          if (this.options.sources)
            channels =  this.options.sources;
          else if (this.options.channels)
            channels =  this.options.channels;
          else {
            channels =  SourceInfo.builtinSources;
          }

          var channelOptions = {};
          if (window && window.location) {
            channelOptions.referer = window.location.toString();
          }
          if (this.options.loginAsError && this.options.loginAsError === true) {
            channelOptions.loginAsError = true;
          }
          if (this.options.sessionDescription) {
            channelOptions.sessionDescription = this.options.sessionDescription;
          }

          this.queryProfiler = new QueryProfiler({application: this,
              profilerSettings: options.profilerSettings
          });

          channelOptions.requestTransformers = [this.queryProfiler.createRequestTransformer()];

          this.models.defaultChannels = new Channels(SourceInfo.builtinSources, channelOptions);
          this.models.channels = new ConstrainedChannels(channels, channelOptions);
          var applists;
          this.models.applists = applists = new Applist.Applists();
          applists.each(this.listenToChannelChanges, this);
          this.models.applists.on("add", this.listenToChannelChanges, this);
          this.models.profile = this.api.getProfile.createModel(this.models.defaultChannels);
          this.models.sourceInfo = this.api.sourceInfo.createModel(this.models.channels);
          this.models.userSourceInfo = this.api.userSourceInfo.createModel(this.models.channels);
          // this.models.personalization = this.api.personalization.createModel(this.models.channels);
          this.models.stack = new Stack.Model();
          this.models.stack.set("application", this);
          this.models.tasks = new Tasks();

        }
        else {
          this.models = _.extend({}, this.parentApplication.models, this.models);
          this.models.tabs = null; // unconditionally initialized in this.initialize later
          this.queryProfiler = new QueryProfiler({application:this, parentProfiler: this.parentApplication.queryProfiler});

        }
        this.channels = this.models.channels;
        this.channels.on("fail", function () {
            that.triggerAjaxError.apply(that, arguments);
        });
        this.initialize(this.options.callback);
      },

      initialize: function (callback) {
        var that = this;

        this.initializeSourceInfo();

        this.appid = this.options.appid || window.location.protocol.replace(/:/, '') + window.location.host + window.location.port + window.location.pathname;

        this.options.queryURLParameter = this.options.queryURLParameter || "query";
        this.options.searchURLParameter = this.options.searchURLParameter || "search";

        if (typeof this.options.enableRemoteSources === "undefined") {
          if (typeof this.options.loginAsError !== "undefined") {
            this.options.enableRemoteSources = !this.options.loginAsError;
          } else {
            this.options.enableRemoteSources = true;
          }
        }

        this.options.enableAccessibilityHandlers = this.options.enableAccessibilityHandlers !== false;

        this.initializeModels();
        if (_.isFunction(this.options.initializeModels)) {
          this.options.initializeModels(this);
        }

        this.detectBrowserFeatures();

        this.addClassNames(this.rootEls);

        var enableRelevanceInfo = browser.getURLParameter("relevance-info") === "true";
        if (enableRelevanceInfo) this.displayRelevanceInfo();

        this.templateTree = new TemplateTree(this.rootEls, "searchroot", this.options.templateString);

        this.templateTree.initialize(this, this.models.search, function (errors) {
          that.searchModelInitialized(errors, callback);
          if (that.options.enableAccessibilityHandlers) {
            that.accessibilityContainer = new Accessibility.Container(that.rootEls);
          }
          i18n.patchI18nAttributes();
          if (!that.parentApplication) {
            ClientExtensions.provide("after", "Application.initialize", that);
          }
        });
      },

      displayRelevanceInfo: function() {
        var rootEl = $(this.rootEls).find("[data-template=results]");
        $('body').addClass("mb-show-relevanceInfo");
        rootEl.before('<div class="relevanceInfoSwitchbox"><h2 data-i18n="show_relevance_infos"></h2><label class="switch relevanceInfo"><input type="checkbox" id="relevanceInfo" checked data-action-name="toggleRelevanceInfoTemplate"><span class="slider round"></span></label></div>');

        this.toggleRelevanceInfoTemplate();
        $('<div data-template="table" data-edittable="true" data-appendonscroll="true" data-allowExport="false" data-properties="icon,title,relevance_order,group,mes:relevanceinfo.recency,mes:relevanceinfo.tf,mes:relevanceinfo.tf_idf,mes:relevanceinfo.proximity,mes:relevanceinfo.percent_zone_boost,mes:relevanceinfo.percent_term_boost,mes:relevanceinfo.percent_document_boost,mes:relevanceinfo.percent_term_match,mes:relevanceinfo.percent_tf_idf,datasource/mes:key, extension" class="relevanceInfoTable"></div>').insertBefore(rootEl);

        window.addEventListener("message", _.bind(function(e) {
          if (e && e.data && e.data.name == "triggerSearch") {
            this.models.search.input.set("user", this.models.search.input.get("user"));
          }
        }, this), false);
      },

      toggleRelevanceInfoTemplate: function() {
        var resultTemplate = $(this.rootEls).find("[data-template=results]");
        var tableTemplate = $(this.rootEls).find("[data-template=table]");

        var resultContainer = $(this.rootEls).find(".span9");
        var filterContainer = $(this.rootEls).find(".span3");

        var relevanceInfoAvailable = $('#relevanceInfo');
        if(relevanceInfoAvailable.attr('checked')) {
          resultTemplate.hide();
          tableTemplate.show();
          filterContainer.hide();
          resultContainer.width("100%");
        } else {
          resultTemplate.show();
          tableTemplate.hide();
          filterContainer.show();
          resultContainer.width("74.35897435897436%");
        }
      },

      initializeDialog: function () {
        var that = this;
        var remoteOrigin = window.parent !== window && document.referrer.replace(/(https?:\/\/[^\/]*).*/, "$1");

        $(this.rootEls).addClass("mb-dialog");

        if (remoteOrigin) {
          var sendToParent = function sendToParent (request) {
            JSON.stringify(window.parent.postMessage(request, remoteOrigin));
          };
          this.closeDialog = function (options) {
            sendToParent({id: "closeDialog", call: { name: "closeDialog" }});
          }
          $(window).on("keydown", function (e) {
              if (e.keyCode == 27) that.closeDialog();
          });
        }
      },

      resolveTemplateReferences: function (els) {

        function cloneRec(dest, src) {
          if (!src || !src.childNodes) return;
          for (var i = 0; i < src.childNodes.length; i++) {
            var node =  src.childNodes[i];
            var cloned = node.cloneNode(false);
            if (cloned.nodeName.toUpperCase() == "SCRIPT") {
              cloned.text = node.text;
            } else {
              cloneRec(cloned, node);
            }
            dest.appendChild(cloned);
          }
        }

        do {
          var $referencers = $(els).find("[data-template-refid]:not([data-template='searchcontainer']):not([data-replaced])");
          $referencers.each(function () {
            var refid = this.getAttribute("data-template-refid"),
            el = document.getElementById(refid);

            if (el) {
              cloneRec(this, el);
              this.setAttribute("data-replaced", "true");
            } else {
              this.innerHTML = "Template with id \"" + refid + "\" not found!";
            }
          });
        } while ($referencers.length > 0);

      },

      getOptionsFromAttributes: function (els) {
        var schema = new Template.Schema({
            attributes: {
              "datasourcesGroupByCategory": {
                type: "boolean",
                "default": true,
                required: false
              },
              "datasourcesCategoryOrder": {
                type: "list",
                required: false
              },
              "datasourcesNameOrder": {
                type: "list",
                required: false
              },
              "enableImmediateDisplayOfFederatedResults": {
                type: "boolean",
                "default": false,
                required: false
              }
            }
        })
        if (!_.isArray(els)) {
          els = [els];
        }
        var options = _.extend.apply(_, _.map(els, function (el) {
          return new dom.AttributeModel(el, "data-").getCamelCase();
        }));

        return schema.parseAttributes(options);
      },

      detectBrowserFeatures: function () {
        if (browser.isMobileSafariPrivateMode()) {
          this.models.channels.addAlert({id: "localStorage", level: "info", message: i18n("info_mobile_safari_private_mode")})
        } else if (!browser.localStorageAvailable()) {
          this.models.channels.addAlert({id: "localStorage", level: "info", message: i18n("info_local_storage_not_available")})
        }
      },

      initializeModels: function () {
        this.createSearchModel();
        this.models.search.deactivate();
        if (this.queryProfiler) this.queryProfiler.registerSearchModel(this.models.search);
        if (!this.parentApplication && this.options.updateTitle) {
          // the template uses {{{value}}} since it is only used for the document title and we want to see the characters correctly
          this.options.titleTemplate = this.options.titleTemplate || "{{#stackTitle}}{{{stackTitle}}} - {{/stackTitle}}{{^stackTitle}}{{#unparsedUserQuery?}}{{{unparsedUserQuery}}} - {{/unparsedUserQuery?}}{{/stackTitle}}" + document.title + "{{#computing?}} ...{{/computing?}}";
          this.listenTo(this.models.search, "computing", function () { this.updateTitle(true) });
          this.listenTo(this.models.search, "computed", function () { this.updateTitle(false) });
          this.listenTo(this.models.stack, "change", function () { this.updateTitle(false) });
        }

        this.listenTo(this.models.search.input, "validated", function (model, valid) { this.updateValidityDependantEls("search", valid) });

        this.models.tabs = new Tabs([], {
          constraintsModel: this.models.search.input.submodel("source_context.constraints"),
          application: this
        });

        this.models.templateinfo = new Templateinfo({
            appid: this.appid
          },
          {
            mainpartBinding: this.models.search.submodel("source_context.constraints.view.name").input
        });
      },

      getModel: function (modelName) {
        return this.models[modelName];
      },

      updateValidityDependantEls: function (model, validity) {
        $(this.rootEls).find("[data-enable-if-model-valid='" + model + "']").attr("disabled", !validity);
      },

      on: function(name, callback, context) {
        if (name == "ajaxError") {
          var ctx = {context: context, callback: callback, channels: this.channels};
          if (!this._eventFilterMap) {
            this._eventFilterMap = {};
          }
          if (!this._eventFilterMap[name])
            this._eventFilterMap[name] = [];

          this._eventFilterMap[name].push({context: ctx, callback: Channels.ignoreSuccessiveErrorsCallback});
          return Backbone.Events.on.call(this,
                                         name,
                                         Channels.ignoreSuccessiveErrorsCallback,
                                         ctx);
        } else {
          return Backbone.Events.on.apply(this, arguments);
        }
      },

      off: function(name, callback, context) {
        if (!name) {
          this._eventFilterMap = {};
        }
        if (name == "ajaxError") {
          if (this._eventFilterMap && (callback || context)) {
            // find the corresponding callback
            if (this._eventFilterMap[name]) {
              var events = this._eventFilterMap[name];
              var newEvents = [];
              for (var i = 0; i < events.length; ++i) {
                var event = events[i];
                if ((!callback || callback == event.context.callback)
                    && (!context || context == event.context.context)) {
                  Backbone.Events.off.call(this, name, event.callback, event.context);
                }
                else {
                  newEvents.push(event);
                }
              }
              this._eventFilterMap[name] = newEvents;
            }
          }
        }
        else {
          return Backbone.Events.off.apply(this, arguments);
        }
        return this;
      },

      updateTitle: function (computing) {
        var model = new Backbone.Model({
              i18n: i18n.string,
              unparsedUserQuery: this.getUnparsedUserQuery(),
              computing: computing,
              stackTitle: StringUtils.stripHtml(this.models.stack.lastChild() && this.models.stack.lastChild().get("title"))
            }),
            mustache = new MustacheAdapter(this.options.titleTemplate);

        document.title = mustache.render(model);
      },

      initDatasourcesOrder: function () {
        var customOrderFunction,
            customSortFunction;

        if (this.options.datasourcesGroupByCategory) {
          customSortFunction = Common.getCompareFunction("PROPERTY", null, {
              criteriaPropertyName: "categories.id",
              subCriteria: {
                criteria: "PROPERTY",
                options: {
                  criteriaPropertyName: "name"
                }
              },
              mapKeyPropertyName: "name"
          });
          customOrderFunction = Common.getOrderFunctionByList(this.options.datasourcesCategoryOrder, "categories.id");
        }

        if (this.options.datasourcesNameOrder && this.options.datasourcesNameOrder.length > 0) {
          if (customOrderFunction) { // grouped
            customOrderFunction = Common.getOrderFunctionByList(this.options.datasourcesCategoryOrder, "categories.id",
                                    Common.getOrderFunctionByList(this.options.datasourcesNameOrder, "name"));
          } else {
            customOrderFunction = Common.getOrderFunctionByList(this.options.datasourcesNameOrder, "name");
          }
        }

        if (customOrderFunction) {
          if (customSortFunction) {
            customOrderFunction = Common.wrapOrderFunctionWithSort(customOrderFunction, customSortFunction);
          }

          this.models.sourceInfo.applyCustomOrder = customOrderFunction;
          this.models.userSourceInfo.applyCustomOrder = customOrderFunction;
        }
      },

      addClassNames: function (rootEls) {
        var classes = [],
            highContrastClass = Accessibility.highContrast.get();

        if (highContrastClass) {
          classes.push(highContrastClass);
        }

        if (flexbox()) {
          classes.push("mb-flexbox");
        }

        if (browser.getURLParameter("embedded") === "true") {
          classes.push("mb-embedded");
        }
        if (browser.isTouchDevice()) {
          classes.push("mb-touch");
        }

        if (classes.length) {
          if (!_.isArray(rootEls)) {
            rootEls = [rootEls];
          }
          _.each(rootEls, function (el) {
            $(el).addClass(classes.join(" "));
          })
        }
      },

      setLocale: function(locale, callback) {
        var that = this;
        i18n.setLocale(locale, function(i18n) {
          that.options.locale = i18n.locale;
          if (callback) {
            callback(i18n);
          }
        });

      },

      selectFirstTab: function () {
        var firstTab = this.models.tabs && this.models.tabs.at(0),
            sourceContextConstraintsModel;

        if (firstTab) {
          this.changeView({
            model: firstTab
          });
        }
        else if (!this.options.retainViewSourceContextConstraints){
          sourceContextConstraintsModel = this.models.search.submodel("source_context.constraints");
          sourceContextConstraintsModel.unset("view", {silent:true});
          sourceContextConstraintsModel.dispose();
        }
      },

      initializeSourceInfo: function () {
        this.initDatasourcesOrder();
        var that = this;
        // only perform this if we own the sourceInfo
        if (this.options.enableSourceInfo && (!this.parentApplication || this.parentApplication.models.sourceinfo != this.models.sourceinfo)) {
          this.models.sourceInfo.update(null, function (model, error) {
            if (that.options.enableRemoteSources) {
              _.each(model && model.remote_sources, function (source) {
                that.models.channels.add(source.location + "api/v2/");
              });
            }
            if (that.options.enableUserSourceInfo) {
              // TODO: update sourceContext and allow searches
              that.models.userSourceInfo.update(null, function (model, error) { })
            }
          });

          this.models.channels.on("add change:enabled", function (channel, value) {
              var channel = [channel];
              if (value === false) { //disabled
                channel = null;
              }
              that.models.userSourceInfo.update(channel, function (model, error) { })
          });
          this.models.channels.on("remove", function () {
              that.models.userSourceInfo.update(null, function (model, error) { })
          });
        }
      },

      searchModelInitialized: function (errors, callback) {
        var that = this;

        $("body").on("click.mb-application", function () {
          that.closeMenus();
          $(".mb-popover-trigger").popover("destroy");
        });
        $("body").on("keydown.mb-application", function (e) {
          if (e.which === keys.esc) {
            that.closeMenus();
            $(".mb-popover-trigger").popover("destroy");
          }
        });

        this.selectFirstTab();

        var startSearch = this.options.startSearch;
        if (_.isUndefined(startSearch)) startSearch = true;

        var enableVoting = $('[data-template="results"][data-enable-voting=true]').length;
        if (enableVoting) Mindbreeze.require(["component!voting"]);
        
        var urlQuery = browser.getURLParameter(this.options.queryURLParameter);
        var searchPath = browser.getURLParameter(this.options.searchURLParameter);

        // setup the state before the model is activated
        if (this.onTemplateTreeInitialized) {
          this.onTemplateTreeInitialized(errors);
        }
        if (this.prepareModels) {
          this.prepareModels(errors);
        }

        this.models.search.activate(startSearch ? {} : {silent: true});

        if (urlQuery && !searchPath) {
          this.setUnparsedUserQuery(urlQuery, { forceUIUpdate: true });
        }

        // only perform this if we own the profile
        if (this.options.enableProfile && (!this.parentApplication || this.parentApplication.models.profile != this.models.profile)) {
          this.listenTo(this.models.profile, "change", this._profileUpdated);
          this.models.profile.update();
        }


        this.initialized = true;
        if (errors) {
          this.failed = true;
          if (console && console.warn) {
            console.warn.apply(console, "Failed to initialize application.", errors);
          }
        }

        that.updateValidityDependantEls("search", that.models.search.input.validate());

        this.trigger("initialized", errors);
        if (callback)
          callback(this);
      },

      _profileUpdated: function () {
        var model = this.models.profile;
        Trace.setUserName(model.get("user_name"));
        this.models.applists.fetch({
          channels: model.get("app_list_urls")
        });
      },

      parseQueryExprToLabelMap: function (query) {
        var queries = query ? query.and || [query] : [],
          that = this;

      return _.reduce(queries, function (queryByName, part) {
        var props = _.keys(part),
            ok =  (props.length <= 2 && _.difference(props, ["label", "unparsed"]).length == 0) || part._name,
            label;

        if (ok) {
         label = part._name || part.label ||  "query";
         queryByName[label] = part;
        }

        return queryByName;
        }, {});
    },

    serializeLabelMapToQueryExpr: function (map) {
      return _.map(_.keys(map), function(key) {
          return map[key];
      });
    },


      setConstraint: function(constraint) {
        this.channels.setConstraint(constraint);
      },

      getConstraint: function() {
        return this.channels.getConstraint();
      },

      execute: function(callback) {
        if (this.destroyed) {
          throw new Error("Application already destroyed.");
        }
        if (!this.initialized) {
          this.once("initialized",
                    function(errors) {
                      // console.log("Deferred.");
                      callback(this);
                    },
                    this);
        }
        else {
          callback(this);
        }
      },

      createSearchModel: function () {
        var search = api.search.createModel(this.models.channels, { enableImmediateDisplayOfFederatedResults: this.options.enableImmediateDisplayOfFederatedResults });
        search.set("content_sample_length", 300, { silent: true });

        this.models.search = search;
      },

      edit: function() {
        var that = this;
        require(['client/editor'], function (Editor) {
          $("body").removeClass("mb-loading");
          _.extend(that, Editor.applicationAdditions);
          var editor = new Editor(that, function (editor) {
            editor.refresh();
            that.editor = editor;
          });
          that.editing = true;
          that.trigger("edit");
          $("#edit-button").addClass("active")
        });
      },

      exportResults: function(options){
        try {
                  localStorage.mbLastExport = JSON.stringify({
                    name: $(options.eventTarget).text(),
                    properties: options.properties
                  });
                  window.updateLastExport && window.updateLastExport();
        } catch (e) {
        /* ignore */
        }

        if (_.isString(options.properties)) {
          var re = /\s*,\s*/;
          options.properties = options.properties.split(re);
        }

        if (_.isString(options.excludeFromTranslation)) {
          var re = /\s*,\s*/;
          options.excludeFromTranslation = options.excludeFromTranslation.split(re);
        }

        this.pushStack({
          action: "exportView",
          "content": "<div data-template='exportview'></div>",
          "title": i18n("export_results"),
          "applicationOptions": {
            appendOnTableScroll: options.appendonscroll,
            exportformat: options.exportformat,
            excludeFromTranslation: options.excludeFromTranslation,
            retainViewSourceContextConstraints: true,
            initializeModels: function(app) {
              // this called before the search tree is initialized by templates
              // models still deactivated, so we can set it, without triggering search.
              var searchInput = app.parentApplication.models.search.input.toJSON();
              delete searchInput.facets;
              searchInput.properties = _.reduce(options.properties, function(properties, p) { properties[p] = { formats: ["HTML", "VALUE"]}; return properties }, {});
              app.models.search.output.load({"available_properties":  app.parentApplication.models.search.get("available_properties")}, {silent: true});
              app.models.search.set(searchInput);
            }
          }
        });
      },

      exportView: function (options) {
        // TODO: cleanup (e.g. paging)0
        this.models.search.input.change();
      },

      getDefaultTemplateContentForAction: function(actionName) {
        if (actionName) {
          return "<div data-template='" + actionName.toLowerCase() + "' />";
        } else {
          return "";
        }
      },

      getPreviewView: function (callback) {
        var that = this,
            template = this.templateTree.getTemplateById("mb_preview");

        if (template && template.instances && template.instances.length) return callback(template.instances.instances[0]);

        if (this.parentApplication) {
          this.parentApplication.getPreviewView(function (previewView) {
            if (previewView) {
              callback.apply(this, arguments);
            } else {
              that.createPreviewView(callback);
            }
          });
        } else {
          this.createPreviewView(callback);
        }
      },

      createPreviewView: function (callback) {
        this.createView("preview", callback);
      },

      getOrCreateView: function (template, callback) {
        var view = this[template + "View"];
        if (view) {
          callback(view);
        } else {
          this.createView(template, callback);
        }
      },

      createView: function (template, callback) {
        var that = this,
            tmp = document.createElement("div"),
            tree = new TemplateTree(tmp, template);

        tree.initialize(this, new Backbone.Model(), function () {
          var view = tree.rootNode.template.instances.instances[0]
          that[template + "View"] = view;
          callback(view);
        });
      },

      removeConstraint: function (options) {
        var id = options.id || options.model.id || options.model.get && (options.model.get("description") || options.model.get("id")),
            userConstraintsModel = this.models.search.input.submodel("user.constraints");

        id = this.sanitizePath(id);

        userConstraintsModel.unset(id);
        userConstraintsModel.dispose();
      },

      subquery: function (query_expr) {
        delete query_expr.eventTarget;
        delete query_expr.model;
        delete query_expr.sender;
        delete query_expr.focused;
        delete query_expr.event;

        var id = query_expr.description || query_expr.id || _.uniqueId('q'),
            userConstraintsModel = this.models.search.input.submodel("user.constraints");

        id = this.sanitizePath(id);


        userConstraintsModel.set(null, query_expr, {path: [id]});
        userConstraintsModel.dispose();
      },

      /* actions */
      query: function (query_expr) {
        delete query_expr.eventTarget;
        delete query_expr.model;
        delete query_expr.sender;
        delete query_expr.focused;
        delete query_expr.event;

        var id = query_expr.description || query_expr.id || _.uniqueId('q');
        id = this.sanitizePath(id);
        id = "__queryaction__" + id;

        var user = {constraints: {} };
        user.constraints[id] = query_expr;
        this.models.search.input.set("user", user);
      },

      emptyModel: function (options) {
        var collection = options.model.get(options.path);
        collection.remove(collection.models);
      },

      destroyModel: function (options) {
        var model = options.model;
        model.trigger('destroy', model, model.collection, options);
      },

      extensionAction: function (options) {
        var action = Extensions.lookup(options.id);
        var target = options.eventTarget;

        if (action) {
          action({
            invokeInContext: options.invokeInContext
          });
        }
      },

      modal: function (options) {
        $("#" + options.id).modal();
      },

      login: function (options) {
        window.open('/mashup-login?resource=' + window.location.href + '', "_self");
      },

      logout: function () {
        var rootEls = this.rootEls;
        if (!_.isArray(rootEls)) rootEls = [rootEls];
        _.each(rootEls, function (el) {
          $(el).addClass("mb-logout");
        });

        var excluded = this.models.defaultChannels.at(0).get("url"),
            timeout = 0,
            channelsToLogout = this.models.channels.filter(function (channel) {
              return channel.get("url") !== excluded;
            });

        if (channelsToLogout && channelsToLogout.length > 0) {
          this.api.logout.cast(channelsToLogout);
          timeout = 3000;
        }
        var redirectLocation = excluded + this.api.logout.getLogoutPath();

        setTimeout(function () {
          window.location = redirectLocation;
        }, timeout);
      },

      toggleOpen: function (options) {
        var enabledSelector = options.enabledSelector;

        if (!enabledSelector || $(enabledSelector).is(":visible")) {
          $(options.eventTarget).toggleClass("mb-open");
        }
      },

      closeMenus: function (options) {
        var $group = options && options.eventTarget && $(options.eventTarget.parentNode);
        $(".mb-dropdown-toggle.open").not($group).removeClass("open").find(".dropdown-menu").remove();
      },

      openMenu: function (options) {
        var propertyId =  options.propertyId || $(options.eventTarget).parents('[data-id]').first().attr('data-id'),
            $group = $(options.eventTarget.parentNode),
            valueIndex = options.position || 0,
            summary = options.model.get("mes:summary"),
            property = options.model.get(propertyId) || _.find(_.isArray(summary) || !summary ? summary : [summary] , function (property) { return property.id === propertyId; }),
            actions = property && property.data && property.data.length > valueIndex && property.data[valueIndex].actions;

        if ($group.hasClass("open")) {
          $group.removeClass("open");
          $group.find(".dropdown-menu").remove();
          return;
        }

        // TODO: only once
        $group.append('<ul class="dropdown-menu">' + _.map(actions.data, function (action) {
            return '<li>' + action.html + '</li>';
        }).join("") + '</ul>');
        $group.addClass("open");
      },

      setDidYouMean: function (options) {
        if (!options) return;
        var query = options.query,
            model = options.model;

        if (model.input.get("query")) {
          model.input.set("query", query);
        } else {
          var queryFieldInfo = this.formqueryadapter.queryField() || {path: []},
              userQueryPath = ["user", "query"].concat(queryFieldInfo.path);
          model.input.set(null, query, _.extend({}, options, {path: userQueryPath}));
        }
     },


     tabTransitionUserConstraints: function(fromTab, toTab, fromConstraints, toConstraints) {
        return toConstraints;
     },

     setView: function(name, request, constraint, options) {
       var sourceContextConstraintsModel;
       if (request) {
         if (request.constraint) {
           constraint = request.constraint;
         }
         request = _.clone(request);
         delete request.constraint;

         this.models.search.set(request, { silent: true });
       }

       try {
          this.trigger("changeUserQueryTab", name, constraint);
        } catch (e) {
          if (console && console.warn) console.warn("Failed to trigger changeUserQueryTab", e);
        }

       if (name) {
         var tabToSelect = this.models.tabs.getByName(name);
         var selected = this.models.tabs.getSelectedTab();
         if (tabToSelect) {
           var userConstraints = tabToSelect.get("user_constraints");

           if (options.tabTransitionUserConstraints
              &&  _.isFunction(options.tabTransitionUserConstraints))
              userConstraints = options.tabTransitionUserConstraints(
                  selected,
                  tabToSelect,
                  this.models.search.get("user.constraints"),
                  userConstraints);

           if (userConstraints) {
             this.models.search.set("user.constraints", clone(userConstraints), {silent: true});
           } else {
             this.models.search.unset("user.constraints", {silent:true});
           }

           var tabUserQuery = clone(tabToSelect.attributes.user_query) || {},
               queryFieldInfo = this.formqueryadapter.queryField() || {path: []};

           var userQueryPath = ["user", "query"].concat(queryFieldInfo.path);
           var userQuery = this.models.search.input.get(userQueryPath);

           if (queryFieldInfo.path.length) {  // we accept other form fields
             if (userQuery)
               JSONPath.set(tabUserQuery, queryFieldInfo.path, userQuery);
           }
           else {
             tabUserQuery = clone(userQuery);
           }

           if (tabUserQuery && !_.isEmpty(tabUserQuery)) {
             this.models.search.set("user.query", tabUserQuery , {silent: true});
           }
           else {
             this.models.search.unset("user.query", null, {silent: true});
           }

           //           var userQueryMap = this.parseQueryExprToLabelMap(this.models.search.get("user.query"));
           //           if (userQueryMap.query) {
           //                  this.models.search.set("user.query", userQueryMap.query, {silent: true});
           //           }
           //           else {
           //             this.models.search.unset("user.query", {silent: true});
           //           }

         }
        }

        if (constraint) {
          // used for selection
          constraint.name = name;

          this.models.search.set("source_context.constraints.view", constraint, options);
        } else {
          sourceContextConstraintsModel = this.models.search.submodel("source_context.constraints");
          sourceContextConstraintsModel.unset("view", options);
          sourceContextConstraintsModel.dispose();
        }
        $(this.rootEls).attr("data-enabled-view", name || "Everything");

        this.models.stack.popToApplication(this);

        try {
          this.trigger("changeviewafter");
        } catch (e) {
          if (console && console.warn) console.warn("Failed to trigger changeviewafter", e);
        }
     },

     changeView: function (options) {
        options = options || {};
        options.name = options.name || (options.model && options.model.get("name", { localize: false })) || $(options.eventTarget).text();

        options.model = options.model || this.models.tabs.getByName(options.name);

        if (options.model) {
          var constraint = options["constraints.view"] || options.model.get("constraint");
          var request = options.model.get("request");
        }

        this.setView(options.name, request, constraint, {tabTransitionUserConstraints: this.tabTransitionUserConstraints});
      },

      displayWarning: function (message) {
        window.alert(message);
      },

      openHref: function (options) {
        this.closeMenus();

        var target = options.eventTarget,
            href = options.href,
            disabledSelector = target.getAttribute("data-disabled-selector");

        if (disabledSelector && $(disabledSelector).is(":visible")) {
          return true;
        }

        if (href && (href === "#" || !/^(mailto:|javascript:|\#)/.test(href)) && !target.getAttribute("target")) {
          if (href !== "#") {
            window.open(href);
            return false;
          }
          options["event"].enforceDefault = true;
          return true;
        }
        else {
          if (/^(javascript:|\#)/.test(href)) {
            window.open(href, "_self");
            return false;
          }  else {
            options["event"].enforceDefault = true;
            return true;
          }
        }
      },


      pushStack: function (options, traceContext) {
        traceContext = traceContext && traceContext.willLeave();

        if (options.useCloneElement) {
          var innerHTML = this.rootElsClone.innerHTML;
        } else {
          var innerHTML = document.getElementById(options["template-ref"]) && document.getElementById(options["template-ref"]).innerHTML
        }

        var stackModel = new Stack.Model({
              title: '<h2>' + (options.title || $(options.eventTarget).text()) + '</h2>',
              content: options.content
                    || (options["template-ref"]  && innerHTML)
                    || "",
              actionOptions: options,
              previousFocus: options.focused,
              applicationOptions: _.extend({
                  queryURLParameter: "unused"
                },
                options.applicationOptions || {}, {
                  enableAccessibilityHandlers: false,
                  parentApplication: this,
                  callback: function (application) {
                    if (application.options.feedbackHTML5ScreenshotDisabled) {
                      application.feedbackHTML5ScreenshotWasEnabled = Trace.feedbackHTML5ScreenshotEnabled();
                      Trace.enableHTML5Screenshot(false);
                    }
                    try {
                      if (options.action) {
                        application[options.action](_.extend(
                            {},
                            options,
                            {
                              // TODO: coupling alarm
                              titleModel: stackModel,
                              target: $(application.templateTree.rootEls[0]).find("> .mb-stack-content").get(0)
                          }),
                          traceContext
                        );
                      }
                    } finally {
                      traceContext && traceContext.leave();
                    }
                  }
              })
          });

          this.models.stack.push(stackModel);
      },

      nextPage: function (options) {
        options && options.model && options.model.nextPage && options.model.nextPage(options);
      },

      previousPage: function (options) {
        options && options.model && options.model.previousPage && options.model.previousPage(options);
      },

      preview: function (options, traceContext) {
        var actionName = "innerPreview";
        if (options && options.content_location) {
          actionName = "innerContentPreview";
        }

        this.pushStack(_.extend({}, options, {
            action: actionName,
            applicationOptions: _.extend({ feedbackHTML5ScreenshotDisabled: true, queryURLParameter: "unused", startSearch: false }, options.applicationOptions)
        }), traceContext);
      },

      innerPreview: function (options, traceContext) {
        traceContext = traceContext && traceContext.willLeave();
        var that = this;

        this.getPreviewView(_.bind(function (previewView) {
          var model = options.model,
              channel = model.channel,
              loc = model.get("location"),
              search = (this.parentApplication || this).models.search.input,
              query = search.get("user.query") || search.get("query");

          var propertyDefinitions = Common.mergePropertyDefinitions({
            title: {format: "HTML"},
            "mes:summary": {format: "PROPERTY"},
            content: {format: "HTML"},
            extension: {format: "HTML"},
            "html/head": {format: "HTML"},
            "categoryclass": {format: "HTML"},
            "@content": {format: "HTML"}
          }, previewView.getDisplayedProperties());

          var previewInput = this.api.preview.createInput({
              "location": loc,
              category: options.category || options.model.get("category"),
              categoryinstance: options.categoryinstance || options.model.get("categoryinstance"),
              key: options.key,
              query_expr: query,
              full_html: true,                     /* capability for understanding full html */
              "properties": _.reduce(propertyDefinitions, function (defs, value, key) { defs[key] = { formats: [value.format] }; return defs; }, {})
          });

          this.api.preview.call(channel,

            previewInput.toJSON(),

            function (response, error) {

              if (response &&
                  response.attributes &&
                  response.attributes["mindbreeze.internal.databytes.content_type"] &&
                  response.attributes["mindbreeze.internal.databytes.content_type"] == "text/html" &&
                  response.attributes.data) {
                previewView.setHtmlPreview(that, response.attributes.data, {traceContext: traceContext, model: options.model});

              }
              else {

                var model, title, result;

                if (response.get("result")) {
                  result = response.submodel("result");
                  model = new PropertiesModel(result.get("properties"), { propertyDefinitions: propertyDefinitions });
                  title = model.get("title", { format: "HTML" });
                  result.dispose();
                }

                previewView.setPreview(that, model, { traceContext: traceContext })
              }

              if (options.target) {
                options.target.appendChild(previewView.el);
              }
              if (title) {
                options.titleModel && options.titleModel.set("title", "<h2><small>" + i18n("preview") + "</small> " + title + "</h2>");
              }

              traceContext && traceContext.leave();
            },

            {
              traceContext: traceContext
            }
          );
        }, this));
      },


      innerContentPreview: function(options, traceContext) {
        traceContext = traceContext && traceContext.willLeave();
        var that = this;

        this.getPreviewView(_.bind(function (previewView) {
          var model = options.model,
              channel = model.channel,
              loc = model.get("location"),
              title = model.get("title"),
              search = (this.parentApplication || this).models.search,
              query = search.get("user.query") || search.get("query");

          previewView.setContentPreview(that, _.extend({query_expr: query}, options), {traceContext: traceContext, channel: channel});

          if (options.target) {
            options.target.appendChild(previewView.el);
          }
          previewView.resize();

          if (title) {
            options.titleModel && options.titleModel.set("title", "<h2><small>" + i18n("preview") + "</small> " + title + "</h2>");
          }

          traceContext && traceContext.leave();


        },this));
      },


      showAbout: function (action) {
        dom.focus($(action.eventTarget).popover({
          template: '<div class="popover mb-role" role="document"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"></div></div></div>',
          placement: "mb-about-popover bottom mb-inverted",
          html: true,
          trigger: "manual",
          content:
            "<div tabindex=\"0\">" +
            "<div class=\"background-container\">" +
            "<img class=\"background\" src=\"" + ResourceInfo.scriptLocation + "../img/about_bg.png\" lang=\"en\" alt=\"Mindbreeze InSpire\">" +
            "</div>" +
            "<h2>" + i18n("Version") + "</h2><p>17.2.6.714</p>" +
            "<h2>" + i18n("vendor") + "</h2><p>" + i18n("vendor_name") + "</p>" +
            "</div>" +
            "<button tabindex=\"-1\" class=\"close btn-link mb-top-right pull-right mb-clickable\">&times;<span class=\"mb-acc\">" + i18n("Close") + "</span></button>"
        }).popover("toggle").data("popover").$tip.on("click", ".close", function () {
          $(".mb-popover-trigger").popover("destroy");
        }));
      },

      triggerAjaxError: function () {
        this.trigger.apply(this, ["ajaxError"].concat(_.toArray(arguments)));
      },

      listenToChannelChanges: function (model) {
        model.get("channels").on("change:enabled", this.onChannelChanged, this);
        model.get("channels").on("add", this.onChannelChanged, this);
      },

      onChannelChanged: function (channel) {
        channel = channel.clone();

        if (channel.get("enabled") === true) {
          this.models.channels.add(channel, { merge: true });
        } else {
          this.models.channels.remove(channel);
        }
      },

      destroy: function (callback) {
        if (this.destroying) return;
        this.destroying = true;

        $("body").off(".mb-application");

        if (this.options.feedbackHTML5ScreenshotDisabled && this.feedbackHTML5ScreenshotWasEnabled) {
          Trace.enableHTML5Screenshot(true);
        }

        var that = this;
        this.models.search.deactivate();
        if (this.models.tabs) {
          this.models.tabs.dispose();
        }
        this.templateTree.destroy(function() {
          that.destroying = false;
          that.destroyed = true;
          if (callback) callback();
        });

        if (this.accessibilityContainer) {
          this.accessibilityContainer.destroy();
        }

        this.trigger("destroy");
        this.stopListening();
      },

      sanitizePath: function (id) {
        if (!id) return;
        return id.replace(/\.|\[|\]|\"|\'/g, "_");
      },

      handleAction: function (args, actionName, target, model, sender, focused, traceContext, e) {


        var action = this[actionName],
            returnValue;

        var handlerExists = action != null;
        var successful = false;
        var error = null;
        if (action) {

          try {
            returnValue = action.apply(
              this,
              [
                _.extend({
                    "event": e,
                    eventTarget: target,
                    sender: sender,
                    model: model,
                    focused: focused,
                    // TODO: get("id")?,
                    id: model && model.output && model.output.id
                }, args),
                traceContext
              ]
            );
            successful = true;
          } catch (e) {
            if (console && console.error) console.error("Failed to execute action", action, e.stack, e);
            error = e;
          }

          this.trigger("actionHandled");

          if (typeof returnValue === "undefined") {
            returnValue = false;
          }
          // return returnValue;
        }

        try {
          // var eventArgs = ["handeledaction"].concat(arguments);
          // this.trigger.apply(this, eventArgs);
          this.trigger("actionperformed", actionName, {"application": this,
                                                      "model": model,
                                                      "target": target,
                                                      "sender": sender,
                                                      "args": args,
                                                      "traceContext": traceContext,
                                                      "e": e,
                                                      "actionargs":  arguments,
                                                      "handlerExists": handlerExists,
                                                      "returnValue": returnValue,
                                                      "error": error });
        } catch (e) {
          if (console && console.warn) console.warn("Failed to trigger actionperformed", e);
        }


        return returnValue;
      },

      resetUser: function(options) {
        this.models.search.input.unset("user", { traceContext: options && options.traceContext, silent: options && options.silent });
      },

      resetFilters: function(options) {
        var userQueryPath = this.getUnparsedUserQueryPath(),
            model = options.model || this.models.search,
            query = model.get(userQueryPath);

        model.deactivate();
        model.input.unset("user", options);
        model.input.set(userQueryPath, query, options);
        model.activate();
      },

      resetSearch: function(options) {
        options = { traceContext: options && options.traceContext, silent: options && options.silent }
        this.resetUser(options);
        this.models.search.output.reset(null, options);
        var activeTabName = this.models.tabs.getSelectedTabName();
        if (activeTabName) {
          this.changeView({ name: activeTabName})
        }
        $("[autofocus]").focus();
      },

      setValue: function (options, traceContext) {
        var input = options.model.input || options.model;
        input.set(options.key, options.value, { traceContext: traceContext });
      },

      unsetValue: function (options, traceContext) {
        var input = options.model.input || options.model;
        input.unset(options.key, { traceContext: traceContext });
      },

      addValue: function (options, traceContext) {
        var input = options.model.input || options.model;
        input.add(options.key, options.value, { traceContext: traceContext });
      },


      _recomputePersonalizationProfile: function(collected) {
        var keys = [];
        collected.each(function (collectResult) {
          keys.push(collectResult.get("key"));
        });

        var patterns = _.map(keys, function(key) { return {label: "mes:key", regex: "\\Q" + key + "\\E" } });
        var profile = patterns.length > 0 ?   { factor: this._personalizeSearchBoost, query_expr: { or: patterns }} : null;
        return profile;
      },

      _onModelecomputeProfile: function(model, collected) {
          var that = this;
          this.models.search.input.set("boostings.userprofile",
                                       this._recomputePersonalizationProfile(collected),
                                       {silent:true});
      },

      personalizeSearch: function(boost, options) {
        var options = options || {},
            boostingsModel;

        if (this._personalizeSearchBoost == boost) {
          return ;
        }

        this._personalizeSearchBoost = boost;

        // 2 cases
        if (boost > 0) {
          if (!this.models.collected) return;

          // introduce the
          this.models.search.input.set("boostings.userprofile",
                                       this._recomputePersonalizationProfile(this.models.collected),
                                       options);
          this.models.collected.on("add remove", this._onModelecomputeProfile, this);
        }
        else {
          this.models.collected.off("add remove", this._onModelecomputeProfile, this);
          boostingsModel = this.models.search.input.submodel("boostings");
          boostingsModel.unset("userprofile", { silent: true });
          boostingsModel.dispose();
          this.models.search.input.set("boostings.profiledboost", options);
        }
      },

      changeOrderBy: function (options) {
        this.models.search.set("orderby", options.eventTarget.value);
      },

      changeGroupBy: function (options) {
        var value = options.eventTarget.value;
        if (value) {
          this.models.search.set("groupby.property", value);
        } else {
          this.models.search.unset("groupby");
        }
      },

      getUserConstraints: function () {
        return this.models.search.input.get("user.constraints");
      },

      setUserConstraints: function (userConstraints) {
        if (userConstraints) {
          this.models.search.set("user.constraints", userConstraints);
        } else {
          this.models.search.unset("user.constraints");
        }
      },

      getUnparsedUserQueryPath: function () {
        var queryFieldInfo = this.formqueryadapter.queryField(),
            userQueryPath = ["user", "query"].concat(queryFieldInfo.path).concat("unparsed");

        return userQueryPath;
      },

      getUnparsedUserQuery: function () {
        return this.models.search.input.get(this.getUnparsedUserQueryPath());
      },

      setUnparsedUserQuery: function (unparsedUserQuery, options) {
        var userQueryPath = this.getUnparsedUserQueryPath()

        if (unparsedUserQuery) {
          options = _.extend({}, options, {path: userQueryPath});
          this.models.search.set(null, unparsedUserQuery, options);
        } else {
          this.models.search.unset(userQueryPath, options);
        }
      },

      // openSearch
      // ----------
      //
      // API: Public Action
      //
      // ### Paramters
      //
      // * **href** the OpenSearch-URL, can also be specfified with the attribute data-href instead
      // * **[searchTerms]** a pre-replacement of searchTerms, e.g. "{searchTerms} product" will yield a search for the user query and product
      openSearch: function (options) {
        var searchTerms = options.searchTerms || "{searchTerms}",
            href = options.href || options.eventTarget.getAttribute("data-href"),
            unparsedUserQuery = this.getUnparsedUserQuery(),
            query, url;

        if (!href) return;

        if (unparsedUserQuery) {
          query = searchTerms.replace(/\{searchTerms\}/g, unparsedUserQuery);
          url = href.replace(/\{searchTerms\}/g, encodeURIComponent(query));
          url = url.replace(/\{language\}/g, i18n.locale);
          window.open(url);
        } else {
          this.displayWarning(i18n("missing_query"));
        }
      }

  });

  Application.VERSION = "17.2.6.714";

  Mindbreeze.require(["client/export"]);

  return Application;
 });

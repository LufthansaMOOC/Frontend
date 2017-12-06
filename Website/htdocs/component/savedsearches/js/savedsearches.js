/*========================================================================
* $Id: savedsearches.js 98682 2017-06-06 13:23:58Z daniel.eppensteiner $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2014
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/

define(
"component!savedsearches",
[
  "client/template",
  "i18n/i18n",
  "component!base",
  "client/views/list",
  "api/v2/search",
  "model/persisted_collection",
  "service/stub",
  "utils/browser",
  "utils/clone",
  "utils/dom",
  "utils/jsonpath",
  "utils/localStorage",
  "backbone",
  "underscore",
  "jquery",
  "utils/inplace-edit"
], function (
  Template,
  i18n,
  Base,
  ListView,
  Search,
  PersistedCollection,
  Stub,
  Browser,
  clone,
  dom,
  JSONPath,
  localStorage,
  Backbone,
  _,
  $
) {

 var ServerSavedSearch = Backbone.Model.extend({

   parse: function(atts) {
     if (atts && atts.request && atts.request.user) {
       atts.request.user = Search.SearchRequest.parseUser(atts.request.user);
     }
     return atts;
   },

   toJSON: function() {
     var atts = _.clone(this.attributes)
     if (atts && atts.request) {
       atts.request = Search.SearchRequest.jsonify(atts.request);
     }
     return atts;
   },

   get: function (key) {
     if (key === "id") {
       return this.cid;
     }
     return Backbone.Model.prototype.get.apply(this, arguments);
   },

   toText: function () {
     var a = document.createElement("a");
     a.href = this.get("url");

     return this.get("name") + ": " + a.href;
   },

   toHtml: function () {
     var a = document.createElement("a");
     a.href = this.get("url");

     return '<a href="' + a.href + '">' + this.get("name") + "</a>";
   },

   getUser: function() {
    if (this.attributes && this.attributes.request)
      return this.attributes.request.user;
    return null;
   },

   getOrderBy: function() {
    if (this.attributes && this.attributes.request)
      return this.attributes.request.orderby;
    return null;
   }

 });

  // TODO Convert ?
 var SavedSearch = Backbone.Model.extend({

   parse: ServerSavedSearch.prototype.parse,

   get: function (key) {
     if (key === "id") {
       return this.cid;
     }
     return Backbone.Model.prototype.get.apply(this, arguments);
   },

   toText: function () {
     var a = document.createElement("a");
     a.href = this.get("url");

     return this.get("name") + ": " + a.href;
   },

   toHtml: function () {
     var a = document.createElement("a");
     a.href = this.get("url");

     return '<a href="' + a.href + '">' + this.get("name") + "</a>";
   },

   getUser: function() {
    if (this.attributes && this.attributes.user)
      return this.attributes.user;
    if (this.attributes && this.attributes.request)
      return this.attributes.request.user;

    return null;
   },

   getOrderBy: function() {
    if (this.attributes && this.attributes.orderby)
      return this.attributes.orderby;
    if (this.attributes && this.attributes.request)
      return this.attributes.request.orderby;
    return null;
   },

   save: function () {
     if (this.collection)
      this.collection.sync("update");
   }


 });

 var focusAfterNextComputed = function (application, selector) {
   var changeFocus = true
   $(document.body).on("focusin.mb-savedsearches", function (e) {
       changeFocus = false;
   });
   application.models.search.once("computed", function () {
     _.defer(function () {
         $(document.body).off(".mb-savedsearches");
         if (changeFocus) {
           dom.focus($(selector));
         }
     });
   });
 };

  var ServerSavedSearchesCollection = PersistedCollection.extend({
     model: ServerSavedSearch,

     _namePrefix: i18n("saved_search") + " ",

     initialize: function () {
       PersistedCollection.prototype.initialize.apply(this, arguments);

     },

     parse: function(response) {
      // TODO: handle this in concrete implementation.
        var persistedQueries = response.persisted_queries;
        var that = this;
        // if (_.isArray(persistedQueries)) {
        // persistedQueries = _.map(persistedQueries, function(attrs) { return that._prepareModel(attrs); })
        // }
        return persistedQueries
     } ,

     // transforms "optimized" unparsed queries to new format
     _prepareModel: function (attrs, options) {
       var model = PersistedCollection.prototype._prepareModel.apply(this, arguments),
           user = model.get("request.user"),
           unparsedUserQuery = user && user.query && user.query.unparsed;

       if (unparsedUserQuery) {
         model.set("request", {user: { query: { and: { query: { unparsed: unparsedUserQuery } } } }});
       }
       return model;
     }

  });


 var SavedSearchesCollection = Backbone.Collection.extend({
   model: SavedSearch,

   _namePrefix: i18n("saved_search") + " ",

   initialize: function () {
     this.listenTo(this, "add", this.save);
     this.listenTo(this, "update", this.save);
     this.listenTo(this, "remove", this.save);

   },


   save: function () {
     this.sync("update");
   },

   // transforms "optimized" unparsed queries to new format
   _prepareModel: function (attrs, options) {
     var model = Backbone.Collection.prototype._prepareModel.apply(this, arguments);
     var user = model.get("user"),
         unparsedUserQuery = user && user.query && user.query.unparsed;

     if (unparsedUserQuery) {
       model.set("user", { query: { and: { query: { unparsed: unparsedUserQuery } } } });
     }

     return model;
   },

   sync: function (method) {
     var that = this;

     if (method === 'read') {
       try {
         var savedSearches = localStorage.mbSavedSearches && JSON.parse(localStorage.mbSavedSearches);
         _.forEach(savedSearches, function (savedSearch) {
             that.add(new SavedSearch(savedSearch, {parse: true}));
         });
       } catch (e) {
       }
     } else if (method === 'update') {
       try {
         localStorage.mbSavedSearches = JSON.stringify(this.toJSON());
       } catch (e) {
       }
     }
   }

});

var SavedSearches = Template.extend({

   hasContent: function () {
     return true;
   },

   createView: function(options)  {
     options = _.extend(
       this.attributeModel.getCamelCase(),
       this.get(),
       options,
       {
         elementTemplate: this.node.children[0].template,
         datasourcetabs: this.get("datasourcetabs")
       }
     );
     delete options.node;

     return Template.prototype.createView.apply(this, [options]);
   },

   schema: new Template.Schema({
     attributes: {
       serversaved: {
         type: "boolean",
         title: "saved_search",
         "default": false,
         visible: false
       },
       "save-export-properties": {
        type: "boolean",
        title: "save-export-properties",
        "default:": false
       }
     }
   }),

});

SavedSearches.DEFAULT_TEMPLATE = '<script type="text/x-mustache-template" data-class-name="mb-line-item"><a id="{{id}}" tabindex="0" role="button" class="mb-tooltip btn-link" data-action-object="{&quot;executeSavedSearch&quot;: {}}"><h3 class="mb-text" data-event-mask="dblclick|taphold" data-edit data-action-object="{&quot;inplaceEdit&quot;: {}}">{{name}}</h3></a><div class="pull-right"><button class="action mb-btn-no-decor" data-action-object="{&quot;destroyModel&quot;: {}}" title="{{i18n.action_delete}}" aria-describedby="{{id}}"><i class="icon-trash"></i><span class="mb-acc">' + i18n('action_delete') + '</span></button></div></' + 'script>';

var MyListView = ListView.extend({

  setModel: function() {
    ListView.prototype.setModel.apply(this, arguments);
    if (this.model) this.listenTo(this.model, "reset", this.addAll);

  },

  addAll: function(collection, options) {
    for (var i = 0; i < collection.models.length; i++) {
      this.addOne(collection.models[i], collection, options);
    }
  }

});
MyListView.EntryView = ListView.EntryView.extend({

   createChildView: function (options) {
     options = _.extend(
       {
         modelType: "SavedSearch",
         focusNext: true
       },
       options
     );
     return this.options.childViewConstructor.createView(options);
   }

});

SavedSearches.View = Base.extend({

   defaultOptions: {
     titleTagName: "h2"
   },

   initialize: function () {
     var that = this;
     this.model = this._createApplicationModelIfNotAvailable();

     var saveExportProperties = Boolean(this.options.saveExportProperties);

     Base.prototype.initialize.apply(this, arguments);

     this.options = _.extend({
         childViewConstructor: this.options.elementTemplate
       }, this.defaultOptions, this.options);

     this.titleEl = this.make(this.options.titleTagName, {
           "class": this.options.titleClassName,
           "id": "savedsearches-title-" + this.cid
         }, i18n("saved_searches"))
     this.appendChild(this.titleEl);

     $(this.titleEl).attr("data-i18n", "saved_searches");

     if (!this.el.hasAttribute("role") && !this.el.hasAttribute("aria-label") && !this.el.hasAttribute("aria-labelledby")) {
       this.$el.attr("role", "region");
       this.$el.attr("aria-labelledby", "savedsearches-title-" + this.cid);
     }

     this.$hint = this.make("small", { "class" : "mb-hint"});

     var title = this.make("span", { "data-i18n" : "save_search_hint"}, i18n("save_search_hint"));
     var icon = this.make("button", { "data-action-object":'{"saveSearch": {}}' ,"class" : "btn btn-link", "data-enable-if-model-valid":"search", "disabled":"disabled", "title":"" + i18n("save_search") + ""});
     $(icon).append('<i class="icon-save"></i><span class="mb-acc">"' + i18n("save_search") + '"</span>');
     this.$hint.appendChild(title)
     this.$hint.appendChild(icon)

     this.appendChild(this.$hint);

     this.list = new MyListView(_.extend({
           childViewConstructor: this.options.elementTemplate
         }, this.defaultOptions, this.options, {
           el: null,
           model: this.model
     }));
     this.appendChild(this.list.render().el);

     this.options.application.executeSavedSearch = this.options.application.executeSavedSearch || function (options) {
       var reactivate = this.models.search.isActivated(),
           controlledId;

       this.models.search.deactivate();
       this.changeView({
           name: options.model.get("selected_tab_name") || options.model.get("selectedTabName")
       });

       var export_properties = options.model.get("selected_export_properties") || false;
       if (export_properties) {
        this.models.exportProperties.set({"properties": export_properties});
       }

       this.models.search.set("orderby", clone(options.model.getOrderBy()));
       if (reactivate) this.models.search.activate({ silent: true });
       this.models.search.set("user", clone(options.model.getUser()), { forceUIUpdate: true });


       controlledId = options.sender.$el.closest("[aria-controls]").attr("aria-controls");
       if (controlledId) {
         focusAfterNextComputed(this, "#" + controlledId);
      }
     };

     this.options.application.saveSearch = this.options.application.saveSearch || function (options) {
       var user = this.models.search.input.get("user")  && clone(this.models.search.input.get("user"));
       var orderby = this.models.search.input.get("orderby")  && clone(this.models.search.input.get("orderby"));
       var userQuery = null;
       var queryFieldInfo = {path: []};
       var callback;

       if (user && user.query) {
         var queryFieldInfo = this.formqueryadapter.queryField() || {path: []};
         userQuery = JSONPath.get(user.query, queryFieldInfo.path);
       }
       var name = this.models.savedSearches.nameFromQuery(userQuery) || this.models.savedSearches.nextName();

       if (user) {
         var attrs = {
           name: name,
           request: {
             user:   user,
             orderby: orderby
           },
           selected_tab_name: this.models.search.get("source_context.constraints.view.name"),
           edit: true
         };
         if (saveExportProperties) {
           var exportProperties = this.models.exportProperties && this.models.exportProperties.get("properties");
           if (exportProperties) attrs.selected_export_properties = exportProperties;
         }

         var search = new that.model.model(attrs, {parse: false});

        callback = _.bind(function (application, view, model) {
           if (model !== search) return;

           _.defer(_.bind(function () {
             if (view.$el[0].parentNode) {
               dom.focus(view.$el);
               this.stopListening(this.views, "afterRender:SavedSearch", callback);
             }
           }, this));
         }, this);

         this.listenTo(this.views, "afterRender:SavedSearch", callback);
         that.model.add(search);
       }
     };
   },

   _createApplicationModelIfNotAvailable: function () {
     var application = this.options.application;
     var appPathname = window.location.pathname;

     if (this.options.serversaved) {
      var model = application.models.savedSearches = application.models.savedSearches || (function () {
        var collection = new ServerSavedSearchesCollection(null,
          {serviceStub: new Stub({path: "persistedqueries"}),
           channels: application.models.defaultChannels,
           appid: appPathname});

        collection.fetch();
        return collection;
      })();
     } else {
      var model = application.models.savedSearches = application.models.savedSearches || (function () {
        var collection = new SavedSearchesCollection();
        collection.fetch();
        return collection;
      })();
     }

     this.options.application.emptySavedSearches = this.options.application.emptySavedSearches || function (options) {
       this.models.savedSearches.remove(this.models.savedSearches.models);
     };

     return model;
   }

 });

 return SavedSearches;
});

/*=======================================================================
 * $Id: application.js 95083 2016-12-15 10:48:33Z michael.biebl $
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
   "backbone",
   "moment",
   "underscore",
   "extensions",
   "client/application",
   "component!stack",
   "service/stub",
   "api/v2/personalization",
   "service/channel",
   "service/channels",
   "model/persisted_collection",
   "api/v2/resources",
   "jquery"
 ], function(
   Backbone,
   moment,
   _,
   Extensions,
   Application,
   Stack,
   Stub,
   Personalization,
   Channel,
   Channels,
   PersistedCollection,
   Resources,
   $
 	){

	var QueryProfiler = function(options) {
      this.application = options.application;
      this.listenTo(this.application, "destroy", this.destroy);
      options = options || {};
      var profilerSettings = options.profilerSettings || {};
      this.SEARCH_INTERVALL = profilerSettings.searchIntervalSeconds || 60;

      this.WEIGHT_PREVIEW = profilerSettings.actionWeightPreview || 0.5;
      this.WEIGHT_OPENHREF = profilerSettings.actionWeightOpenHREF || 1;

      if (options.parentProfiler) {
        this.parentProfiler = options.parentProfiler;
        this.queryContext = options.parentProfiler.queryContext;
      } else {
        this.queryContext = {query_id: this.getTime() };
        this.sessionContext = this.setNewSession();
      }

      this.currentQueryObject = null;
      this.currentRefinements = null;
      this.listenTo(this.application, "actionperformed", this.actionPerformed);
      this.listenTo(this.application, "changeUserQueryTab", this.afterChangeView)

      this.scrollTimer_preview = null;
      this.scrollTimer_window = null;


      this.userHasScrolled = false;
      //$(window).on("scroll", _.bind(this.handleWindowScrolling, this));
	}

    _.extend(QueryProfiler.prototype, Backbone.Events, {

      isPersonalizationEnabledForChannel: function(channelID) {
        try {
          var channelServices = this.application.models.sourceInfo.get(["sources", "sources", channelID, "services"]) || [];
          var personalizationServices =  _.filter(channelServices, function(info) { return info.id == "personalization"; });
          return personalizationServices && personalizationServices.length > 0;
        } catch (e) {
          return false;
        }
      },

      registerSearchModel: function(model) {
        this.listenTo(model, "changeinput", this.onUserQuery);
        this.listenTo(this.application.models.stack, "closeStack", this.stackClosed);
      },

      unregisterSearchModel: function(model) {
        this.stopListening(model);
      },

      handleWindowScrolling: function () {
        if (this.userHasScrolled) return;

        if (this.scrollTimer_window !== null) clearTimeout(this.scrollTimer_window);
        this.scrollTimer_window = setTimeout(_.bind(function() {
          this.userHasScrolled = true;
        }, this), 100);
      },

      afterChangeView: function(name, constraint) {
        if (!name) return;

        var extendedTab = constraint && constraint.and && constraint.and[1] && constraint.and[1].name;

        // Do not set the tab if not available
        // this.queryContext.app_tab_id = "";
        // this.queryContext.app_extend_tab_id = "";

        if (name) this.queryContext.app_tab_id = name;
        if (extendedTab) this.queryContext.app_extend_tab_id = extendedTab;
      },

      actionPerformed: function(actionName, options) {
        var weight = 0;
        var actionTrigger = "";
        var that = this;

        if (actionName == "preview") {
          weight = this.WEIGHT_PREVIEW;
          this.handleOpenPreview(options);

        } else if (actionName == "openHref") {
          weight = this.WEIGHT_OPENHREF;
          this.handleOpenFolder();

        } else if (actionName == "vote") {
          if (vote_action == "toggleCommentBox") return;
          var vote_options = options.actionargs && options.actionargs[0];
          var vote_weight = vote_options.weight;
          var vote_action = vote_options.action;

          if (vote_options.weight == "up") {
            weight = 1;
          } else if (vote_options.weight == "down") {
            weight = -1;
          }
          
          var comment = options.application.options.comment;
          options.application.options.comment = "";

        } else {
          return;
        }

        var resultID = options.model.get("location"),
            meskey = options.model.get("mes:key"),
            fqcategory = options.model.get("category") + ":" + options.model.get("categoryinstance");

        var resultChannel = options.model.channel;

        // nextPage
        if (resultID && resultChannel && this.isPersonalizationEnabledForChannel(resultChannel.id)) {
          var position = options.model.position;
          var stub = this.application.api.personalization.createStub();
          var responseObserver = _.extend({}, Backbone.Events);

          this.queryContext = this.getQueryContextProperties();

          var promise = stub.call(resultChannel,
                                  {
                                    "query_result":  {
                                    "query_context": this.queryContext,
                                    "result_id": resultID,
                                    "action": actionName,
                                    "action_trigger": actionTrigger,
                                    "position": position,
                                    "weight": weight,
                                    "fqcategory": fqcategory,
                                    "key": meskey,
                                    "comment": comment
                                    }
                                  },
                                  responseObserver
                                 );
          promise.always(function(val) {
            that.application.trigger("queryprofilerdone");
          });
        }
      },

      getQueryContextProperties: function (options) {

        var personalization = _.find(this.application.models.sourceInfo.get("sources.sources[0].services"), function(obj) { return obj.id == "personalization" });
        var properties = personalization.personalization_options && personalization.personalization_options.properties;
        if (properties && properties.length) {
          var that = this;
          this.queryContext.properties = [];
          _.each(properties, function(prop) {
            that.queryContext.properties.push({
              key: prop.key,
              value: that.getValueFromPersonalizationProperties(prop)
            })
          });
        }

        return this.queryContext;
      },

      getValueFromPersonalizationProperties: function (options) {
        if (options.source == "profile") {
          var profileAvailable = this.application.models.profileSettings && (this.application.models.profileSettings.length > 0);
          if (profileAvailable) { 
            var profile = this.application.models.profileSettings.models[0].get("data").settings; 
          } else { 
            var profile = false; 
          }
          if (profile && profile[options.field]) { return profile[options.field] + "" }

        } else if (options.source == "searchrequest") {
          var search_request = this.application.models.search.get("search_request");
          if (search_request && search_request[options.field]) { return search_request[options.field] + "" }

        } else if (options.source == "application") {
          /* specific usecase*/

        } else if (options.source == "result") {
          var search_result = this.application.models.search.get("resultset");
          if (search_result && search_result[options.field]) { return search_result[options.field] + "" }

        }
      },

      handleOpenPreview: function (options) {
        this.application.queryProfiler.options = options;
        this.sessionContext.actions.preview = {
          "start" : this.getTime()
        };

        $(document).on("scroll", _.bind(this.handlePreviewScrollEvent, this, options));
      },

      handlePreviewScrollEvent: function (options, e) {
        //todo arguments...
        if (arguments[1].type == "scroll") {
          if (this.scrollTimer_preview !== null) clearTimeout(this.scrollTimer_preview);
          this.scrollTimer_preview = setTimeout(_.bind(function() {

            var h = document.documentElement,
                b = document.body,
                st = 'scrollTop',
                sh = 'scrollHeight';

            var percent = parseInt( (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100 );
            var queryProfilerActions = this.application.queryProfiler.sessionContext.actions.preview;

            if ( (!queryProfilerActions || !queryProfilerActions.scrollPosition) || (queryProfilerActions.scrollPosition < percent) ) {
              this.application.queryProfiler.sessionContext.actions.preview.scrollPosition = percent;
            }

          }, options), 250);
        }
      },

      handleOpenFolder: function () {
        this.sessionContext.actions.openHref = {
          "start" : this.getTime()
        }
      },

      stackClosed: function (stackModel) {
        //preview stopListening
        $(document).off("scroll");

        if (stackModel && stackModel.get && this.sessionContext && this.sessionContext.actions && this.sessionContext.actions.preview && (this.sessionContext.actions.preview.start && !this.sessionContext.actions.preview.end) ) {
          this.sessionContext.actions.preview.end = this.getTime();
          var diff = ( this.sessionContext.actions.preview.end - this.sessionContext.actions.preview.start );
          this.setPersonalization(stackModel.get("actionOptions"));
        };
      },

      setPersonalization: function (options) {
        if (!this.sessionContext.actions.preview.end || !this.sessionContext.actions.preview.start) return;

        // var options = this.application.queryProfiler.options;

        var resultChannel = options.model && options.model.channel;

        if (resultChannel && this.isPersonalizationEnabledForChannel(resultChannel.id)) {

          var stub = this.application.api.personalization.createStub(),
              responseObserver = _.extend({}, Backbone.Events),
              resultID = options.model.get("location"),
              meskey = options.model.get("mes:key"),
              fqcategory = options.model.get("category") + ":" + options.model.get("categoryinstance"),
              scrollPosition = this.sessionContext.actions.preview.scrollPosition || 0,
              position = options.model.position;

          var duration_in_ms = this.sessionContext.actions.preview.end - this.sessionContext.actions.preview.start;

          var promise = stub.call(resultChannel,
                                  {
                                    "query_result":  {
                                      "query_context": this.application.queryProfiler.queryContext,
                                      "position": position,
                                      "result_id": resultID,
                                      "action": "previewClosed",
                                      "duration_in_ms": duration_in_ms,
                                      "scroll_position_in_percentage": scrollPosition,
                                      "fqcategory": fqcategory,
                                      "key": meskey
                                    }
                                  },
                                  responseObserver
                                 );
          promise.always(function() {
          });
        }

      },

      handleFocusEvent: function (e) {
        if (this.sessionContext && this.sessionContext.actions && this.sessionContext.actions.openHref && (this.sessionContext.actions.openHref.start && !this.sessionContext.actions.openHref.end) ) {
          this.sessionContext.actions.openHref.end = this.getTime();
          var diff = ( this.sessionContext.actions.openHref.end - this.sessionContext.actions.openHref.start ) / 1000;
        }
      },

      setQueryID: function(queryID) {
        this.queryContext.prev_query_id = this.queryContext.query_id || null;
        this.queryContext.prev_refinement_id = this.queryContext.refinement_id || null;
        this.queryContext.query_id = queryID;

        if (!this.queryContext.prev_refinement_id) delete this.queryContext.prev_refinement_id;
        delete this.queryContext.refinement_id;
      },

      setRefinementID: function(refinementID) {
        this.queryContext.prev_refinement_id = this.queryContext.refinement_id;
        this.queryContext.refinement_id = refinementID;
      },

      createRequestTransformer: function() {
        var that = this;
        return function(channel, request, options) {
          if (request.path == "search" && channel && channel.id && that.isPersonalizationEnabledForChannel(channel.id)) {
            request.query_context = that.queryContext;
            request.query_context_user_query = that.application.getUnparsedUserQuery();
          }
          return request;
        }
      },

      destroy: function() {
        this.stopListening();
      },

      onUserQuery: function(model, queryExpr) {
        // TODO: form query adapter...
      	var userQueryObject = model.get("user.query.and.query");

        var currentQueryObject = this.currentQueryObject;
      	if (!_.isEqual(currentQueryObject, userQueryObject)) {

          this.setQueryID(this.getTime());
          this.checkForNewSession();

          this.currentQueryObject = userQueryObject;
				} else {
					this.onQueryRefinement(model);
				}
			},

      checkForNewSession: function() {
        var prevQueryID = this.queryContext.prev_query_id,
            queryID = this.queryContext.query_id;

        var session_actions = this.sessionContext && this.sessionContext.actions,
            session_actions_timeout = false;

        if (!prevQueryID) return false;

        var queryDiff = ((queryID - prevQueryID) / 1000);

        if (queryDiff > this.SEARCH_INTERVALL) {
          this.sessionContext = this.setNewSession();
		}
      },

      setNewSession: function () {
        var prev_session_id = this.sessionContext && this.sessionContext.session_id;

        var session = {};
        session.actions = {};
        session.session_id = this.getTime();
        if (prev_session_id) session.prev_session_id = this.sessionContext.session_id;

        return session;
      },

      onQueryRefinement: function (model) {
        var constraintsObject = model.get("user.constraints");

        this.currentRefinements = constraintsObject;

        this.queryContext.prev_refinement_id = this.queryContext.refinement_id;
        this.queryContext.refinement_id = this.getTime();

        if (!this.queryContext.currentRefinements) delete this.queryContext.currentRefinements;
        if (!this.queryContext.prev_refinement_id) delete this.queryContext.prev_refinement_id;
      },

      getTime: function() {
        return new Date().getTime().toString();
      }

    });

   return QueryProfiler;
 });

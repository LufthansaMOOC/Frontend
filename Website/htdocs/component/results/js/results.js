/*========================================================================
* $Id: results.js 100385 2017-07-26 08:10:43Z daniel.eppensteiner $
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
    "component!base",
    "client/templateregistry",
    "utils/dom",
    "utils/trace",
    "jquery",
    "text!../mustache/template.mustache",
    "underscore",
    "backbone",
    "utils/browser",
    "jquery-ui-autocomplete"
  ], function(
    i18n,
    Search,
    Template,
    ComponentBase,
    TemplateRegistry,
    dom,
    Trace,
    $,
    DEFAULT_TEMPLATE,
    _,
    Backbone,
    browser
  ) {
    var ScrollSpyMini = function (scrollContainer, scrollTarget) {
      var that = this;

      if (scrollContainer.get(0) === document || scrollContainer.is("body")) scrollContainer = window;

      this.$scrollTarget = $(scrollTarget)
      this.$scrollTarget.on("focus", function () {
        that.activate(that.$scrollTarget);
      });

      var callback = _.bind(this.process, this);
      this.$scrollContainer = $(scrollContainer).on("scroll.mb.scroll-spy-mini.data-api", callback);
      $(window).on("resize.mb.scroll-spy-mini.data-api", callback);
      this.process();
    }
;
    _.extend(ScrollSpyMini.prototype, {

      pageY: function(elem) {
        return elem.offsetParent ? (elem.offsetTop + this.pageY(elem.offsetParent)) : elem.offsetTop;
      },


      process: function () {
        if (!this.$scrollTarget.is(":visible")) return; // we don't want to page, if the element is not visible

        var scrollTop    = this.$scrollContainer.scrollTop();
        var $el = this.$scrollTarget;
        var offsetMethod = this.$scrollContainer[0] == window ? 'offset' : 'position'

        // var offset = $el[offsetMethod]().top + (!$.isWindow(this.$scrollContainer.get(0)) && this.$scrollContainer.scrollTop());
        var offset = $el[offsetMethod]().top;
        if (!$.isWindow(this.$scrollContainer.get(0))) {
          var pageYContainer = this.pageY(this.$scrollContainer.get(0));
          var pageYEl = this.pageY($el.get(0));
          offset = pageYEl - pageYContainer;
        }
        var bottomOffset = offset - this.$scrollContainer.outerHeight();

        if (scrollTop >= bottomOffset) {
          this.activate($el);
          return;
        }
      },

      activate: function (target) {
        target.trigger('activate')
      },

      destroy: function () {
        // what about multiple instances?
        this.$scrollContainer.off("scroll.mb.scroll-spy-mini.data-api");
        $(window).off("resize.mb.scroll-spy-mini.data-api");
      }
    });

    var label = i18n("preview");

    TemplateRegistry.add({
        id: "result",
        name: "editor_result_title",
        weight: 3,

        getAdders: function (context) {
          return [{
              name: "editor_result_template_list_title",
              icon: "../img/imglist.png",
              options: {
                template: DEFAULT_TEMPLATE
              }
            },{
              name: "editor_result_template_imagegallery_title",
              icon: "../img/imggallery.png",
              options: {
                template: '<script type="text/x-mustache-template" data-tag-name="span"><a href="{{action}}" title="{{title}}">{{{icon}}}</a></script>'
              }
            },{
              name: "editor_result_template_table_title",
              icon: "../img/imgtable.png",
              options: {
                "data-template": "table",
                "data-properties": "mes:size,title",
                "no-default-template": true
              }
            },{
              name: "editor_result_template_map_title",
              icon: "../img/imgmap.png",
              options: {
                "data-template": "map",
                template: '<script type="text/x-mustache-template" data-tag-name="span"><a target="_blank" href="{{actions[0].href}}">{{{title}}}</a></script>'
              }
            },{
              name: "editor_result_template_timeline_title",
              icon: "../img/imgtimeline.png",
              options: {
                "data-template": "timeline",
                "no-default-template": true
              }
            },{
              name: "editor_result_template_suggestlist_title",
              icon: "../img/imgsuggestlist.png",
              options: {
                "data-template": "suggestlist",
                "no-default-template": true
              }
            }]
        },
        create: function (options) {
          var attributes = _.extend(
            {
              "data-template": "results"
            },
            _.reduce(options, function (filteredOptions, value, key) {
              if (/^data-/.test(key)) {
                filteredOptions[key] = value;
              }
              return filteredOptions;
            }, {})
          );
          return Backbone.View.prototype.make("div", attributes,
            options.template || (options["no-default-template"] === true ? "" : DEFAULT_TEMPLATE)
          );
        }

    });

    var ResultsTemplate = Template.extend({

      editableName: "editor_result_title",

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      schema: new Template.Schema({
        inputAttributes: {
          view: {
            type: "reference",
            reference: "view"
          },
          appendonscroll: {
            title: "editor_result_append_on_scroll",
            type: "boolean",
            defaultValue: false
          },
          grouped: {
            title: "editor_result_grouped",
            type: "boolean",
            defaultValue: false,
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

      getDefaultTemplateAsEl: function() {
        var html = this.getDefaultTemplate();
        if (html) {
          return dom.instantiate(html);
        }
      },

      getContent: function() { return this.children[0].template; },

      createView: function(options)  {
        var view = new ResultsView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el,
              resultTemplate: options.node.children[0].template,
              appendonscroll: this.el.getAttribute("data-appendonscroll") === "true",
              grouped: this.el.getAttribute("data-grouped") === "true",
              appendInBackground: this.el.getAttribute("data-appendinbackground") === "true"
        }));
        this.instances.push(view);
        return view;
      }
  });

  var ResultsView = ComponentBase.extend({

    // this.options
    // this.el
    // this.model

    setModel: function (model) {
      if (this.collection) {
        this.collection.off("add");
      }

      ComponentBase.prototype.setModel.apply(this, arguments);

      if (this.model) {
        this.collection = new Search.ResultCollection(this.getDisplayedProperties());
        this.collection.on("add", this.addOne, this);
        this.collection.on("remove", this.removeOne, this);
        this.collection.on("updated", this.computed, this);
        if (this.model.options && this.model.options.enableImmediateDisplayOfFederatedResults) {
          this.collection.on("reset", this.computed, this);
        }
        this.model.addResultCollection(this.collection);
      }
    },

    computing: function () {
      this.pagingAllowed = false;
      ComponentBase.prototype.computing.apply(this, arguments);
    },

    computed: function () {
      this.removeScrollPlaceholder();
      this.pagingAllowed = true;

      if (this.options.appendonscroll === true && this.model && this.model.get("resultset.next_avail") && !this.appendontablescroll) {
        _.defer(_.bind(this.appendScrollPlaceholder, this));
      }
      this.appendInBackgroundIfNeeded();
      ComponentBase.prototype.computed.apply(this, arguments);
    },

    appendInBackgroundIfNeeded: function() {
      if (this.options.appendInBackground === true && this.model && this.model.get("resultset.next_avail")) {
        _.defer(_.bind(this.appendInBackground, this));
      }
    },

    removeScrollPlaceholder: function () {
      $(this.scrollPlaceholder).off("activate");
      this.removeOwnedNode(this.scrollPlaceholder);

      delete this.scrollPlaceholder;

      if (this.scrollspy) {
        this.scrollspy.destroy();
        delete this.scrollspy;
      }
    },

    getDisplayedProperties: function () {
      return this.options.resultTemplate.properties;
    },

    /* TODO add this informatio to after Render? */
    _registerCollect: function(model, view) {
      if (this.options.application.models.collected) {
        var collectedItem = this.options.application.models.collected.get(model.get("location"));
        if (collectedItem) {
          view.$el.addClass("mb-collected");
        }
        view.listenTo(this.options.application.models.collected, "remove", function(model) {
          if (model.id == view.model.get("location")) {
            view.$el.removeClass("mb-collected");
          }
        }, view);
        view.listenTo(this.options.application.models.collected, "add", function(model) {
          if (model.id == view.model.get("location")) {
            view.$el.addClass("mb-collected");
          }
        }, view);

      }
    },

    addOne: function (model, collection, options) {
      var focus = document.activeElement === this.scrollPlaceholder || dom.isChild(document.activeElement, this.scrollPlaceholder);

      options = options || {};

      var leave = Trace.events.uiRender.enter(options.traceContext && options.traceContext.context, "results")
      try {
        var group = (model.get && model.get("mes:group")) || "";
        var position = options.at + (this.positionOffset || 0),
            view = this.options.resultTemplate.createView({model: model, application: this.options.application, "parent": this, modelType: "Result"}),
            viewEl = view.render().el;

        if (this.options.grouped) {
          this.insertGrouped(viewEl, position, group);
        }
        else {
          this.insertAt(viewEl, position);
        }

        if (focus) {
          dom.focus(viewEl, true);
        }

        this._registerCollect(model, view);
      } finally {
        leave.leave();
      }
      if (this.options.application && this.options.application.views) {
         this.options.application.views.trigger("afterRender:Result", this.options.application, view, model);
      }
      this.removeScrollPlaceholder();
    },

    removeOne: function (model) {
      var that = this;

      window.setTimeout(function () {
        _.each(that.groupEls, function (groupEl, key) {
          if (!groupEl.el.innerHTML && groupEl.parent.parentNode) {
            groupEl.parent.parentNode.removeChild(groupEl.parent);
          }
        });
      }, 0);
    },

    insertGrouped: function(viewEl, pos, group) {
      if (!this.groupEls) {
        this.groupEls = {};
      }
      if (group && _.isString(group.str)) group = group.str;

      var groupKey = group.toLowerCase();
      if (!this.groupEls[groupKey]) {
        var groupEl = this.make("div", {"data-group-id": groupKey, "class": "mb-result-group-container " + (groupKey.length > 0 ? groupKey.replace(/\s+/, "-") : "mb-empty-group")});
        var previousChild = null;
        var pos = -1;
        if (groupKey) {
          for (var i = 0; i < this.el.childNodes.length; i++) {
            try {
              var existingKey = this.el.childNodes[i].getAttribute("data-group-id");
              if (!existingKey) continue;
              if (groupKey < existingKey) {
                break;
              }
            } catch (e) {}
          }
        }
        if (pos == -1) {
          this.appendChild(groupEl, true);
        }
        else {
          this.insertAt(groupEl, pos, true);
        }

        if (group) {
          var titleEl = groupEl.appendChild(this.make("h2", {"class": "mb-group-title"}));
          titleEl.innerHTML =   group;
        }
        var el = groupEl.appendChild(this.make("div", {"class": "mb-group"}));
        this.groupEls[groupKey] = {parent: groupEl, el: el};
      }

      var el =  this.groupEls[groupKey].el;
      if (el.childNodes.length > pos) {
        el.insertBefore(viewEl, el.childNodes[pos]);
      } else {
        el.appendChild(viewEl);
      }

      if (!this.groupEls[groupKey].parent.parentNode) {
        this.appendChild(this.groupEls[groupKey].parent, true);
      }

      return this.groupEls[groupKey];
    },

    scrollPlaceholderAvailable: function() {
      return true;
    },

    appendScrollPlaceholderAndCreateScrollSpy: function() {
      var that = this;
      this.appendScrollPlaceholderEl();

      $(this.scrollPlaceholder).on("activate", function (e) {
        $(this.scrollPlaceholder).off("activate");
        that.page();
      });

      this.scrollspy = new ScrollSpyMini($(this.scrollPlaceholder).scrollParent(), this.scrollPlaceholder);
    },

    appendScrollPlaceholder: function () {
      if (this._removed || this.scrollPlaceholder) return;

      this.scrollPlaceholder = this.make(
          "h3",
          {
            "tabindex": "0",
            "class": "mb-scroll-placeholder mb-center mb-no-print"
          },
          '<div role="button" class="mb-pulse">' + i18n("loading_more_results") + '</div>'
      );

      if (this.scrollPlaceholderAvailable()) {
        this.appendScrollPlaceholderAndCreateScrollSpy();
      }
      else {
        this.once("scrollplaceholderavailable", this.appendScrollPlaceholderAndCreateScrollSpy, this);
      }
    },

    appendScrollPlaceholderEl: function () {
      this.appendChild(this.scrollPlaceholder, true);
    },

    appendInBackground: function() {
      if (this._removed) return;
      if (this.isComputing()) return;
      var that = this;
      this.handleActionObjectCall(
        {disablePropagateComputing: true,
         append: true,
         model: this.model, sender: this,
         computedCallback: function() {
           that.appendInBackgroundIfNeeded();
         }
        },
        "nextPage");
    },

    page: function () {
      if (this.isComputing()) return;
      if (!this.pagingAllowed) return;
      this.pagingAllowed = false;
      this.handleActionObjectCall({append: true, model: this.model, sender: this}, "nextPage");
    },

    render: function() {
      var el;

      return el;
    },

    remove: function () {
      this.removeScrollPlaceholder();
      ComponentBase.prototype.remove.apply(this, arguments);
      this.dispose();
      return this;
    },

    dispose: function () {
      this.collection.dispose();
    }
  });

  ResultsTemplate.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

  ResultsTemplate.View = ResultsView;

  return ResultsTemplate;
});

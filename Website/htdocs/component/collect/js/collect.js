/* global netscape */
/*========================================================================
* $Id: collect.js 115426 2017-11-08 08:21:25Z michael.biebl $
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
  "client/resourceinfo",
  "underscore",
  "backbone",
  "client/template",
  "component!base",
  "client/views/list",
  "api/v2/search",
  "jquery",
  "mustache",
  "utils/browser",
  "utils/dom",
  "extensions",
  "model/favorites-adapter",
  "model/persisted_collection_application_extensions"
  ], function (
  i18n,
  ResourceInfo,
  _,
  Backbone,
  Template,
  Base,
  ListView,
  Search,
  $,
  Mustache,
  browser,
  dom,
  Extensions,
  FavoritesAdapter
) {

  var CollectedCollection = Backbone.Collection.extend({
  });

  var LinkView = Base.extend({
    tagName: "button",
    className: "btn-link",

    events: function () {
      return _.extend({}, Base.prototype.events, { "click": "handleAction", "keypress": "handleAction" });
    },

    initialize: function () {
      Base.prototype.initialize.apply(this, arguments);

      this.$el.addClass("action");
    },

    render: function () {
      var icon = this.model.get("icon");
      if (/^ui-icon-folder-collapsed$/.test(icon)) {
        icon = "icon-folder-close"
      }
      if (icon) {
        icon = '<i class="' + icon + '"></i> ';
      } else {
        icon = "";
      }

      this.$el.attr("tabindex", "0");
      this.el.innerHTML = icon + this.model.get("label");
      if (this.options.describedById) {
        this.el.setAttribute("aria-describedby", this.options.describedById);
      }

      var actionObject = this.model.get("action_object");
      if (!actionObject) {
        actionObject = {
          extensionAction: {
            id: this.model.get("action")
          }
        }
      }
      this.el.setAttribute("data-action-object", JSON.stringify(actionObject));

      return this;
    },

    handleActionObjectCall: function (args, actionName, target) {
      var invokeInContext = this.options.invokeInContext;
      var label = this.model.get("label");

      args = _.clone(args);
      args.invokeInContext = function () {
        var callArgs = _.toArray(arguments);
        callArgs.push(label);
        invokeInContext.apply(this, callArgs);
      };
      Base.prototype.handleActionObjectCall.apply(this, [args, actionName, target]);
    }

  });

  var CollectedItemView = Base.extend({

    className: "mb-line-item",

    initialize: function () {
      this.options.modelType = this.options.modelType || "CollectedResult";
      Base.prototype.initialize.apply(this, arguments);
      this.render();

    },

    showTooltip: function () {
      var tooltipEl;

      if (this.options.resultsShortcutTooltipId) {
        tooltipEl = document.getElementById(this.options.resultsShortcutTooltipId);
        if (tooltipEl) {
          this.el.setAttribute("aria-describedby", this.options.resultsShortcutTooltipId);
          tooltipEl.removeAttribute("aria-hidden");
        }
        $("body").on("focusin.tooltip_" + this.cid, _.bind(this.handleBlur, this));
      }
    },

    handleBlur: function () {
      var tooltipEl;

      if (!dom.isChild(document.activeElement, this.el)) {
        $("body").off("focusin.tooltip_" + this.cid);
        tooltipEl = document.getElementById(this.options.resultsShortcutTooltipId);
        if (tooltipEl) {
          this.el.removeAttribute("aria-describedby");
          tooltipEl.setAttribute("aria-hidden", "true");
        }
      }
    },

    render: function () {
      var entryId = _.uniqueId("collected_result");

      this.el.innerHTML = '<span id="' + entryId + '">' + this.model.get("html") + '</span> <span class="pull-right"><button class="action mb-btn-no-decor" tabindex="0" data-action-object="{&quot;destroyModel&quot;: {}}" title="' + i18n("action_delete") + '" aria-describedby="' + entryId + '"><i class="icon-trash"></i><span class="mb-acc">' + i18n('action_delete') + '</span></button></span>';
      if (this.options.application && this.options.application.views && this.options.modelType)  {
        this.options.application.views.trigger("afterRender:"  + this.options.modelType, this.options.application, this, this.model);
      }
      return this;
    }

  });

  var CollectTemplate = Template.extend({
        schema: new Template.Schema({
          attributes: {
            favoritesCollectionPath: {
              type: "string",
              title: "editor_collect_favorites_collection_path"
            }
          }
        }),

        getOptions: function (options) {
          options = Template.prototype.getOptions.apply(this, arguments);
          return _.extend({}, options, this.schema ? this.schema.parseAttributes(this.attributeModel.getCamelCase()): this.attributeModel.getCamelCase());
        }
      }),
      CollectListView = ListView.extend({

        createEntryView: function (options) {
          options.resultsShortcutTooltipId = this.options.resultsShortcutTooltipId;
          return ListView.prototype.createEntryView.apply(this, arguments);
        }

      });



  CollectTemplate.View = Base.extend({

    className: "mb-collect-view",

    defaultOptions: {
      titleTagName: "h2"
    },

    initialize: function () {
      var that = this,
          titleId,
          resultsShortcut = this.options["results-shortcut"];

      if (resultsShortcut) {
        this.resultsShortcutTooltipId = this.cid + "_results_shortcut";
      }

      this.model = this._createApplicationModelIfNotAvailable();

      Base.prototype.initialize.apply(this, arguments);
      titleId = this.cid + "_title";

      this.$el.hide();

      this.titleEl = this.appendChild(this.make(this.options.titleTagName, { id: titleId,  "class": this.options.titleClassName || "" }, i18n("CollectWidgetTitle")), true)
      $(this.titleEl).attr("data-i18n", "CollectWidgetTitle");

      if (!this.el.hasAttribute("role") && !this.el.hasAttribute("aria-label") && !this.el.hasAttribute("aria-labelledby")) {
        this.$el.attr("role", "region");
        this.$el.attr("aria-labelledby", titleId);
      }

      this.collected = new CollectListView({
          model: this.model,
          childViewConstructor: CollectedItemView,
          application: this.options.application,
          resultsShortcutTooltipId: this.resultsShortcutTooltipId
      }).render();
      this.appendChild(this.collected.el);

      this.statusElement = $("<div/>");
      this.appendChild(this.statusElement.get(0), true);

      var invokeInContext = _.bind(this.invokeInContext, this)
      this.actionCollection = this._getActionCollection();
      this.actions = new (ListView.extend({
            createEntryView: function (options) {
              options = _.clone(options);
              options.collectView = that;
              options.invokeInContext = invokeInContext;
              options.describedById = titleId;
              return ListView.prototype.createEntryView.apply(this, [options]);
            }
      }))({
          tagName: "ul",
          className: "mb-role inline",
          entryTagName: "li",
          role: "toolbar",
          model: this.actionCollection,
          childViewConstructor: LinkView,
          application: this.options.application
      }).render();

      this.appendChild(this.actions.el);

      if (resultsShortcut) {
        this.resultsShortcutTooltipContainerEl = this.appendChild(this.make("div", {
              "style": "position: relative",
            },
            '<span id="' + this.resultsShortcutTooltipId + '" class="mb-role mb-bottom" role="tooltip" aria-hidden="true">' +
            i18n("results_shortcut_tooltip", [resultsShortcut]) +
            '</span>'
          ), true);
      }

      this.listenTo(this.model, "add", this.updateContent);
      this.listenTo(this.model, "remove", this.updateContent);
    },

    copyCollected: function () {
      try {
        var copyEl = document.createElement("div");
        copyEl.style.position = 'absolute';
        copyEl.style.top = '-9999px';
        copyEl.style.left = '-9999px';
        copyEl.innerHTML = _.map(this.model.models, function (model) {
          return "<div>" + model.get("html") + "</div>";
        }).join("");
        document.body.appendChild(copyEl);
        copyEl.contentEditable = true;

        if (document.createRange) {
          // FF & IE 9
          var range = document.createRange ();
          range.setStart (copyEl, 0);
          range.setEndAfter (copyEl.lastChild, 0);

          var selection = window.getSelection ();
          selection.removeAllRanges ();
          selection.addRange (range);

          try {
            document.execCommand ("copy", false, null);
          } catch (e) {
            try {
              // FF
              netscape.security.PrivilegeManager.enablePrivilege ("UniversalXPConnect");
              document.execCommand ("copy", false, null);
            } catch (e) {
            }
          }
        } else {
          // IE 7 & 8
          var range = document.body.createTextRange();
          range.moveToElementText(copyEl);
          range.execCommand('copy');
        }

        copyEl.parentNode.removeChild(copyEl);
      } catch (e) {
        this.showStatusMessage(null, "error", i18n("Copy"));
      }
    },

    emptyCollected: function () {
      this.model.remove(this.model.models);
    },

    _getActionCollection: function () {
      var actions = [];

      var copySupported =  $.browser.msie || browser.hasIEVendorPrefix();
      if (copySupported) {
        actions.push({
            label: i18n("Copy"),
            icon: "icon-copy",
            collected: this.model,
            action_object: {
              copyCollected: {}
            }
        });
      }

      actions.push({
        label: i18n("EmptyList"),
        icon: "icon-trash",
        collected: this.model,
        action_object: {
          emptyModel: {
            path: "collected"
          }
        }
      });

      var extensions = _.filter(Extensions.extensions.getExtensionsForExtensionPoint('mindbreeze.client.ui.Action'), function (extension) {
        return extension.kind === 'CollectAction';
      });

      return new Backbone.Collection(actions.concat(extensions));
    },

    updateContent: function () {
      this.showStatusMessage();

      if (this.model.length > 0) {
        if (!this.$el.is(":visible")) {
          this.$el.slideDown();
        }
      } else {
        this.$el.hide();
      }
    },

    invokeInContext: function (serviceName, methodName, identifier, actionName) {
      var that = this;
      var target = this.$el;

      target.addClass('mb-computing');
      this.showStatusMessage();

      Extensions.invokeInContextHelper(
        serviceName,
        methodName,
        identifier,
        function (response) {
          target.removeClass('mb-computing');
          that.handleCheckoutCollectedResultsResponse(response, actionName);
        },
        {
          collected_result: _.map(that.options.application.models.collected.models, function (model) { return model.toJSON(); })
        }
      );
    },

    handleCheckoutCollectedResultsResponse: function (response, actionName) {
      if (!response) return;

      if (response.status) {
        this.showStatusMessage(response.status.msg, response.status.code, actionName);
        if (/error/i.test(response.status.code)) {
          return;
        }
      }

      if (response.empty_collected_results) {
        this.emptyCollectedResults();
      }
    },

    emptyCollectedResults: function () {
      this.options.application.models.collected.remove(this.options.application.models.collected.models);
    },

    showStatusMessage: function (message, type, actionName) {
      type = (type || 'success').toLowerCase();
      message = message || (type === 'error' && i18n('error_checkout_collected_results', [actionName]));

      var hideAfterDelay = false,
          element,
          image;

      this.statusElement.html('');

      if (!message) {
        return;
      }

      if (type === 'success') {
        hideAfterDelay = true;
      } else if (type === 'error') {
        image = '<i class="icon-warning-sign"></i>'
      }

      element = $(Mustache.to_html('<div class="mb-{{type}}">{{{image}}} {{message}}</div>', {
        message: message,
        type: type,
        image: image
      }));

      this.statusElement.prepend(element);

      if (hideAfterDelay) {
        element.delay(2000).slideUp();
      }
    },

    _createApplicationModelIfNotAvailable: function () {
      var application = this.options.application;

      var model = application.models.collected = application.models.collected || new CollectedCollection();

      if (this.options.favoritesCollectionPath && !/^\$\$FAVORITES_COLLECTION_PATH\$\$$/.test(this.options.favoritesCollectionPath)) {
        new FavoritesAdapter({
          persistedCollection: application.getModel("persistedresources:" + this.options.favoritesCollectionPath),
          connectedCollection: model,
          namePath: "html",
          keyPath: "id",
          type: "collectedResult"
        });
      }

      application.collectResult = application.collectResult || this.collectResult;
      application.copyCollected = application.copyCollected || function (options) {
        return options.sender.options.collectView.copyCollected();
      };

      application.models.search.addResultCollection(new Search.ResultCollection({
              "mes:key": {
                format: "VALUE"
              }
            }));

      application.trigger("addmodel:collected", model);

      return model;
    },

    collectResult: function (options) {
      var href = options.model.get("actions[0].href");
      var icon = options.model.get("icon", { format: "HTML" });
      var text = options.model.get("title");
      var callback,
          application = this;

      var html = options.model.get("title");

      var rex = /(<([^>]+)>)/ig;
      if (!_.isObject(html)) html = html.replace(rex, "");
      if (!_.isObject(text)) text = text.replace(rex, "");

      if (html.data && html.data.length > 0) {
        html = html.data[0].html;
      }

      if (icon) {
        html = icon + " " + html;
      }

      if (href) {
        html = '<a href="' + href + '" target="_blank">' + html + '</a>'
      }

      var collectedModel = new Backbone.Model({
        id: options.model.get("location"),
        text: text,
        html: html,
        link: [{
          href: {
            url: options.model.get("actions[0].href"),// TODO: this.contentFetchOrFirstActionLink(),
          }
        }],
        key: options.model.get("mes:key"),
        model: options.model.get()
      });

      callback = function (application, view, model) {
        if (model !== collectedModel) return;

        _.defer(function () {
            if (view.$el[0].parentNode) {
              dom.focus(view.$el);

              view.showTooltip();

              application.stopListening(application.views, "afterRender:CollectedResult", callback);
            }
          });
      };

      application.listenTo(application.views, "afterRender:CollectedResult", callback);
      this.models.collected.add(collectedModel);
    },

    remove: function (model) {
      if (model && model !== this.model) return; // don't delete for other models

      this.collected.remove();
      this.actions.remove();
      Base.prototype.initialize.apply(this, arguments);
    }

  });

  CollectTemplate.CollectListView = CollectListView;
  CollectTemplate.CollectedItemView = CollectedItemView;

  return CollectTemplate;
});

/*========================================================================
* $Id: base.js 115896 2017-11-08 14:41:07Z daniel.eppensteiner $
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
* ## Available data-attributes for actions
*
* ### data-toggle="fulltext"
*
* On click: displays a modal dialog for an element if the content is clipped
*
*/

define([
    "backbone",
    "underscore",
    "utils/trace",
    "utils/keys",
    "utils/dom",
    "i18n/i18n",
    "jquery",
    "jquery-taphold"
  ],
  function(
    Backbone,
    _,
    Trace,
    keys,
    dom,
    i18n,
    $
  ) {

    // The base component for all Mindbreeze components.
    // Automatically handles
    //  * computing state by setting a CSS-class
    //  * handling actions by calling set on model
    //  * removal of component, if model is removed/destroyed

    // important members:

    //    el                    - the current element
    //    options.template.el   - used to check if

    // important options:

    //    focusNext: if true focuses next focusable element when component is removed (Default: false)
    
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;

    var BaseView = Backbone.View.extend({
      tagName: "div",

      events: {
        "click a, *.action, *[data-action-object], *[data-action-name]": "handleAction",
        "keypress a, *.action, *[data-action-object]": "handleAction",
        "click [data-toggle='fulltext']": "showModalWhenClipped",
        "mouseenter [data-toggle='fulltext']": "updateCursorForClippedElement",
        "change select[data-action-object]": "handleAction",
        "click button.edit": "edit",
        "click button.delete": "delete",
        "dblclick *[data-action-object]": "handleAction",
        "taphold *[data-action-object]": "handleAction",
        "keypress button.edit": "edit",
        "keypress button.delete": "delete"
      },

      // var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

      initialize: function(args) {
        if (this.defaultOptions) {
          this.options = _.extend({}, this.defaultOptions, this.options);
        }

        this.ownedNodes = [];

        if (this.options.role && !this.el.getAttribute("role")) {
          this.el.setAttribute("role", this.options.role);
          if (!/presentation|tooltip/i.test(this.options.role)) {
            this.el.setAttribute("tabindex", "0");
          }
        }

        this.setModel(this.model);

        if (this.options.application && this.options.application.editing) {
          this.setEditable(true);
        } else {
          this.setEditable(false);
        }

        var eventPattern = /^data-on(.+)$/;
        for (var i = 0; i < this.el.attributes.length; ++i) {
          var att = this.el.attributes[i];
          var matches = att.name.match(eventPattern);
          if (matches && matches[1]) {
            var handleFunction = _.bind(new Function("application", "view", "event", att.value), this.el, this.options.application, this);
            $(this.el).on(matches[1], handleFunction);
          }
        }
        
      },

      // copy of original Backbone version to add instrumentation
      delegateEvents: function(events) {
        if (!(events || (events = _.result(this, 'events')))) return this;
        this.undelegateEvents();
        for (var key in events) {
          var method = events[key];
          if (!_.isFunction(method)) method = this[events[key]];
          if (!method) continue;

          var match = key.match(delegateEventSplitter);
          var eventName = match[1], selector = match[2];
          method = _.bind(method, this)

          if (this.doInstrument(events[key])) {
            method = Trace.instrument(method, "uiAction", function (handlerName) {
               return function (e) {
                 var parameters = [handlerName];
                 if (e && e.target) {
                   parameters.push(e.target.className);
                 }
                 return parameters;
               }
             }(events[key]));
          }

          eventName += '.delegateEvents' + this.cid;
          if (selector === '') {
            this.$el.on(eventName, method);
          } else {
            this.$el.on(eventName, selector, method);
          }
        }
        return this;
      },

      // returns true if a event handler should be instrumented
      doInstrument: function (handlerName) {
        if (/handleAction$|openHref/i.test(handlerName)) return false;

        return true;
      },

      render: function() {
        return this;
      },

      setEditable: function (editable) {
        if (editable) {
          this.insertAt(this.getEditControls(), 0, true);
          this.$el.addClass("mb-editable");
        } else {
          this.$el.removeClass("mb-editable");
        }
      },

      edit: function (e) {
        if (this.editingDisabled) return;

        if (e && "keypress" === e.type && e.which !== 13) {
          return true;
        }
        if (e) e.stopPropagation();
        if (this.options.template.editable) {
          this.options.application.editTemplate(this.options.template);
        }
      },
      
      "delete": function (e) {
        if (this.editingDisabled) return;

        if (e && "keypress" === e.type && e.which !== 13) {
          return true;
        }
        this.setEditable(false);
        this.options.application.deleteTemplate(this.options.template);
      },

      disableEditing: function () {
        this.editingDisabled = true;
      },

      getEditControls: function () {
        return this.make("div", {
            "class": "mb-edit-bar"
          },
          (this.options.template && this.options.template.editable ? "<button class=\"btn edit\"><i class=\"icon-pencil\"></i></button>\n" : "" )+
          "<button class=\"btn delete\"><i class=\"icon-trash\"></i></button>\n" +
          "<span class=\"btn mb-drag-handle\"><i class=\"icon-move\"></i></span>"
        );
      },

      change: function (model, options) {
        //console.log("BaseComponent change: ", model);
        options = options || {};

        if (options.removed) {
          this.remove();
        }
      },

      handleAction: function (e, traceContext) {
        var eventType = e.currentTarget.getAttribute("data-event-mask") || "keypress|click";
        if (e.currentTarget.disabled === true) {
          return true;
        }
        if (!new RegExp(eventType).test(e.type)) {
          return true;
        }
        if (e && "keypress" === e.type && (e.which !== keys.enter && !(e.which === keys.space && /button/i.test(e.currentTarget.getAttribute("role"))))) {
          return true;
        }
        
        if (this.options.application && _.isFunction(this.options.application.closeMenus)) {
          this.options.application.closeMenus();
        }

        var target = e.currentTarget;
        var stopEvent = !/checkbox|radio/i.test(target.type);
        var result = undefined;

        var actionObject = target.getAttribute("data-action-object");
        var actionName = target.getAttribute("data-action-name");

        var action = target.getAttribute("data-action");
        var key = target.getAttribute("data-name");
        var addKey = target.getAttribute("data-add");
        var unsetKey = target.getAttribute("data-unset");        
        var value = target.getAttribute("data-value");
        var ref = target.getAttribute("data-ref");
        var href = target.getAttribute("href");
        var handled = false;

        var dataAttr = new dom.AttributeModel(target, "data-").getCamelCase();
        if (dataAttr.actionName) {
          delete dataAttr.actionName;
        }

        if (!value && /checkbox|radio/i.test(target.type)) value = target.checked;

        var focused = $(":focus");

        if (actionObject && e && e.handleObj && e.handleObj.selector && !e.handleObj.selector.match(/.*\[data-action-object\]/))
            return !stopEvent;

        // TODO: schema on model?
        try {
          value = JSON.parse(value);
        } catch (e) {
        }

        if (ref) {
          value = this.getActionModel(e).output.get(ref);
        }
        if (!actionObject) {
           if (actionName) {
            actionObject = {};
            actionObject[actionName] = dataAttr
          }
          else if (key) {
            actionObject = {
              setValue: {
                key: key,
                value: value
              }
            }
          }
          else if (addKey) {
            actionObject = {
              addValue: {
                key: addKey,
                value: value
              }
            }
          }
          else if (unsetKey) {
            actionObject = {
              unsetValue: {
                key: unsetKey,
              }
            }
          }
          else if (action) {
            handled = true;
            var handleFunction = new Function("application", "view", action);
            try {
              handleFunction.apply(this.getActionModel(e), [this.options.application, this]);
            } catch (e) {
              console.error("Failed to execute action", JSON.stringify(action), e);
            }
          } else if (href) {
            actionObject = {
              openHref: {
                href: href
              }
            };
          }
        }

        if (actionObject) {
          handled = true;
          if (/string/i.test(typeof actionObject)) {
            actionObject = JSON.parse(actionObject);
          }
          try {
            _.forEach(actionObject, _.bind(function (args, actionName) {
                  var returnValue = this.handleActionObjectCall(args, actionName, target, focused, traceContext, e);
                  if (result !== false) {
                    result = returnValue;
                  }
                }, this));
            if(actionObject.stopPropagation) stopEvent = true;
          } catch (e) {
            console.error("Failed to execute action", actionObject, e.stack, e);
          }
        }

        if (handled && (typeof result === "undefined" || result === false)) {
          if (stopEvent && !e.enforceDefault) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      },

      handleActionObjectCall: function (args, actionName, target, focused, traceContext, e) {
        return this.options.application.handleAction(args, actionName, target, this.getActionModel(e), this, focused, traceContext, e);
      },

      getActionModel: function (e) {
        return this.model;
      },

      $getOrCreateInfoModal: function () {
        if (this.$infoModal) return this.$infoModal;

        this.$infoModal = $('<div class="modal hide fade" tabindex="-1" role="dialog" aria-label="' + i18n('info_header') + '" aria-hidden="true">' +
            '<div class="modal-body">' +
              '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
              '<p class="mb-modal-content"></p>' +
            '</div>' +
          '</div>');
          $(document.body).append(this.$infoModal);
          return this.$infoModal;
      },

      showModalWhenClipped: function (e) {
        var targetEl = e.currentTarget,
            $infoModal

        if (dom.isClipped(targetEl)) {
          $infoModal = this.$getOrCreateInfoModal();
          $infoModal.find('.mb-modal-content').html(targetEl.innerHTML);
          $infoModal.modal();

          e.preventDefault();
          e.stopPropagation();
        }
      },

      updateCursorForClippedElement: function (e) {
        var targetEl = e.currentTarget;
        if (dom.isClipped(targetEl)) {
          $(targetEl).addClass("mb-clickable");
        } else {
          $(targetEl).removeClass("mb-clickable");
        }
      },

      setModel: function (model) {
        if (this.model) {
          this.stopListening(this.model);
        }

        this.model = model;

        if (this.model) {
          this.listenTo(this.model, 'computing', this.computing);
          this.listenTo(this.model, 'computed', this.computed);
          this.listenTo(this.model, 'aborted', this.aborted);
          this.listenTo(this.model, 'change', this.change);
          this.listenTo(this.model, 'remove', this.remove);
          this.listenTo(this.model, 'destroy', this.remove);
        }
      },

      // Begin DOM related code
      // TODO: factor out into a document fragment like interface

      appendChild: function(node, track) {
        if (!node) return;
        this.el.appendChild(node);
        if (track) this.getOrCreateOwnNodes().push(node);

        return node;
      },

      getOrCreateOwnNodes: function() {
        if (this.ownedNodes == null) {
          this.ownedNodes = [];
        }
        return this.ownedNodes;
      },
      
      insertBefore: function(node, pos, track) {
        if (!node || !pos) return;
        this.el.insertBefore(node, pos);
        if (track) this.getOrCreateOwnNodes().push(node);

        return node;
      },

      insertAt: function(node, pos, track) {
        if (this.el.childNodes.length > pos) {
          this.insertBefore(node, this.el.childNodes[pos], track);
        } else {
          this.appendChild(node, track);
        }

        return node;
      },

      owns: function(node) {
        return this.ownedNodes.indexOf(node) != -1;
      },
      // End DOM related code
      removeOwnedNode: function (node) {
        if (!node) return;

        var index = _.indexOf(this.getOrCreateOwnNodes(), node);
        if (index >= 0) {
          this.ownedNodes.splice(index);
        }

        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      },

      removeOwnedNodes: function () {
        _.each(this.getOrCreateOwnNodes(), function (node) {
          if (node.parentNode)
            node.parentNode.removeChild(node);
        });

        this.ownedNodes = [];
      },

      remove: function(model) {
        if (this.options.focusNext) {
          dom.focusNextIfActive(this.el);
        }

        if (model && model !== this.model) return; // don't delete for other models

        this.setEditable(false);
        this.computed();
        // if we have the focus on any owned element, we trigger to change it.
        $(this.el).find(":focus").trigger("changeselect");

        this.removeOwnedNodes();
        if (!this.options.template || this.options.template.el != this.el) {
          $(this.el).remove();
        }

        if (this.$infoModal) this.$infoModal.remove();

        this.setModel();

        this.stopListening();
        this.undelegateEvents();
        this._removed = true;
      },

      isComputing: function () {
        return this._computing;
      },

      computing: function () {
        this._computing = true;
        this.$el
          .removeClass("mb-initial")
          .addClass("mb-computing")
          .attr("aria-busy", "true");
      },

      computed: function () {
        this._computing = false;
        this.$el.removeClass("mb-computing")
          .removeAttr("aria-busy");
      },

      disconnect: function () {
        this.stopListening(this.model);
      },

      aborted: function () {
        this.computed();
      }
    });

    /*    BaseView.Factory = function (html) {
    };
    BaseView.Factory.prototype.create = function (model) {
    };


    <script type="text/x-mustache-template" data-binding="result">
      <div>{{{title}}}</div>
      {{{content}}}
    </script>


    =>
    Results = function(collection, viewFactories) {

      for (factory in viewFactories) {
        var collection = collection.addModel(factory.getModel(), factory);
        collection.on("add", function(model) {
            var view = factory.create(model);
            // add element to this element
        });
        this.collections.push(collection);
      }

      }

    Results.prototype.dispose = function() {
      for (collection in this.collections) {
        collection.dispose();
      }
    }

    Results.Factory = function(html) {
      var map = {}
      for (sub in html) {

      }
      this.map = map;
    }

    Results.Factory.prototype.create = function(resultsModel)    {
      var results = new Results(resultsModel);


    }


      var factory = new ViewRegistry.get("text/x-mustache-template").Factory(scriptEl);

      factory.create(model);

    }*/

    return BaseView;

  }
);

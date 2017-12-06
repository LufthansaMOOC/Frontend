/*========================================================================
* $Id: stack.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
* The Stack
* =========
*
* The stack is a component for navigating in your application.
*
* +--------------+    +--------------+     +--------------+
* | Main         |    | Main o-----------> | Main         |
* |              |    |+--------------+    |              |
* |              |    || Child        |    |              |
* |              |    ||              |    |              |
* |              |    ||              |    |              |
* | link o----------> ||              |    |              | 
* | ----         |    ||              |    |              |
* |              |    ||              |    |              |
* |              |    ||              |    |              |
* |              |    ||              |    |              |
* +--------------+    +|              |    +--------------+
*                      |              |
*                      +--------------+
*
* Model
* -----
*
*/


define([
  "i18n/i18n",
  "component!base",
  "client/template",
  "backbone",
  "jquery",
  "underscore",
], function(
  i18n,
  ComponentBase,
  Template,
  Backbone,
  $,
  _
) {

  var StackTemplate = Template.extend({

    createSubView: function (childNode, options, model) {
      var args = _.toArray(arguments);

      // use the model supplied in options instead of stack model
      args.splice(2, 1, options.model);

      Template.prototype.createSubView.apply(this, args);
    }
});

StackTemplate.Model = Backbone.Model.extend({

  push: function (element) {
    var child = this.get("child"),
        that = this;

    if (child) child.push(element);
    else {
      this.set("child", element);
      this.listenTo(element, "change", function (type) {
        that.trigger.apply(that, ["change"].concat(Array.prototype.slice.apply(1, arguments)));
      });
    }
  },

  pop: function () {
    var child = this.get("child"),
        grandChild,
        element;

    if (child) {
      grandChild = child.get("child");
      if (grandChild) return child.pop();

      element = this.get("child");
      this.unset("child");
      this.stopListening(element);
      // trigger remove?
      return element;
    }
  },

  popToApplication: function (application) {
    if (this.get("application") === application) {
      this.unset("child");
      return true;
    } else if (this.get("child")) {
      this.get("child").popToApplication(application);
    }
  },

  popAll: function () {
    var child = this.get("child");
    if (child) child.popAll();

    this.unset("child");
  },

  lastChild: function () {
    var child = this.get("child");

    while (child && child.get("child")) {
      child = child.get("child");
    }

    return child;
  }

});

StackTemplate.View = ComponentBase.extend({

  options: {
    "className": "mb-stack-element"
  },

  events: function () {
    return _.extend(
      {},
      ComponentBase.prototype.events,
      {
        "keyup": "closeOnEscape",
        "keypress .mb-stack-title": "closeChildren",
        "click .mb-stack-title": "closeChildren",
        "keypress .mb-stack-close": "close",
        "click .mb-stack-close": "close"
      }
    );
  },

  closeOnEscape: function (e) {
    if (e.keyCode === 27) { // ESC
      e.preventDefault();
      e.stopPropagation();
      this.close(e);
    }
  },

  close: function (e) {
    if (e && "keypress" === e.type && e.which !== 13) {
      return true;
    }
    this.options.parent && this.options.parent.closeChildren(e);
  },

  initialize: function () {
    ComponentBase.prototype.initialize.apply(this, arguments);

    if (!this.$el.hasClass("mb-stack")) {
      this.$el.addClass(this.options.className).addClass("mb-role");
      this.$el.attr("role", "document");
      this.$el.attr("aria-labelledby", "stack-title-" + this.cid);
    }

    this.titleEl = this.$el.find("> .mb-stack-title").get(0);
    this.contentEl = this.$el.find("> .mb-stack-content").get(0);

    if (this.options.parent) {
      this.insertAt(
        this.make("button", {
          "class": "mb-stack-close btn-link pull-right mb-clickable mb-no-print"
        },
        '<i class="icon-remove-circle"></i> ' + i18n("Close")),
      0);
    }

    this.handleResize = _.bind(this.handleResize, this);
    $(window).on("resize", this.handleResize);
  },

  handleResize: function () {
    if (this.model) {
      this.model.unset("scrollTop");
    }
  },

  setModel: function (model) {
    ComponentBase.prototype.setModel.apply(this, arguments);

    if (this.model) {
      this.listenTo(this.model, "change:child", this.updateChild);
      this.listenTo(this.model, "change:title", this.updateTitle);
      this.listenTo(this.model, "change:content", this.updateContent);
    }
  },

  closeChildren: function (e) {
    if (e && "keypress" === e.type && e.which !== 13) {
      return true;
    }
    e.preventDefault();
    e.stopPropagation();

    var child = this.model.get("child");

    if (child) {
      child.trigger("remove");

      this.model.trigger("closeStack", child);
      
      this.model.unset("child");
      var toFocus = child.get("previousFocus");
      if (toFocus) toFocus.focus();
      if (this.model.get("scrollTop")) {
        this.$el.scrollParent().scrollTop(this.model.get("scrollTop"));
        this.model.unset("scrollTop");
      }
    }
  },

  updateTitle: function () {
    if (!this.titleEl) {
      this.titleEl = this.make("div", {
        "class": "mb-stack-title",
        "id": "stack-title-" + this.cid
      });
      this.el.appendChild(this.titleEl);
    }
    this.titleEl.innerHTML = this.model.get("title");
  },

  updateContent: function () {
    if (!this.contentEl) {
      this.contentEl = this.make("div", {
          "class": "mb-stack-content"
      });
      this.el.appendChild(this.contentEl);
    }
    this.contentEl.innerHTML = this.model.get("content");
  },

  updateChild: function () {
    var child = this.model.get("child");
    if (child && !this.childEl) {
      this.addChild(child);
      this.$el.addClass("mb-has-child");
    }

    if (!child) {
      if (this.childEl) {
        if (this.childEl.parentNode) {
          this.childEl.parentNode.removeChild(this.childEl);
        }
        delete this.childEl;
      }
      this.$el.removeClass("mb-has-child");
    }
  },

  addChild: function (model) {
    this.model.set("scrollTop", this.$el.scrollParent().scrollTop());
    var view = new StackTemplate.View({
      model: model,
      "parent": this
    });

    this.childEl = view.render().el;
    view.options.application = new this.options.application.constructor(_.extend({
        rootEl: this.childEl,
        startSearch: false
      },
      model.get("applicationOptions")
    ))
    model.set("application", view.options.application);

    view.options.application.models.stack = this.options.application.models.stack;
    this.appendChild(this.childEl);
  },

  render: function () {
    this.updateTitle();
    this.updateContent();
    this.updateChild();

    return this;
  },

  remove: function () {
    ComponentBase.prototype.remove.apply(this, arguments);
    if (this.options.application.parentApplication) {
      this.options.application.destroy();
    }
    $(window).off("resize", this.handleResize);
  }

});

return StackTemplate;
});

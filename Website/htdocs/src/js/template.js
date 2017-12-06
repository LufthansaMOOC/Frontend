/*========================================================================
* $Id: template.js 100931 2017-08-22 16:03:09Z michael.biebl $
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
    "backbone",
    "utils/dom",
    "utils/jsonpath",
    "i18n/i18n",
    "jquery",
    "model/attribute_proxy"
  ], function (
    _,
    Backbone,
    dom,
    JSONPath,
    i18n,
    $,
    AttributeProxyModel
  ) {

  var AttributeCollection = Backbone.Collection.extend({

    initialize: function (models, options) {
      Backbone.Collection.prototype.initialize.apply(this, arguments);
      this.template = options.template;
      this.listenTo(this.template, "change", this.updateModels);
      this.updateModels();
    },

    updateModels: function () {
      var that = this,
          index = 0;

      _.each(this.template.schema.attributes, function (attribute, id) {
        var dependencyOKAndVisible = attribute.visible !== false && (!attribute.depends || that.evalExpr(attribute.depends, id));
        if (dependencyOKAndVisible) {
          that.add({id: id, attribute: attribute}, {at: index});
          index++;
        } else {
          that.get(id) && that.get(id).trigger("destroy", that.get(id));
        }
      });
    },

    evalExpr: function (expr, id) {
      var f = new Function("attributes", "return " + expr);
      return !!f.call(this, this.template.getAttributes());
    }

  });

  var Template = function (el, node, application) {
    this.el = el;
    this.node = node;
    this.application = application;

    if (node) {
      if (node.parentNode) {
        this.parentTemplate = node.parentNode.template;
      }
      this.children       = node.children;
    } else {
      this.children = [];
    }
    this.instances = new Instances();
    // this.attributes = {};
    this.content = {
      properties: []
    };
    this.initialize();
  };

  var Instances = function () {
    this.instances = [];
    this.length = 0;
  }

  Instances.prototype = {

    push: function (view) {
      if (!view) return;

      var that = this,
          originalRemove = view.remove;

      view.remove = function () {
        that.instances = _.without(that.instances, this);
        that.length = that.instances.length;
        originalRemove.apply(this, arguments);
        view.remove = originalRemove;
      };

      this.instances.push(view);

      this.length = this.instances.length;
    },

    remove: function () {
      _.forEach(this.instances, function(view) {
        if (view && view.remove) view.remove();
      });
      this.instances = [];

      this.length = this.instances.length;
    }
  }

  _.extend(Template.prototype, Backbone.Events, {

    initialize: function (node, tree) {
      if (!this.el || this.el == document) {
        this.attributeModel = new dom.EmptyModel();
      }
      else {
        this.attributeModel = new dom.AttributeModel(this.el, "data-");
      }
      this.listenTo(this.attributeModel, "all", this.proxyEvents);

      this.editable = !!this.schema;

      this.createDefaultTemplateIfNonePresent();
    },

    getSchemaAttributeCollection: function () {
      if (this.schema) {
        return new AttributeCollection(null, { template: this });
      }
    },

    proxyEvents: function (eventType, target) {
      this.trigger.apply(this, [eventType, this].concat(Array.prototype.slice.call(arguments, 2)));
    },

    append: function (el) {
      this.node.append(el);
    },

    createDefaultTemplateIfNonePresent: function () {
      if (!this.isTemplatePresent()) {
        var defaultEl = this.getDefaultTemplateAsEl();
        this.append(defaultEl);
      }
    },

    isTemplatePresent: function () {
      return !(this.hasContent()
        && this.node
        && this.node.children.length < 1);
    },

    getDefaultTemplateAsEl: function () {
      var html = this.getDefaultTemplate();
      if (html) return dom.instantiate(html);
    },
    
    getDefaultTemplate: function () {
      return this.constructor.DEFAULT_TEMPLATE;
    },

    /* -------------------  computed path information ------ */

    name: function() {
      return i18n(this.editableName || this.attributeModel.get("template"));
    },

    pathSchema: function() {
      return {
        type: "string",
        title: "Model path",
        readonly: true
      };
    },

    parentPath: function() {
      if (this.parentTemplate && this.parentTemplate.path) {
        return this.parentTemplate.path();
      }
      return [];
    },

    model: function (options) {
      var model = options.model,
          modelName, localPath;

      if (this.attributeModel.has("model")) {
        modelName = this.attributeModel.get("model");
        model =  this.application.models[modelName];
      }

      if (this.attributeModel.has("model-transformation")) {
        var modelPropertyDefinitions = this.attributeModel.get("model-transformation");
        if (modelPropertyDefinitions && this.application[modelPropertyDefinitions]) {
          model = new AttributeProxyModel(model,
                                          this.application[modelPropertyDefinitions].call(this.application));
        }
      }

      localPath = this.localPath();
      if (model && model.submodel && localPath && localPath.length) {
        model = model.submodel(localPath);
      }

      return model;
    },

    /** get the path within the model */
    /** should be overrided in sub templates if not from  attributeModel */
    localPath: function() {
      if (this.attributeModel.has("path")) {
        return JSONPath.parsePath(this.attributeModel.get("path"));
      }
      return [];
    },

    path: function() {
      return this.parentPath().concat(this.localPath());
    },


    /* -------------------  attribute/content information ------ */

    /**  Structural values according to schema */
    set: function (key, value) {
      if (this.schema) {
        value = this.schema.serializeAttribute(value, key);
      }
      this.setAttribute(key, value);
    },

    get: function (key, defaultValue) {
      if (!key) {
        var atts = this.getAttributes();
        if (!this.schema) return atts;
        for (var name in atts) {
            atts[name] = this.schema.parseAttribute(atts[name], name);
        }
        return atts;
      }

      var v = this.getAttribute(key);
      if (!this.schema) {
        return v;
      }
      return this.schema.parseAttribute(v, key, defaultValue);
    },

    /** Returns the input model in parsed form */
    getInput: function () {
      var atts = this.schema.filterInputAttributes(this.getAttributes()),
          path;

      for (var name in atts) {
        path = this.schema.inputAttributes[name] && this.schema.inputAttributes[name].path || name;

        atts[path] = this.schema.parseAttribute(atts[name], name);

        if (path !== name) {
          delete atts[name];
        }
      }
      return atts;
    },

    /** Textual, serialized values (as written in html) */
    getAttribute: function(key) {
      return this.attributeModel.get(key);
    },

    hasAttribute: function(key) {
      return this.attributeModel.has(key);
    },

    removeAttribute: function(key) {
      this.attributeModel.set(key, null, {unset: true});
    },

    setAttribute: function(key, value) {
      this.attributeModel.set(key, value);
      return this;
    },

    hasContent: function() { return false; },

    getContent: function() {
      return  this.el.innerHTML;
    },

    setContent: function(value) {
      this.el.innerHTML = value;
    },

    getAttributes: function() {
      return this.attributeModel.get();
    },

    getInputAttributes: function () {
      return this.schema.filterInputAttributes(this.attributeModel.get());
    },

    getOptions: function (options) {
      return options;
    },

    /** create the view accoring to the constructor of this.view */
    createView: function (options) {
      var ViewConstructor = options.ViewConstructor || this.constructor.View;
      var model = this.model(options),
          options = this.getOptions(options),
          view = new ViewConstructor(_.extend(
            {},
			this.attributeModel.get(),
            options,
            {
              model: model,
              el: this.createEl(),
              template: this
            }
          ));

      this.instances.push(view);

      if (options.node) {
        _.each(options.node.children, function (childNode) {
          this.createSubView(childNode, options, model);
        }, this);
      }

      return view;
    },

    createEl: function () {
      return this.el;
    },

    createSubView: function (childNode, options, model) {
      var view = childNode.template.createView({
        application: options.application,
        model: model,
        node: childNode
      });

      if (view && childNode.template
        && view.el !== childNode.template.el
        && view.el !== childNode.template.el.parentNode) {
        $(childNode.template.el).after(view.el);
      }

      return view;
    },

    removeViews: function() {
      if (this.instances && this.instances.remove) {
        this.instances.remove();
      }
    },

    remove: function (options) {
      this.stopListening();
      this.removeViews();
      this.instances = new Instances();
      _.forEach(options.node.children, function (childNode) {
        childNode.template.remove({
          node: childNode
        });
      });
    },

    /** Implementation detail */
    _appendChildren: function (el, parentNode) {
      var that = this,
      children = this.children;

      _.each(el.childNodes, function (childNode) {
        if (!childNode || /mb-dont-serialize/.test(childNode.className)) return;
        for (var i = 0 ; i < that.instances.instances.length; ++i) {
          if (that.instances.instances[i] && that.instances.instances[i].owns && that.instances.instances[i].owns(childNode))
            return;
        }

        var found = _.find(children, function (child) {
          if (child.el === childNode) {
            parentNode.innerHTML += child.template.serialize();
            return true;
          }
        });
        if (!found) {
          var newChildNode = childNode.cloneNode();
          that._appendChildren(childNode, newChildNode);
          parentNode.appendChild(newChildNode);
        }
      });
    },

    // serialize html => currently takes all innerHTML without
    // .mb-dont-serialize elements
    serialize: function() {
        var contentWrapper = document.createElement("div");
      this._appendChildren(this.el, contentWrapper);

      // TODO: replace existing subtemplates

      var that = this,
      html = "<" + this.el.tagName + " ",
      attributes = _.extend(
        dom.getAttributes(this.el),
        _.object(_.map(_.keys(this.get()), function (name) { return "data-" + name; }), _.values(this.get()))
      ),
      content = attributes["data-content"];

      html += _.filter(_.collect(attributes, function (value, key) {
        if (!key || !value || key === "data-content") return;
        return key + "=\"" + that.schema.serializeAttribute(value, key.substring(5) /* substring data- */) + "\""; // TODO: escape
      }), function (o) { return o; }).join(" ");

      html += ">";
      html += this.schema.content ? content : contentWrapper.innerHTML;
      html += "</" + this.el.tagName + ">";

      return html;
    }

  });

  Template.Schema = function (options) {
    options = options || {};
    this.inputAttributes = options.inputAttributes || {};
    this.attributes = options.attributes || {};
    var inputKeys = _.keys(this.inputAttributes);
    for (var i = 0; i < inputKeys.length; ++i) {
      var key = inputKeys[i];
      this.attributes[key] = this.inputAttributes[key];
      this.attributes[key].model_stored = true;
    }
    this.inputAttributeNames = [];
    var keys = _.keys(this.attributes);
    for (var j = 0; j < keys.length; ++j) {
      var key = keys[j];
      if (this.attributes[key].model_stored) {     
        this.inputAttributeNames.push(key);
      }
    }
    
    this.content = options.content;
  };

  _.extend(Template.Schema.prototype, Backbone.Events, {

    parseAttributes: function (attributes) {
      var that = this;

      _.each(this.attributes, function (unused, key) {
          var value = that.parseAttribute(attributes[key], key);
          if (value !== undefined) {
            attributes[key] = value;
          }
      });

      return attributes;
    },

    getSchema: function(key) {
      return this.attributes[key];
    },

    validateInput: function(value, key) {
      var schema = this.getSchema(key);
      var type = (schema && schema.type) || "string";

      switch (type) {
      case "int":
        if (isNaN(parseInt(value))) {
          return {ok: false, error: "Number expected!"};
        }
      }
      return {ok: true};
    },

    parseAttribute: function (value, key, defaultValue) {
      var schema = this.getSchema(key),
          type = (schema && schema.type) || "string",
          defaultValue = defaultValue === undefined ? (schema && schema["default"]) : defaultValue;
      
      if (defaultValue === null) defaultValue = undefined;

      switch (type) {
       case "QueryExpr": return value ? { "unparsed": value } : defaultValue;
       case "boolean": return new RegExp("^" + !!!defaultValue + "$", "i").test(value) ? !defaultValue : !!defaultValue;
       case "int": return value ? parseInt(value, 10) : defaultValue;
       case "float": return value ? parseFloat(value) : defaultValue;
       case "date": return value ? new Date(value) : defaultValue;
       case "SearchRequest": return value ? JSON.parse(value) : defaultValue;
       case "list": if (value) { try { return JSON.parse(value); } catch (e) { return value.split(/\s*,\s*/) } }; return defaultValue;
       case "i18nString": return i18n.translateIfPrefixed(value ? value : defaultValue);
      }

      return value || defaultValue;
    },

    serializeAttribute: function (value, key) {
      var schema = this.getSchema(key),
          type = (schema && schema.type) || "string";

      switch (type) {
       case "QueryExpr": return value ? value.unparsed : undefined;
       case "int": return value ? value.toString() : undefined;
      }

      return value;
    },

    filterInputAttributes: function (attributes) {
      var inputAttributeNames = this.inputAttributeNames,
          filteredAttributes = {},
          that = this;

      _.each(attributes, function (value, key) {
        if (_.indexOf(inputAttributeNames, key) >= 0) {
          filteredAttributes[key] = value;
        }
      });

      return filteredAttributes;
    },

    optionsAsAttributes: function (options) {
      var that = this;
      return _.map(options, function (value, key) {
          return "data-" + key + "=" + that.serializeAttribute(value, key);
      }).join(' ');
    }
  });

  Template.extend = Backbone.Model.extend;

  return Template;
});

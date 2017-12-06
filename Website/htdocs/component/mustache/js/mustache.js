/*========================================================================
* $Id: mustache.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
     "component!base",
     "client/template",
     "mustache",
     "utils/dom",
     "utils/mustache",
     "api/v2/common",
     "jquery",
     "i18n/i18n",
     "underscore"
   ], function(
     ComponentBase,
     Template,
     Mustache,
     dom,
     MustacheAdapter,
     Common,
     $,
     i18n,
     _
   ) {

  var mergeProperties = function (properties1, properties2) {
    _.each(properties2, function (value, name) {
        var oldValue = properties1[name];
        if (oldValue && oldValue.format !== value.format) {
          value.format = "PROPERTY";
        }
        properties1[name] = value;
    });
    return properties1;
  };

  var MustacheTemplate = Template.extend({

    editableName: "editor_result_template_template_label",

    initialize: function () {
      Template.prototype.initialize.apply(this, _.toArray(arguments));
      this.content = this.el.innerHTML;
      this.mustacheAdapter = new MustacheAdapter(this.content);
      this.attrAdapters = _.reduce(this.attributeModel.get(), function (attrs, value, key) {
          if (/^attr-/.test(key)) {
            attrs[key.substring(5)] = new MustacheAdapter(value, {escape: MustacheAdapter.noEscape});
          }
          return attrs;
      }, {});

      try {
        this.properties = this.mustacheAdapter.getProperties();
      } catch (e) {
        if (console) console.warn(e);
        this.properties = {};
      }

      this.properties = _.reduce(this.attrAdapters, function (properties, attrAdapter) {
        return mergeProperties(attrAdapter.getProperties(), properties);
      }, this.properties);
      
      this.editable = false;
    },

    isTemplatePresent: function () {
      return /\S/.test(this.el.innerHTML);
    },

    schema: new Template.Schema({
    }),

    hasContent: function() { return true; },
    getContentSchema: function() {
      return {
        type: "mustache"
      };
    },
    getContent: function() {
      return this.el.innerHTML;
    },
    setContent: function(v) {
      dom.updateScriptContent(this.el, v);
      return this;
    },
    createView: function (options) {
      var model = this.model(options);

      options = _.extend({}, this.attributeModel.get(), options, {
          template: this,
          content: this.content,
          tagName: this.el.getAttribute("data-tag-name") || "div",
          className: this.el.getAttribute("data-class-name"),
          model: model
      });
      delete options.el;
      var view = new this.constructor.View(options);
      this.instances.push(view);
      return view;
    },

    getProperties: function (template) {
      if (!template) return;

      var properties = {};
      template.replace(
        new RegExp("{{(\\^|#|\\/|=|!|>|\\{|%)?([^\\}]+)\\1?}}+", "g"),
        function (match, type, name) {
          properties[name] = { format: "HTML" };
        }
      );

      if (properties.hasOwnProperty('mes:date') && !properties.hasOwnProperty('modification_date')) {
        properties['modification_date'] = { format: "HTML" };
      }

      return properties;
    }
  });


  // Renders a model using a mustache template

  var MustacheView = ComponentBase.extend({

    initialize: function(args) {
      this.$el.addClass("mb-dont-serialize");

      if (this.options.template && this.options.template.mustacheAdapter) {
        this.mustache = this.options.template.mustacheAdapter;
      }

      this.attrs = this.options.template && this.options.template.attrAdapters;

      if (this.options.templateString) {
        this.content = this.options.templateString || this.options.template.el.innerHTML;
      }
      
      ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));
      
      this.createSubComponent = args.createSubComponent;
      this.render();
    },

    change: function () { 
      this.render(); 
    },

    setEditable: function () {
    },

    renderData: function () {
      if (this.options.useOutputOnly) return this.model && this.model.output;
      return this.model;
    },

    render: function() {
      this.applyAttrs();
      if (this.mustache) {
        try {
          this.$el.html(this.mustache.render(this.renderData(), Common.PropertyFormat).replace(/template:script/g, "script"));
        } catch (e) {
          if (console) console.error(e, e.stack);
          this.el.innerHTML = "";
        }
      }
      else { 
        this.el.innerHTML = Mustache.to_html(this.content, _.extend({ i18n: i18n.strings }, this.renderData().get() || this.renderData().toJSON() || {}));
      }
      if (this.options.application && this.options.application.views && this.options.modelType)  {
        this.options.application.views.trigger("afterRender:"  + this.options.modelType, this.options.application, this, this.model); 
      }
      return this;
    },

    applyAttrs: function () {
      var that = this;
      _.each(this.attrs, function (mustache, name) {
          that.renderAttr(name, mustache);
      });
    },

    renderAttr: function (name, mustache) {
      var value;
      try {          
        value = mustache.render(this.renderData(), Common.PropertyFormat);
      } catch (e) {
        if (console) console.error(e);
        value = "";
      }

      if (value == "") {
        this.$el.removeAttr(name);
      }
      else {
        this.$el.attr(name, value);
      }
    }

  });

  MustacheTemplate.View = MustacheView;

  return MustacheTemplate;

});

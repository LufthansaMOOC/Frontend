/*========================================================================
* $Id: templates.js 90558 2016-05-11 08:17:26Z martin.koehler $
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
  "client/template",
  "client/templateregistry",
  "component!base",
  "utils/dom",
  "utils/jsonpath",
  "underscore"
], function (
  Template,
  TemplateRegistry,
  View,
  dom,
  JSONPath,
  _
) {


  /**
    * @static
    * @module client/templates
    * @typedef TemplateDefinition
    * @memberof client/templates
    * @type {Object}
    * @property {string} name
    * @property {Templates.View} view
    * 
    */
  var TemplateDefinition = {};     
  
  /**
    * Templates API. 
    *
    * @exports client/templates
    */
  var Templates = function () {};

  Templates.prototype = {

   /**
    * @typedef DesignerMenu
    * @memberof client/templates
    * @type {Object}
    * @property {string} name The name id (i18n key) of the designer's menu
    * @property {string} order_criteria
    * @property {string} order_direction
    * @property {common.Entry[]} entries
    */

    /**
      * Register a template using the submitted definition.
      * @param {Object} definition - The definition of the template being added.    
      * @param {String} definition.name - The name of the template <code>&lt;div data-template="&lt;definition.name&gt;" .. </code> 
      * @param {Templates.View}   definition.view - Represents the current view. See example below.
      * @param {Templates.View.initialize}   definition.view.initialize 
      * @param {Templates.View.events}   definition.view.events
      * @param {Templates.View.render}   definition.view.render 
      * @param {Object}   definition.attributes - Template attribute schema. Represents a property list of template attributes. 
                          Template attribute specifies <code>title</code>, <code>type</code>, optional <code>defaultValue<code>. See example below.

      * @param {Object[]}  definition.designer_menu - Lists the individual menus of the Mindbreeze SearchApp Designer, this template is placed within. 
                          A designer menu entry is represented by <code>name</code>, <code>icon</code>, <code>description,...</code> See example below.     
      * @example       
var MyView = Templates.View.extend({
  initialize: function () {
  },
  events: function () {
  },
  render: function () {
  }
)};

Templates.add({
  name: "exampleresults",
  view: MyView,

  attributes: {

    size: {
      title: "mycompany_results_size",
      type: "string",
      defaultValue: "test"
    }

  },

  designer_menu: [{
      name: "mycompany_results",
      icon: Mindbreeze.require.toUrl("mycompany.example/example.png"),
      description: "mycompany_results_description",
      group: {
        name: "mygroup",
        description: "mygroup_description"
      }
  }]
})
      */


   add: function (definition) {
      _.forEach(definition.attributes, function (attribute, key) {
          if (attribute.hasOwnProperty("defaultValue")) {
            attribute["default"] = attribute.defaultValue;
          }
      });

      var schema = new Template.Schema({ attributes: definition.attributes });
      var Component = Template.extend({
          schema: schema,

          hasContent: function () {
            return !!definition.content;
          },

          getContentSchema: function () {
            return definition.content;
          },

          localPath: function() {
            var attributes = this.schema ? this.schema.parseAttributes(this.attributeModel.getCamelCase()) : this.attributeModel.getCamelCase();
            if (attributes.path) {
              return JSONPath.parsePath(attributes.path);
            }
            return [];
          },

          model: function (options) {
            var model = options.model,
                modelName, localPath,
                attributes = this.schema ? this.schema.parseAttributes(this.attributeModel.getCamelCase()) : this.attributeModel.getCamelCase();

            if (attributes.model) {
              modelName = attributes.model;
              model =  this.application.models[modelName];
            }

            localPath = this.localPath();
            if (model && model.submodel && localPath && localPath.length) {
              model = model.submodel(localPath);
            }

            return model;
          },

          getOptions: function (options) {
            return options;
          },

          createView: function (options) {
            var model = this.model(options),
                options = this.getOptions(options),
                view = new this.constructor.View(_.extend(
                  {},
                  this.attributeModel.get(),
                  this.schema ? this.schema.parseAttributes(this.attributeModel.getCamelCase()): this.attributeModel.getCamelCase(),
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
          }
      });
      Component.DEFAULT_TEMPLATE = definition.default_template;
      Component.View = definition.view;

      if (definition.designer_menu) {
        addToTemplateRegistry(definition, schema);
      }

      Mindbreeze.define("component!" + definition.name, function () {
        return Component;
      });
    },

    View: View

  };

  function addToTemplateRegistry (definition, schema) {
    var designer_menu = definition.designer_menu;
    var group = designer_menu[0].group;

    TemplateRegistry.add({
      id: definition.name,
      name: group.name,
      description: group.description,

      getAdders: function () {
        return designer_menu;
      },

      create: function (options) {
        options = options || {};
        options.template = options.template || definition.name;

        var el = document.createElement("div");

        _.forEach(options, function (value, key) {
            el.setAttribute("data-" + dom.AttributeModel.camelCaseToSeparated(key),  schema.serializeAttribute(value, key));
        });


        return el;
      }
    });
  }

  return new Templates();
});

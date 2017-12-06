/*========================================================================
* $Id: searchform.js 73821 2013-07-17 11:51:32Z michael.biebl $
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
    "api/v2/common",
    "underscore",
    "component!base",
    "client/template",
    "client/templateregistry",
    "utils/dom",
    "jquery",
    "i18n/i18n"
  ],
  function(
    Common,
    _,
    ComponentBase,
    Template,
    TemplateRegistry,
    Dom,
    $,
    i18n
  ) {


  // <input type="checkbox" data-template="personalize" data-default-active="true" />
 
  var PersonalizeTemplate = Template.extend({
      
      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },


      createView: function(options)  {
              
        var defaultActive = this.attributeModel.get("default-active") || "false";
        var boost  = this.get("boost") || 1.5;
        
        var view = new PersonalizeView(_.extend({}, options, {
              application: options.application,
              template: this,
              boost: boost,
              defaultActive: defaultActive,
              el: this.el,            
              disabled: this.attributeModel.get("disabled") === "true"
        }));
        this.instances.push(view);
        return view;
      },

      schema: new Template.Schema({
        attributes: {     
          "default-active": {
            type: "boolean",
            title: "editor_personalize_active",
            required: false,
            defaultValue: false
          },
          "boost": {
            type: "float",
            title: "editor_personalize_boost",
            required: false,
            defaultValue: 1.5
          }
        }       
      }),

      hasContent: function() { return false; },
      
      remove: function (options) {
        _.forEach(this.instances, function (view) {
            view.remove();
        });
        this.instances = [];
        _.forEach(options.node.children, function (childNode) {
            childNode.template.remove({
                node: childNode
            });
        });
      }
    });

    var PersonalizeView = ComponentBase.extend({

      tagName: "input",
      
      
      initialize: function() {
        ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));
        this.el.checked = this.options.defaultActive;
        this.setPersonalization({silent: true});
      },
      
      boost: function() {
        return  this.el.checked ? this.options.boost : 0;
      },

      setPersonalization: function(e) {        
        if (!this.options.application.models.collected) {
          this.options.application.once("addmodel:collected", 
                                        function() {
                                           this.options.application.personalizeSearch(this.boost());
                                        }                                        
                                        , this);
        } else {
          this.options.application.personalizeSearch(this.boost());
        }
      },
                                               
      events: function () {
        return _.extend({},
          ComponentBase.prototype.events,
          {
            "change": "setPersonalization",
          });
      }
       
    });     

    PersonalizeTemplate.View = PersonalizeView;
    return PersonalizeTemplate;

});

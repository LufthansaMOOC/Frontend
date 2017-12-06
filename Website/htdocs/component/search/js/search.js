/*========================================================================
* $Id: search.js 86378 2015-09-10 09:02:14Z michael.biebl $
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
define(
  [
    "component!base",
    "component!searchroot",
    "client/template",
    "client/templatetree",
    "api/v2/api",
    "i18n/i18n",
    "utils/clone",
    "utils/accessibility",
    "underscore",
    "jquery",
    "text!../mustache/template.default.mustache",
    "text!../mustache/template.gallery.mustache",
    "text!../mustache/template.person.mustache"
  ],
  function (
    Base,
    SearchRootTemplate,
    Template,
    TemplateTree,
    api,
    i18n,
    clone,
    Accessibility,
    _,
    $,
    DEFAULT_TEMPLATE,
    GALLERY_TEMPLATE,
    PERSON_TEMPLATE
  ) {


    var SearchTemplate = Template.extend({

        schema: new Template.Schema({
            attributes: {
              "template-refid": {
                type: "string"
              },
              constraint: {
                path: "source_context.constraints.view_base",
                type: "QueryExpr",
                title: "editor_result_constraint"
              },
              count: {
                type: "int",
                title: "editor_result_count",
                values:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                defaultValue: 1 // TODO: not used
              },
              "enabledViews": {
                type: "list",
                title: "editor_search_enabled_views"
              },
              "disabledViews": {
                type: "list",
                title: "editor_search_disabled_views"
              },
              /*
              "propagateToParent": {
                type: "boolean",
                defaultValue: true,
              "default": true
              },*/
              "model": {
                title: "editor_search_model"
              }
            }
        }),

        hasContent: function () {
          return false;
        },

        createView: function (options) {
          if (!this.node.parentNode) {
            // used as search root template.
            options = _.extend({}, options, {ViewConstructor: SearchRootTemplate.View});
            return Template.prototype.createView.call(this, options);
          }
          
          var view,
              inputTransform = this.el.getAttribute("data-input-transform"),
              inputTransformFunction = inputTransform && new Function("input", "application", inputTransform);

          options = _.extend(
            {},
            options,
            this.schema.parseAttributes(this.attributeModel.getCamelCase()),
            {
              modelId: this.el.getAttribute("data-model"),
              inputTransform: inputTransformFunction
            }
          );

          view = new this.constructor.View(options);
          this.instances.push(view);
          return view;
        }

    });

    SearchTemplate.View = Base.extend({

        initialize: function() {
          // TODO: no super call?
          //this.options.application.execute(_.bind(this.lateInitialize, this));

          this.lateInitialize();
        },

        remove: function () {
          this.model.destroy();
          delete this.options.application.models[this.modelId];
          Base.prototype.remove.apply(this, arguments);
          return this;
        },

        lateInitialize: function () {
          var that = this,
              templateEl,
              templateString;

          this.createModel();
          if (this.options.constraint) {
            this.model.set(
              "source_context.constraints.searchcontainer",
              this.options.constraint,
              {silent:true}
            );
          }

          this.model.set("count", this.options.count, {silent:true});
          if (this.options.name) {
            this.model.set("name", this.options.name, {silent:true});
          } else {
            this.model.set("name", _.uniqueId("app"), {silent:true});
          }

          /*
          this.model.input.addValidator(function() {
              var userQuery = that.options.application.getUnparsedUserQuery();
              return !!userQuery && !_.isEmpty(userQuery);
          });
          */
          
          /*
          if (this.options.propagateToParent) {
                this.listenTo(this.model.input, "change", this.updateParentIfUserQueryChanged);
          }
          }*/

          if (this.options.templateRefid) {
            templateEl = document.getElementById(this.options.templateRefid);
            templateString = templateEl && templateEl.innerHTML || "Could not find template with id \"" + this.options.templateRefid + "\"";
          
            templateString = this.replaceTemplateOptions(templateString);
            var templatedRefidUsed = true;
          }

          if (this.options.templatePreset && !templatedRefidUsed) {
            templateString = this.replaceTemplateOptions(this.setTemplatePreset());
            if (this.options.alignment) {
              $(this.el).addClass(this.options.alignment);
            }
          }

          if (this.options.width) {
            var width;
            switch(this.options.width) {
              case "50":
                width = 50;
                break;
              case "100":
                width = 100;
                break;
              case "33":
                width = 33;
                break;
              case "66":
                width = 66;
                break;
              default:
                width = 100;
                break;
            };
            $(this.el).addClass("boxWidth" + width);
          }

          this.disable();
          this.templateTree = new TemplateTree(this.el, "search", templateString);

          if (this.options.showInTab) this.createBoxShadowWithArrow();

          this.templateTree.initialize(this.options.application, this.model, function (errors) {
              if (that.options.enableAccessibilityHandlers) {
                that.accessibilityContainer = new Accessibility.Container(that.rootEls);
              }
              that.originalInput = clone(that.model.input.get());

              that.listenTo(that.options.application.models.search.input, "change", that.inputChanged);
              that.inputChanged();
          });
        },

        createBoxShadowWithArrow: function() {
          var arrow = document.createElement('div');
          arrow.className = "tabArrow";

          if (this.options.showInTab == "true") {
            var arrowInner = this.showTabArrow();
            arrow.appendChild(arrowInner);
          } else {
            $(arrow).addClass("boxGradientArrow");
          }

          this.el.appendChild(arrow);
        },

        setTemplatePreset: function() {
          var template;
          switch(this.options.templatePreset) {
            case "default-results": 
              template = DEFAULT_TEMPLATE;
              break;
            case "gallery-results":
              template = GALLERY_TEMPLATE;
              break;
            case "person-results":
              template = PERSON_TEMPLATE;
              break;
            default:
              template = DEFAULT_TEMPLATE;
          }

          this.el.className = "searchboxElement " + this.options.templatePreset;
          if (this.options.templateClass) this.el.className += " " + this.options.templateClass;

          return template;
        },

        showTabArrow: function() {
          var arrowInner = document.createElement('div');
          arrowInner.className = "tabArrowInner";
          arrowInner.setAttribute("data-action-object", '{"changeView":{"name": "' + this.options.name + '", "model": null }}');
          if (this.options.name) arrowInner.setAttribute("title", 'Show all results for "' + i18n(this.options.name) + '"');
          return arrowInner;
        },

        replaceTemplateOptions: function (templateString) {
          var icon = "",
              templateTitle = "",
              translated_templateTitle = "",
              title;
          
          if (this.options.templateTitle) {
            templateTitle = i18n(this.options.templateTitle);
          }

          if (this.options.templateIcon) {
            icon = this.options.templateIcon;
            title = icon.concat(templateTitle);
          } else {
            title = templateTitle;
          }
          
          templateString = templateString.replace(/{{templateoptions.title}}/g, title);
          templateString = templateString.replace(/{{templateoptions.actionTitle}}/g, templateTitle);
          
          return templateString;
        },

        updateParentIfUserQueryChanged: function () {
          // if (JSON.stringify(this.options.application.models.search.input.get("user")) !== JSON.stringify(this.model.input.get("user"))) {
          //   this.options.application.models.search.input.set("user", this.model.input.get("user"));
          // }
          // if (JSON.stringify(this.options.application.models.search.input.get("computed_properties")) !== JSON.stringify(this.model.input.get("computed_properties"))) {
          //  this.options.application.models.search.input.set("computed_properties", this.model.input.get("computed_properties"),{silent: true});
          // }          
        },

        createModel: function () {
          var models = this.options.application.models;
          this.modelId = this.options.modelId || ("search_" + this.cid);
          this.model = models[this.modelId] = api.search.createModel(models.channels, { enableImmediateDisplayOfFederatedResults: this.options.application.options.enableImmediateDisplayOfFederatedResults });
          /*
          this.model.on("computed", function (model) {
            if (this._enabled && this.options.mainContainer) {
              models.search.wiring.trigger("computed" ); //,{ traceContext: leaveSearchCall });
          }
          }, this);

          this.model.output.on("change", function(model) {
            if (this._enabled && this.options.mainContainer) {
            models.search.output.load(this.model.output.attributes, {parse:false, merge:false});        
            }     

          }, this);
          */
        },

        resetModel: function (name) {
          this.model.input.clear({silent: true});
          this.model.input.set(this.originalInput, {silent: true});
          if (this.options.name) {
            this.model.set("name", this.options.name, {silent:true});
          } else {
          this.model.set("name", _.uniqueId("app"), {silent:true});
          }
        },

      /*
        resetParentConstraints: function () {
          this.options.application.models.search.input.set("user.constraints", null, { unset: true });
        },
*/
        disable: function () {
          this._enabled = false;

          $(this.options.application.rootEls).attr("data-enabled-searchcontainers", ($(this.options.application.rootEls).attr("data-enabled-searchcontainers") || "").replace(this.options.templateRefid, ""));
          this.$el.hide();
          this.model.deactivate();
          this.model.output.load({});
        },

        enable: function () {
          if (this._enabled) return;
          this._enabled = true;
/*
          if (this.options.propagateToParent) {
            this.resetParentConstraints();
          }
*/
          $(this.options.application.rootEls).attr("data-enabled-searchcontainers", ($(this.options.application.rootEls).attr("data-enabled-searchcontainers") || "").replace(this.options.templateRefid, "") + " " + this.options.templateRefid);
          this.$el.show();
          this.model.output.load({});
          this.model.activate();
        },

        inputChanged: function (model) {
          var viewName = this.options.application.models.search.input.get("source_context.constraints.view.name") || "Everything",
              viewDescription = this.options.application.models.search.input.get("source_context.constraints.view.description"),
              inEnabled = _.indexOf(this.options.enabledViews, viewName) >= 0,
              inDisabled = _.indexOf(this.options.disabledViews, viewName) >= 0,
              enabled = !(this.options.enabledViews && !inEnabled || inDisabled);

          if (!enabled) {
            this.disable();
          }

          if (enabled) {
            if (this.parentApplication) return;
            this.resetModel(viewDescription);
            var input = this.options.application.models.search.input.get();

            this.model.input.set(this.transformInput(input)); 
        // this.model.output.load({__manual_reset__: true}, {parse:false, merge:false});
            this.enable();
          }
        },

        transformInput: function (input) {
          // TODO: how do we handle that correctly for tabs and without tabs?
          if (this.options.constraint) {
            input.source_context = input.source_context || {};
            input.source_context.constraints = input.source_context.constraints || {};
            input.source_context.constraints.search = this.options.constraint;
          }
          if (this.options.inputTransform) {
            this.options.inputTransform.call(window, input,this.options.application);
          } else {
            var userQuery = input.user && input.user.query || null;
            if (!userQuery) {
              return {user: {}};
            }
            return {user: { query: userQuery } };
          }
          return input;
        }

    });

    return SearchTemplate;
  }
);

Mindbreeze.define(
  "component!searchcontainer",
  [
    "component!base",
    "client/template",
    "client/templatetree",
    "api/v2/api",
    "i18n/i18n",
  "utils/clone",
    "underscore",
    "jquery"
  ],
  function (
    Base,
    Template,
    TemplateTree,
    api,
    i18n,
  clone,
    _,
    $
  ) {

    function cloneRec(dest, src) {
      if (!src || !src.childNodes) return;
      for (var i = 0; i < src.childNodes.length; i++) {
        var node =  src.childNodes[i];
        var cloned = node.cloneNode(false);
        if (cloned.nodeName.toUpperCase() == "SCRIPT") {
          cloned.text = node.text;
        } else {
          cloneRec(cloned, node);
        }
        dest.appendChild(cloned);
      }
    }

    $("[data-template-refid]").each(function () {
      if (this.getAttribute("data-template") !== "searchcontainer") {
        var refid = this.getAttribute("data-template-refid"),
        el = document.getElementById(refid);

        if (el) {
          cloneRec(this, el);
        } else {
          this.innerHTML = "Template with id \"" + refid + "\" not found!";
        }
      }
    });

    var SearchContainerTemplate = Template.extend({

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
              "propagateToParent": {
                type: "boolean",
                defaultValue: true,
              "default": true
              },
              "model": {
                title: "editor_search_model"
              }
            }
        }),

        hasContent: function () {
          return false;
        },

        createView: function (options) {
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

    SearchContainerTemplate.View = Base.extend({

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

          this.model.input.addValidator(function() {
              var userQuery = that.options.application.getUnparsedUserQuery();
              return !!userQuery && !_.isEmpty(userQuery);
          });

          if (this.options.propagateToParent) {
                this.listenTo(this.model.input, "change", this.updateParentIfUserQueryChanged);
          }

          if (this.options.templateRefid) {
            templateEl = document.getElementById(this.options.templateRefid);
            templateString = templateEl && templateEl.innerHTML || "Could not find template with id \"" + this.options.templateRefid + "\"";
          }

          this.disable();
          this.templateTree = new TemplateTree(this.el, "search", templateString);
          this.templateTree.initialize(this.options.application, this.model, function (errors) {
              if (that.options.enableAccessibilityHandlers) {
                that.accessibilityContainer = new Accessibility.Container(that.rootEls);
              }
              that.originalInput = clone(that.model.input.get());

              that.listenTo(that.options.application.models.search.input, "change", that.inputChanged);
              that.inputChanged();
          });
        },

        updateParentIfUserQueryChanged: function (model) {
          if (JSON.stringify(this.options.application.models.search.input.get("user")) !== JSON.stringify(this.model.input.get("user"))) {
            this.options.application.models.search.input.set("user", this.model.input.get("user"), {triggeredModel: model});
          }
          if (JSON.stringify(this.options.application.models.search.input.get("computed_properties")) !== JSON.stringify(this.model.input.get("computed_properties"))) {
            this.options.application.models.search.input.set("computed_properties", this.model.input.get("computed_properties"),{silent: true});
          }          
        },

        createModel: function () {
          var models = this.options.application.models;
          this.modelId = this.options.modelId || ("searchcontainer_" + this.cid);
          this.model = models[this.modelId] = api.search.createModel(models.channels);

          this.model.on("computed", function (model) {
            if (this._enabled && this.options.mainContainer) {
              models.search.wiring.trigger("computed" /*,{ traceContext: leaveSearchCall }*/);
          }
          }, this);

          this.model.output.on("change", function(model) {
            if (this._enabled && this.options.mainContainer) {
            models.search.output.load(this.model.output.attributes, {parse:false, merge:false});        
            }     

          }, this);
        },

      resetModel: function (name) {
          this.model.deactivate();
          this.model.input.clear({silent: true});
          this.model.input.set(this.originalInput, {silent: true});
    		  if (this.options.name) {
    		    this.model.set("name", this.options.name, {silent:true});
    		  } else {
    			this.model.set("name", _.uniqueId("app"), {silent:true});
    		  }
          this.model.activate({silent:true});
        },

        resetParentConstraints: function () {
          // don't reset user.constraints if searchtemplate changed
          if (!this.options.application.models.search.input.changed["user.constraints.searchtemplate"]
              && !(
              this.options.application.models.search.input.changed.user
              && this.options.application.models.search.input.changed.user.constraints
              && this.options.application.models.search.input.changed.user.constraints.searchtemplate)) {
            this.options.application.models.search.input.set("user.constraints", null, { unset: true });
          }
        },

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

        inputChanged: function (model, options) {
          if (options && options.triggeredModel && options.triggeredModel == this.model.input)
            return;
        
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

		        //this.model.output.load({__manual_reset__: true}, {parse:false, merge:false});
            this.enable();
          }
        },

        transformInput: function (input) {
          // TODO: how do we handle that correctly for tabs and without tabs?
          if (this.options.constraint) {
            input.source_context = input.source_context || {};
            input.source_context.constraints = input.source_context.constraints || {};
            input.source_context.constraints.searchcontainer = this.options.constraint;
          }
          if (this.options.inputTransform) {
            this.options.inputTransform.call(window, input,this.options.application);
          }
          if (this.model.input.get("count")) delete input.count;         

          //delete input.properties;
          // delete input.facets;
          return input;
        }

    });

    return SearchContainerTemplate;
  }
);

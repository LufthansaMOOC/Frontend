/*========================================================================
* $Id: searchform.js 98067 2017-05-11 15:09:42Z michael.biebl $
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
    "require",
    "component!base",
    "client/template",
    "client/templateregistry",
    "utils/browser",
    "utils/dom",
    "jquery",
    "model/tree",
    "underscore",
    "backbone"
  ],
  function(
    require,
    ComponentBase,
    Template,
    TemplateRegistry,
    browser,
    dom,
    $,
    TreeModel,
    _,
    Backbone
  ) {

    TemplateRegistry.add({
        id: "searchform", 
        name: "editor_queryfield_title",
        description: "editor_queryfield_description",
        weight: 1,

        getAdders: function (model) {
          if (model.type === "view") {
            return [{
                name: "editor_queryfield_title",
                icon: "../img/imginput.png"
            }];
          }
        },

        create: function (options) {
          return Backbone.View.prototype.make(
            "form",
            {
              "role": "search",
              "data-template": "searchform",
              "class": "mb-center"
            },
            '<input aria-label="search" data-template="suggest" data-property="title" data-grouped="true" data-source-id-pattern="document_property|tabs" data-initial-source-id-pattern="recent_query" class="mb-query" name="query" type="search" placeholder="Search">'
          );
        }

    });



    // SearchForm uses a given form and sets values based on field names
    // on the model. Thus starting a search
    var SearchFormTemplate = Template.extend({
      
      editableName: "editor_queryfield_title",
      
      hasContent: function() { return this.children && this.children.length > 0; },
      getContentSchema: function() {
        return  {
          type: "template"
        };
      },
      
      schema: new Template.Schema(
          {
          attributes: {     
          }
      }),      

      getContent: function() { return this.children[0].template; },
      
      createView: function(options)  {
        
        var inputModel = options.model;
        
        
        var id = this.attributeModel.get("id") || "main"; 
        if (id) {
          // adapt the model to the root query node.
          inputModel = inputModel.submodel("user.query");
        }
        
        var enableSearchReset = false, // TODO: re-implement: this.attributeModel.get("enable-search-reset") !== "false",
            view = new SearchForm(_.extend({
              application: options.application,
              template: this,
              el: this.el
              
            },
            options,
            {
              model: inputModel,
              outerModel: options.model,
              validatorRegistry: options.model.input,
              queryid: this.attributeModel.get("id"),
              
              requiresUserInput: this.attributeModel.get("requires-user-input") === "true",
              filterAsUserInput:  this.attributeModel.get("filter-as-user-input") && this.attributeModel.get("filter-as-user-input") .split(/\s*,\s*/) || [],
              enableSearchReset: enableSearchReset
            }));

        _.forEach(options.node.children, function (childNode) {
          var childView = childNode.template.createView({
            application: options.application,
            model: options.model,
            node: childNode,
            parentView: view,
            addQueryConstraints: !enableSearchReset,
            useConstraintsOnly: true
          });
          if (childView && childNode.template
            && childView.el !== childNode.template.el
            && childView.el !== childNode.template.el.parentNode) {
            $(childNode.template.el).after(childView.el);
          }
        });
        
        this.instances.push(view);

        return view;
      }
    });



    var SearchForm = ComponentBase.extend({

      initialize: function() {
        ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));
        // this.el is the form element
        this.options.application.formqueryadapter.addForm(this.el);
        this.elements = this.options.application.formqueryadapter.findElements(this.el);
      },

      remove: function () {
        ComponentBase.prototype.remove.apply(this, arguments);
        this.options.application.formqueryadapter.removeForm(this.el);
        this.elements = null;
      },

      events: function () {
        return _.extend({},
          ComponentBase.prototype.events,
          {
            "keypress": "handleKeyPress",
            "submit": "submit",
            "click button, click input": "handleClick",
            "blur input, blur select, blur textarea": "handleBlur",
            "changedata": "handleChangeData"
          });
      },

      doInstrument: function (handlerName) {
        if (/handleKeyPress|handleClick/i.test(handlerName)) return false;        
        return ComponentBase.prototype.doInstrument.apply(this, arguments);
      },

      handleClick: function (e, traceContext) {
        if (!this.el.submit && (e.target.tagName === "BUTTON" || e.target.type  === "submit")) {
          e.preventDefault();
          this.submit(e, traceContext);
        }
      },

      handleBlur: function (e, traceContext) {
        this.updateModel(true, traceContext);
      },

      handleKeyPress: function (e, traceContext) {
        if (e.keyCode === 13) {
          e.preventDefault();
          this.submit(e, traceContext);
        }
      },

      handleChangeData: function (eventObj) {
        var $el = $(eventObj.target);
        var queryexpr = $el.data("queryexpr");
        if (_.isFunction(queryexpr)) {
          queryexpr = queryexpr();
        }
        var newDescription = queryexpr && queryexpr.description || null;
        if ($el.is(this.$el) || $el.is(this.$el.find("input, select, textarea"))) {
          $el.val(newDescription);
        }          
      },

      setModel: function (model) {
        
        if (this.validator && this.options.validatorRegistry) {
          this.options.validatorRegistry.removeValidator(this.validator);
          delete this.validator;
        }
        ComponentBase.prototype.setModel.apply(this, arguments);
        if (this.model) {
          this.listenTo(this.model, "changeinput", this.changeInput);
          if (this.options.requiresUserInput && this.model && this.model.input && this.options.validatorRegistry) {
                        
            this.validator = _.bind(this.validate, this);
            this.options.validatorRegistry.addValidator(this.validator);
          }
        }
      },

      
      validate: function () {
        var userQuery; 
        if (this.options.outerModel) {
          userQuery = this.options.outerModel.input.get("user.query"); 
        }
        else {
          userQuery = this.model.input.get();
        }

        //__queryaction__ also should count as valid input.
        if (this.options.outerModel) {
          var constraints = this.options.outerModel.get("user.constraints");
          if (constraints) {
            var re = /__queryaction__.*/;
            var ids = _.filter(_.keys(constraints), function(entry) {
              return entry && entry.match(re);
            });
            for (var i = 0; i < ids.length; ++i) {
              var id = ids[i];
              var constraint = this.options.outerModel.get("user.constraints[" + JSON.stringify(id) +"]");
              if (constraint && !_.isEmpty(constraint)) {
                return true;
              }
            }
          }
        }
        if (this.options.outerModel && this.options.filterAsUserInput &&
            this.options.filterAsUserInput.length) {
          for (var i = 0; i < this.options.filterAsUserInput.length; ++i) {
            var id = this.options.filterAsUserInput[i];
            var filterBase = this.options.outerModel.get("user.constraints[" + JSON.stringify("filter_" + id) +"].filter_base");
            if (filterBase && !_.isEmpty(filterBase)) {
              return true;
            }
          }
        }

        return !!userQuery && !_.isEmpty(userQuery) && (!userQuery.and || !_.isEmpty(userQuery.and)) ;
      },

      /* update from change event */
      changeInput: function (model, options) {
        var options = options || {}, that = this;
         _.forEach(this.elements, function (element) {
           var fieldName = element.name || "query",
                $element = $(element),
                update =  (!$element.is(":focus") || options.forceUIUpdate);
           
           var fieldInfo = that.options.application.formqueryadapter.field(fieldName);
           // ignore fields that we did not track initially.
           if (!fieldInfo || ! fieldInfo.path || !update) return;
           
           var query = model.get(fieldInfo.path);
           var selector = fieldInfo.queryType || "unparsed";
           var value = query && query[selector] || null;

           //TODO: userInputView value to "" if value and expr is undefined

           if ($.data(element, "queryexpr") || (!value && query)) {
             // query exist, is not unparsed (structured)
             if (!value && query) {
               var expr = $element.data("queryexpr");
               if (expr && _.isFunction(expr)) {
                expr(query);
               }
               else {
                $element.data("queryexpr", query).trigger("changedata");                  
               }
             }
             else {
               // 1) remove queryexpr from input
               var expr = $element.data("queryexpr");
               if (!_.isFunction(expr)) {
                $element.data("queryexpr", null);
               } 
               // 2) set value to unparsed
               $element.val(value);
             }
           }
           else {
             $element.val(value);
           }
            
         });
      },

      change: function (model, options) {
      },

      
      query: function() {
        // return this.model.input.get();
        return this.computeModel();
      },

      setQuery: function (query) {
        if (!query) return;

        var queryValue = _.isString(query) ? query : query.unparsed || (query.get && query.get("unparsed"));
        if (queryValue && this.el.query) {
          this.el.query.value = queryValue;
        }
      },

      submit: function (e, traceContext, value, usedAutocomplete, options) {
        traceContext = traceContext && traceContext.willLeave();
        options = options || {}

        try {
          if (e)
            e.preventDefault();

          var submitAction = this.el.getAttribute("data-submit-action");

          if (submitAction) {
            var handleFunction = new Function("application", "view", "options", submitAction);
            try {
              return handleFunction.apply(this.model, [this.options.application, this, options]);
            } catch (e) {
              if (console && console.error) 
                console.error("Failed to execute action", JSON.stringify(submitAction), e);
            }
          }

          if (browser.isTouchDevice()) {
            this.$el.find(":focus").blur();
          }

          this.options.application.models.stack.popToApplication(this.options.application);

          if (options.changeViewValue) {
            this.options.application.models.search.deactivate();
            this.options.application.changeView({name: options.changeViewValue})
            if (value && value.length > 0) {
              this.options.application.models.search.activate({ silent: true });
              this.updateModel(options.silent, traceContext);
            } else {
              this.options.application.models.search.activate({ silent: false });
            }
          } else {
            this.updateModel(options.silent, traceContext);
          }

          if (this.el.getAttribute("aria-controls")) {
            this.focusAfterNextComputed("#" + this.el.getAttribute("aria-controls"));
          }
        } finally {
          traceContext && traceContext.leave();
        }
      },

      focusAfterNextComputed: function (selector) {
        var changeFocus = true
        $(document.body).on("focusin.mb-searchform", function (e) {
          changeFocus = false;
        });
        this.model.once("computed", function () {
          _.defer(function () {
            $(document.body).off(".mb-searchform");
            if (changeFocus) {
              dom.focus($(selector));
            }
          });
        });
      },

      _updateInput: function(input, formqueryadapter, silent, traceContext) {
        var changecount = 0;
        var that = this;
        _.forEach(this.elements, function (element) {
          var fieldName = element.name,
              $element = $(element);
          if (!fieldName) return;

          var fieldInfo = that.options.application.formqueryadapter.field(fieldName);
          var selector = fieldInfo.queryType || "unparsed";
          var expr = $.data(element, "queryexpr");          
          var elVal = $element.val();
          if (!expr && elVal) {
            expr = {};
            expr[selector] = elVal;
          }
          
          // exprAndPath also transforms expr according to definitions.
          //    currently optionally adds labels.
          if (_.isFunction(expr)) {
            expr = expr();            
          }

          var fieldPathAndExpr = formqueryadapter.exprAndPath(fieldName, expr);

          // ignore fields that we did not track initially.
          if (!fieldPathAndExpr || ! fieldPathAndExpr.path) return;

          var options =  {path: fieldPathAndExpr.path, traceContext: traceContext, silent: true};
          if (fieldPathAndExpr.expr) {
            // remove first, then set again (no merge)
            input.unset(null, options);
            input.set(fieldPathAndExpr.expr,options);
          }
          else {
            input.unset(null, options);
          }
          changecount++;
        });
        return changecount;
      },

      clearModel: function(options) {
        var input = this.model.input,
            changecount = 0,
            formqueryadapter = this.options.application.formqueryadapter,
            options = options || {}
        ;
        _.forEach(this.elements, function (element) {
          var fieldName = element.name,
              $element = $(element);
          if (!fieldName) return;
          var fieldPathAndExpr = formqueryadapter.exprAndPath(fieldName, null);
          
          // ignore fields that we did not track initially.
          if (!fieldPathAndExpr || ! fieldPathAndExpr.path) return;

          var options =  _.extend({}, options, {path: fieldPathAndExpr.path});

          input.unset(null, options);
          changecount++;
        });
        return changecount;
      },

      updateModel: function(silent, traceContext) {
        var that = this, changecount = 0;

        if (!silent && this.options.enableSearchReset) {
          this.options.application.resetSearch({silent: true});
        }

        changecount = this._updateInput(this.model.input, this.options.application.formqueryadapter, silent, traceContext);
        if (changecount > 0 && !silent) {
          this.model.input.change({traceContext: traceContext, force: true});
        }
      },
     
      computeModel: function() {
        var input = new TreeModel();
        this._updateInput(input, this.options.application.formqueryadapter);
        return input.get();
      },

      computing: function () {
      }
  });

  /**
   * Defines a private searchform if the component does not have one.
   */
  var SearchFormComponent = ComponentBase.extend({
    initialize: function() {
      var that = this;
      ComponentBase.prototype.initialize.apply(this, arguments);
      if (this.el.form == null) {
        if (this.options.property) {
          this.el.name = this.options.property;
        }
        var inputModel = this.options.model;
        inputModel = inputModel.submodel("user.query");

        var options = _.extend({}, this.options, {model: inputModel, outerModel: this.options.model, el: this.el});
        this.searchform = new SearchForm(options);
        this.options.parentView = this.searchform;

        // redo event registration, so events get registered in the correct order
        this.searchform.undelegateEvents();
        _.defer(function () {
          that.searchform.delegateEvents();
        });
      }
    },

    remove: function () {
      if (this.searchform) {
        this.searchform.remove();
      }
    }
  });

  SearchFormTemplate.View = SearchForm;
  SearchFormTemplate.ComponentView = SearchFormComponent;


  return SearchFormTemplate;
  }
);

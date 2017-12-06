/*========================================================================
* $Id: preview.js 100931 2017-08-22 16:03:09Z michael.biebl $
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
    "component!base",
    "service/channel_factory",
    "model/properties",
    "utils/trace",
    "api/v2/search",
    "text!../mustache/template.mustache",
    "jquery",
    "underscore"
  ], function(
    Template,
    ComponentBase,
    ChannelFactory,
    PropertiesModel,
    Trace,
    Search,
    DEFAULT_TEMPLATE,
    $,
    _
  ) {

    var PreviewTemplate = Template.extend({
      editableName: "editor_preview_title",

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      schema: new Template.Schema({
        attributes: {
          "completehtml": {
            type: "boolean",
            title: "editor_preview_completehtml",
            required: false
          },
          "enablePdfjs": {
            type: "boolean",
            title: "editor_preview_enable_pdfjs",
            "default": true,
            defaultValue: true
          }
        },
        inputAttributes: {
          "location": {
            title: "location"
          },
          "full_html": {
            type: "boolean",
            title: "editor_preview_full_html",
            required: false
          }
        },
      }),

      getDefaultTemplate: function () {
        return DEFAULT_TEMPLATE;
      },

      hasContent: function() { return true; },
      getContentSchema: function() {
        return  {
          type: "template"
        };
      },

      getContent: function() { return this.children[0].template; },

      createView: function(options)  {

        var completehtml = true;
        if (this.attributeModel.get("completehtml") === false) {
          completehtml = false;
        }

        var view = new PreviewView(_.extend({},
            this.schema ? this.schema.parseAttributes(this.attributeModel.getCamelCase()): this.attributeModel.getCamelCase(),
            options, {
              application: options.application,
              template: this,
              completehtml: completehtml,
              resultTemplate: options.node.children[0].template
        }));
        this.instances.push(view);
        return view;
      },

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
      },

      name: function () {
        return null;
      }
  });

  var PreviewView = ComponentBase.extend({

    // this.options
    // this.el
    // this.model

    initialize: function (args) {
      var that = this;
      this.api = this.options.application.api;
      ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));
      this.model = this.api.preview.createOutput();
      this.resizeCallback = _.bind(this.resize, this);
      $(window).on("resize", this.resizeCallback);
    },

    remove: function() {
      $(window).off("resize", this.resizeCallback);
      Trace.enableHTML5Screenshot(this.html5ScreenshotWasEnabled);
      return ComponentBase.prototype.remove.apply(this, arguments);
    },

    clear: function () {
      this.el.innerHTML = "";
    },

    getDisplayedProperties: function () {
      var properties =_.extend({}, this.options.resultTemplate.properties);
      delete properties["."];
      return properties;
    },

    pageY: function(elem) {
      return elem.offsetParent ? (elem.offsetTop + this.pageY(elem.offsetParent)) : elem.offsetTop;
    },

    resizeToBottom: function(elem, buffer) {
      var height = elem.ownerDocument.documentElement.clientHeight;
      height -= this.pageY(elem)+ buffer ;
      height = (height < 0) ? 0 : height;
      elem.style.height = height + 'px';
    },

    resize: function() {
      var el = $(this.el).find(".mb-previewcontent").get(0);
      if (el) {
        this.resizeToBottom(el, 55);
      }
      else {
      }
      return this;
    },

    setContentPreview: function(application, preview, options) {
      var channel = options.channel;

      if (this.parentView) {
        this.parentView.$el.addClass("mb-in-preview");
      }

      this.removeOwnedNodes();

      var containerEl = this.make("div", {"class": "mb-preview"});
      var url = "" + preview.content_location;

      if (preview.query_expr) {
        try {
          var query = Search.SearchRequest.jsonifyQueryExpr(preview.query_expr);
          var queryStr = JSON.stringify(query);
          var queryParam = encodeURIComponent(queryStr);
          if (queryParam) {
            url += "&queryjsonv2=" + queryParam;
          }
        } catch (e) {
          if (console && console.warn) console.warn("Failed to process query expr:", preview.query_expr, e);
        }
      }

      // don't use object, if we are in Mobile Safari
      if (preview.content_type == "application/pdf" && !/mobile.*safari/i.test(navigator.userAgent)) {
        var objectEl = this.make("object", {
                         "data": url,
                         "class": "mb-previewcontent",
                         "style": "width: 100%; height: 100%"
                       });

      } else {
        var objectEl = this.make("iframe", {
                                 "src": url,
                                 "class": "mb-previewcontent",
                                 "style": "width: 100%; height: 100%"
                       });
        

      }

      containerEl.appendChild(objectEl);
      this.appendChild(containerEl, true);

      this.pdfjslistener(preview);
      this.pdfjsviewerinit(objectEl);

      containerEl.setAttribute("tabindex", "0");
    },

    pdfjslistener: function(preview) {
      var that = this;
      var model = preview && preview.model.output;
      window.addEventListener("message", function(e) {
        if (_.isObject(e.data) && e.data.name) {

          //var $element = $(that.el).find("#pdfViewerTable");
          var targetInfo = {};
          var eventObj = {view: this, 
                          model: preview.model, 
                          application: that.options.application,
                          targetInfo: targetInfo};

          if (e.data.name == "pdfjsviewer:annotation:mouseover") {
            targetInfo.offset = e.data.offset;
            targetInfo.href = e.data.href;        
            targetInfo.dimensions = e.data.dimensions;    
            that.options.application.views.trigger("preview:annotation:mouseover", eventObj);

          } else if (e.data.name == "pdfjsviewer:annotation:mouseleave") {
            that.options.application.views.trigger("preview:annotation:mouseleave", eventObj); 
            
          } else if (e.data.name == "pdfjsviewer:annoation:click") {
            that.options.application.views.trigger("preview:annoation:click", eventObj);
          }
        }
      }, false);

    },

    pdfjsviewerinit: function(objectEl) {
      if (objectEl.tagName == "IFRAME") {
        $(objectEl).load(function() {

            //$(this.parentElement).prepend('<div id="pdfViewerTable" style="display:none;position:absolute;background-color:#e2e2e2;border-radius:3px;padding:5px;"></div>');

            window.addEventListener("message", function(e) {
              if (_.isObject(e.data) && e.data.name == "pdfjsviewerinit") {
                e.source.postMessage(
                {
                  name: "pdfjsviewersetuptransformers",
                  annotationTransformer: encodeURI(function (annObj, _) {
                    if (annObj.href && annObj.href.match(/[&?]isnegation=true/)) {
                      annObj.isEntity = true;
                      annObj.style = {"border-color": "green"};
                      return annObj;
                    } 
                    else {
                      annObj.isEntity = true;
                      annObj.style = {"color": "green"};
                      return annObj;
                    }
                  })
                },
                "*");
                }
              }, false);

        });
      }
    },

    setHtmlPreview: function(application, html, options) {
      var options = options || {};
      var model = new PropertiesModel([],
                                      {propertyDefinitions: {}});
      var leave = Trace.events.uiRender.enter(options.traceContext && options.traceContext.context);

      try {
        if (this.parentView) {
          this.parentView.$el.addClass("mb-in-preview");
        }

        if (model) {
          model.trigger("change");
        }
        this.removeOwnedNodes();


        var containerEl = this.make("div", {"class": "mb-html-preview-container"});
        $(containerEl).html(html);

        if (options && options.model && options.model.get("categoryclass") && _.isString(options.model.get("categoryclass"))) {
          $(containerEl).addClass(options.model.get("categoryclass"));
        }

        this.appendChild(containerEl, true);

        containerEl.setAttribute("tabindex", "0");
        window.setTimeout(function () {
            containerEl.focus();
          }, 1);
      } finally {
        leave.leave();
      }
    },

    setPreview: function (application, model, options) {
      options = options || {};

      var leave = Trace.events.uiRender.enter(options.traceContext && options.traceContext.context);

      try {
        var that = this,
            view = this.options.resultTemplate.createView({model: model, application: application}),
            originalRemove = view.remove;

        if (this.parentView) {
          this.parentView.$el.addClass("mb-in-preview");
        }

        view.remove = function () {
          if (_.isFunction(originalRemove)) {
            originalRemove.apply(view, arguments);
          }
          if (that.parentView) {
            that.parentView.$el.removeClass("mb-in-preview");
          }
        };

        if (model) {
          model.trigger("change");
        }
        this.removeOwnedNodes();
        this.appendChild(view.el, true);

        view.$el.attr("tabindex", "0");
        window.setTimeout(function () {
            view.$el.focus();
          }, 1);
      } finally {
        leave.leave();
      }
    }
  });

  PreviewTemplate.View = PreviewView;

  return PreviewTemplate;
});

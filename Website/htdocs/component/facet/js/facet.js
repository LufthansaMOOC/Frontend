/*========================================================================
* $Id: results.js 72480 2013-05-02 16:02:46Z michael.biebl $
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
* FacetsTemplate
* ==============
*
* A component to display facets.
*
* Structure
* ---------
*
* +-------------------+ model: ViewModel
* |+-----------------+| collection: FacetValueCollection
* || titleEl         ||
* |+-----------------+|
* |+-----------------+|
* || itemsEl         ||
* ||+---------------+||
* ||| item 0        ||| model: ComputedModel - input: input von ViewModel
* ||+---------------+||                      \ output: ReadOnlyTree von Facettenwert
* || ...             ||
* ||+---------------+||
* ||| item n        |||
* ||+---------------+||
* |+-----------------+|
* +-------------------+
*
*/

define([
    "i18n/i18n",
    "api/v2/search",
    "client/template",
    "component!mustache",
    "component!base",
    "client/templateregistry",
    "utils/dom",
    "jquery",
    "underscore",
    "backbone"
  ], function(
    i18n,
    Search,
    Template,
    MustacheTemplate,
    ComponentBase,
    TemplateRegistry,
    dom,
    $,
    _,
    Backbone
  ) {

    var DEFAULT_FACET_TEMPLATE = 
      "<script type=\"text/x-mustache-template\" data-tag-name=\"li\"><a href=\"#\" class=\"action\" data-add=\"user.constraints\" data-ref=\"query_expr\">{{html}} <span class=\"pull-right\">{{count}}</span></a></script>";

    TemplateRegistry.add({
        id: "facet",
        name: "editor_facet_title",
        weight: 4,

        getAdders: function (model, application) {
          if (model.type === "view") {
            var available_facets = application.models.search.get("available_facets") || [];
            available_facets = available_facets.sort(function (a, b) {
              a = a && a.name;
              b = b && b.name;

              return a < b ? -1 : 1;
            });
            return _.collect(available_facets, function (facet, name) {
		name =  _.isNumber(name) ? facet : name;

                return {
                  name: name,
                  icon: "../img/imgfacet.png",
                  options: {
                    name: facet,
                    title: name
                  }
                }
            }).concat([{
                  icon: "../img/imgcrumbs.png",
                  name: "editor_breadcrumb_title", 
                  description: "editor_breadcrumb_description",
                  options: {
                    type: "breadcrumbs"
                  }
            }]);
          }
        },

        create: function (options) {
          if (options.type === "breadcrumbs") {
            return Backbone.View.prototype.make(
              "ul",
              {
                "data-template": "list",
                "data-model": "user.constraints",
                "class": "breadcrumb"
              },
              '<script type="text/x-mustache-template" data-tag-name="li"> <a href="#" class="action" data-action="this.unset();">{{{description}}} <i class="icon-remove"></i></a></script>'
            );
          }
          return Backbone.View.prototype.make(
            "div",
            {
              "data-template": "facet",
              "data-name": options.name,
              "data-title": options.title
            },
            DEFAULT_FACET_TEMPLATE
          );
        }

    });


  var FacetTemplate = Template.extend({

    initialize: function () {
      Template.prototype.initialize.apply(this, _.toArray(arguments));
      this.$el = $(this.el);

// TODO: reenable but move to view itself (like Compound + Facet)      this.append(dom.instantiate('<input aria-label="search" data-template="suggest" data-property="' + this.attributeModel.get("name") + '" data-source="DOCUMENT_PROPERTY" name="query" type="search" placeholder="Search">'));
    },
    
    getDefaultTemplate: function () {
      return DEFAULT_FACET_TEMPLATE;
    },

    createView: function(options)  {
      var view = new this.constructor.View(_.extend(this.attributeModel.getCamelCase(),
        options, {
        application: options.application,
        el: this.el,
        template: this,
        facetTitle: this.get("title"),
        facetName: this.get("name"),
        elementTemplate: options.node && options.node.children && options.node.children[0] && options.node.children[0].template
      }));
      this.instances.push(view);
      return view;
    },

    schema: new Template.Schema({
      attributes: {
        name: {
          type: "string",
          title: "editor_facet_name",
          required: true,
          model_stored: true
        },
        title: {
          type: "string",
          title: "editor_facet_title_label"
        }
      }
    }),


    hasContent: function() { return true; },
    getContentSchema: function() {
      return  {
        type: "template"
      };
    },

    getContent: function() { return this.children[0].template; },
    setContent: function(v, i) { this.children[0].template = v; },

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

  FacetTemplate.View = ComponentBase.extend({

    defaultOptions: {
      titleTagName: "h5",
      titleClassName: "",
      containerTagName: "ul",
      containerClassName: "nav nav-stacked nav-pills",
      showTitle: true
    },

    initialize: function(args) {
      ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));

      this.titleEl = this.make(this.options.titleTagName || this.defaultOptions.titleTagName, {"class":this.options.titleClassName}, this.options.facetTitle || this.getFacetTitleOfModel());
      this.titleEl.style.display = "none";
      this.itemsEl = this.make(this.options.containerTagName || this.defaultOptions.containerTagName, {"class": this.options.containerClassName}, "");
      this.insertAt(this.itemsEl, 0);
      if (this.options.showTitle) {
        this.insertAt(this.titleEl, 0);
      }

      this.collection = new Search.FacetValueCollection(this.options.facetName, this.properties || this.options.elementTemplate.properties, {});

      this.collection.on("add", this.addOne, this);

      // TODO: don't use silent
      if (this.model.addFacet) this.model.addFacet(this.collection, { silent: true });
    },
	
	setEditable: function () {
		if (/>/.test(this.options.facetName)) return null;
		return ComponentBase.prototype.setEditable.apply(this, arguments);
    },

    getFacetTitleOfModel: function () {
      try {
        return this.options.facetTitle = this.model.get('facets')[this.options.facetName].name;
      } catch(e) {}
    },

    addOne: function(model, collection, options) {
      options = options || {};
      var that = this,
          position = options.at,
          name = this.options.facetName + ">" + model.get("id"),
          view = this.options.elementTemplate.createView({model: model, application: this.options.application});

      var viewEl = view.render().el;

      // update the title
      try {
        if (!this.options.facetTitle) {
          this.titleEl.innerHTML = this.getFacetTitleOfModel() || this.titleEl.innerHTML ;
        }
        this.titleEl.style.display = "block";
      } catch(e) {console.log(e);}

      // TODO: take into account the title element
      var append = !this.itemsEl.hasChildNodes() || !(position < this.itemsEl.childNodes.length);

      if (append) {
        this.itemsEl.appendChild(viewEl);
      } else {
        var beforeEl = this.itemsEl.childNodes[position];
        this.itemsEl.insertBefore(viewEl, beforeEl);
      }
    },

    render: function() {
      return this;
    },

    dispose: function () {
     this.collection.dispose(this.options.disposeOptions);
    },

    /*
       Important to override, since we
       share the same object as the template
     */
    remove: function () {
      ComponentBase.prototype.remove.apply(this, arguments);
      this.collection.off("add");
      this.dispose();
      return this;
    }

  });

  return FacetTemplate;
});

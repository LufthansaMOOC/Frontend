/*========================================================================
* $Id: results.js 83202 2015-02-25 08:44:04Z jakob.praher $
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

Mindbreeze.define([
    "i18n/i18n",
    "api/v2/search",
    "client/resourceinfo",
    "client/template",
    "component!base",
    "component!results",
    "client/templateregistry",
    "utils/trace",
    "jquery",
    "text!../mustache/template.mustache",
    "jquery-ui-autocomplete",
    "./lib/lightGallery",
  ], function(
    i18n,
    Search,
    ResourceInfo,
    Template,
    ComponentBase,
    Results,
    TemplateRegistry,
    Trace,
    $,
    DEFAULT_TEMPLATE
  ) {

   var loadCss = function (url, id) {
   var el = document.getElementById(id);

   if (!el) {
     el = document.createElement("link");
     el.rel = "stylesheet";
     el.href = url;
     el.id = id;
     (document.head || document.getElementsByTagName("script")[0].parentNode).appendChild(el);
   }
  }

  loadCss(ResourceInfo.scriptLocation + "../client/component/gallery/js/lib/lightGallery.css", "mbLightGalleryCss");


    var GalleryTemplate = Results.extend({

      editableName: "editor_gallery_title",

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      schema: new Template.Schema({
        inputAttributes: {
          appendOnScroll: {
            title: "editor_result_append_on_scroll",
            type: "boolean",
            defaultValue: false
          }
        }
      }),
    
      createView: function(options)  {
        var view = new GalleryView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el,
              resultTemplate: options.node.children[0].template,
              appendOnScroll: this.el.getAttribute("data-appendonscroll") === "true"
        }));
        this.instances.push(view);
        return view;
      }
  });

  var GalleryView = Results.View.extend({

    events: {
    },

    initialize: function() {
      ComponentBase.prototype.initialize.apply(this, arguments);
    },

    _getOrCreateGalleryNodes: function() {
      if (!this.galleryNodes) {
        this.galleryOuter = this.appendChild(this.make("div", {"class": "mb-gallery row media-body"}), true);
        this.galleryEl = this.galleryOuter.appendChild(this.make("ul", {"class": "mb-gallery"}));
        this.galleryNodes = new ComponentBase.TrackedNodeCollection(this.galleryEl);  
      }
      return this.galleryNodes;
    },
    
    _destroyGallery: function() {
      if (this.gallery) {
        this.gallery.destroy();
        this.gallery = null;
      }
    },

    computing: function () {
      this._destroyGallery();
      Results.View.prototype.computing.apply(this, arguments);    
    },
  
    computed: function () {
      ComponentBase.prototype.computed.apply(this, arguments);      
      this._destroyGallery();
      if (this.galleryEl) {
        this.gallery = $(this.galleryEl).lightGallery({addClass: 'mb-gallery-show', 'showThumbByDefault': true});
      }
      Results.View.prototype.computed.apply(this, arguments);
    },
    
    insertView: function(viewEl, position, group) {
      this._getOrCreateGalleryNodes().insertAt(viewEl, position);
    },
  
    render: function() {
      var el;
      return el;
    },

    remove: function () {
      this._destroyGallery();
      if (this.gallerNodes) {
        this.galleryNodes.removeOwnedNodes();
      }
      return Results.View.prototype.remove.apply(this, arguments);      
    },

    dispose: function () {
      this._destroyGallery();
      Results.View.prototype.dispose.apply(this, arguments);      
    }
  });

  GalleryTemplate.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;

  GalleryTemplate.View = GalleryView;

  return GalleryTemplate;
});

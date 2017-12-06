/*========================================================================
* $Id: map.js 98251 2017-05-17 11:40:10Z daniel.eppensteiner $
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
     "component!results",
     "client/resourceinfo",
     "utils/dom",
     "i18n/i18n",
     "jquery",
     "underscore",
     "./leaflet/leaflet",
     "text!../mustache/template.mustache"
   ], function(
     Template,
     Results,
     ResourceInfo,
     dom,
     i18n,
     $,
     _,
     L,
     DEFAULT_TEMPLATE
   ) {


  // A simple map example that can display cities by name
  // sub-component of results

  var ResultsView = Results.View,
      MapView = ResultsView.extend({

    events: function () {
      return _.extend(
        {},
        Results.View.prototype.events,
        {
          "click a[href^='#']": "skip"
        }
      );
    },

    initialize: function () {
      ResultsView.prototype.initialize.apply(this, arguments);
      L.Icon.Default.imagePath = ResourceInfo.scriptLocation + "../client/component/map/js/leaflet/images/";

      this.skipDownEl = dom.instantiate('<a class="mb-acc" id="before-' + this.cid + '" href="#after-' + this.cid + '">' + i18n("map_skip_down") + '</a>');
      this.skipUpEl = dom.instantiate('<a class="mb-acc" id="after-' + this.cid + '" href="#before-' + this.cid + '">' + i18n("map_skip_up") + '</a>');
    },

    setModel: function () {
      var that = this;
      ResultsView.prototype.setModel.apply(this, arguments);

      this.listenTo(this.collection, 'remove', this.removeOne);
    },

    skip: function (e) {
      var targetName = e.currentTarget.getAttribute("href").substring(1);
      if (!targetName) return;
      dom.focus(document.getElementById(targetName));
      e.preventDefault();
    },

    removeOne: function () {
      this.hide();
      this.update();
    },

    hide: function () {
      this.$el.hide();
      if (this.mapEl && this.mapEl.parentNode) {
        this.skipUpEl.parentNode.removeChild(this.skipUpEl);
        this.mapEl.parentNode.removeChild(this.mapEl);
        this.skipDownEl.parentNode.removeChild(this.skipDownEl);
      }

      if (this.markerGroup) this.markerGroup.clearLayers();
      this.latLngBounds = new L.LatLngBounds();
    },

    show: function () {
      if (!this.mapEl) return;
      if (this.mapEl.parentNode != this.el) {
        this.el.appendChild(this.skipDownEl);
        this.el.appendChild(this.mapEl);
        this.el.appendChild(this.skipUpEl);
      }
      this.$el.show();
    },

    updateState: function () {
    },

    render: function () {
      this.mapEl = this.mapEl || document.createElement("div");
      if (!this.map) {
        if (!this.mapEl) {
          return;
        }
        this.mapEl.style.height = "300px";
        this.mapEl.style.width = "100%";
        // create a map in the "map" div, set the view to a given place and zoom
        this.map = L.map(this.mapEl, {
            scrollWheelZoom: false
        });

        // add an OpenStreetMap tile layer
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            detectRetina: true
        }).addTo(this.map);

        this.markerGroup = new L.LayerGroup();
        this.markerGroup.addTo(this.map);
        this.latLngBounds = new L.LatLngBounds();
      }

      return this;
    },
  
    getDisplayedProperties: function () {
      var displayProperties = ResultsView.prototype.getDisplayedProperties.apply(this, arguments);

      displayProperties[JSON.stringify("title")] = {format: "VALUE"};
      displayProperties[JSON.stringify("actions")] = {format: "VALUE"};
      displayProperties[JSON.stringify("geo_latitude")] = {format: "VALUE"};
      displayProperties[JSON.stringify("geo_longitude")] = {format: "VALUE"};

      return displayProperties;
    }, 

    addOne: function(model) {
      this.update();
    },

    update: function () {
      try {
        var that = this,
            visible = false;

        if (this.markerGroup) this.markerGroup.clearLayers();
        _.each(this.collection.models, function (model) {
          var title = model.get("title"),
              href = model.get("actions[0].href"),
              latitude = model.get("geo_latitude"),
              longitude = model.get("geo_longitude");

              if (!latitude || !longitude) return false;


              if (latitude && _.isArray(latitude) && latitude.length > 1) {

                _.each(latitude, function(latitude, i) {

                  var longitude = model.get("geo_longitude")[i];
                  var latitude = latitude;

                  if ( (latitude >= -90) && (latitude <= 90) && (longitude >= -180) && (longitude <= 180) ) {
                    that.render();
                    visible = true;
                    var latLng = new L.LatLng(latitude, longitude);

                    if (that.map) {
                      that.map.invalidateSize();
                    }
                    that.show();
                    L.marker(latLng).addTo(that.markerGroup).bindPopup(that.renderMarker(model)).openPopup();
                    that.latLngBounds.extend(latLng);
                  }   
                });
              } else {
                if ( (latitude >= -90) && (latitude <= 90) && (longitude >= -180) && (longitude <= 180) ) {

                  that.render();
                  visible = true;
                  var latLng = new L.LatLng(latitude, longitude);

                  if (that.map) {
                    that.map.invalidateSize();
                  }
                  that.show();
                  L.marker(latLng).addTo(that.markerGroup).bindPopup(that.renderMarker(model)).openPopup();
                  that.latLngBounds.extend(latLng);
                }
              }
        });

        if (visible) {
          this.map.fitBounds(that.latLngBounds.pad(0.15));
        } else {
          this.hide();
        }
      } catch (e) {
      }
    },

    renderMarker: function (model) {
      try {
        var view = this.options.resultTemplate.createView({model: model, application: this.options.application, "parent": this, modelType: "Result"}),
            viewEl = view.render().el;

        return viewEl;
      } finally {
      }
    },

    remove: function () {
        this.hide();
        this.setEditable(false);
        this.computed();

        this.removeOwnedNodes();
        if (!this.options.template || this.options.template.el != this.el) {
          $(this.el).remove();
        }

        this.setModel();

        this.stopListening();
        this.undelegateEvents();
        Results.View.prototype.remove.apply(this, arguments);
    }
  });
  
  var Maps =  Results.extend({

      createView: function (options) {
        var view = new MapView(_.extend({}, options, {
              application: options.application,
              template: this,
              resultTemplate: this.getContent(),
              el: this.el
        }));
        this.instances.push(view);
        return view;
      },

      schema: new Template.Schema({
        inputAttributes: {
          view: {
            title: "Search",
            type: "reference",
            reference: "view"
          }
        }
      }),

      hasContent: function () { return true },

      getContent: function() { return this.children[0].template; }
  });
  
  Maps.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;
  return Maps;
});


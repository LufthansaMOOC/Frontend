/*========================================================================
* $Id: slider.js 82413 2014-12-18 14:03:53Z michael.biebl $
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
*           viewport
* strip     +---------+ 
* +- - - - -|---------|- - - - -+
* | +-----+ | +-----+ | +-----+ |
* | |     | | |     | | |     | |
* | +-----+ | +-----+ | +-----+ |
* +- - - - -|---------|- - - - -+
*           +---------+ 
*
* Model
* -----
*
* SelectableCollection
*
* Selected collection entry is displayed at the center
* You can jump to a specific position
*
* CSS
* ---
*
* - strip is animated and moved to the left
*
*/

define([
    "component!base",
    "client/template",
    "client/views/list",
    "client/resourceinfo"
  ], function(
    BaseView,
    Template,
    ListView,
    ResourceInfo
  ) {

  // TODO: head needn't be available
  // TODO: wait until css is loaded
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = ResourceInfo.scriptLocation + "../client/component/slider/css/slider.css?" +  new Date().getTime();
  document.head.appendChild(css);

  var SliderTemplate = Template.extend({
      hasContent: function() { return true; }
  });

  SliderTemplate.DEFAULT_TEMPLATE = '';

  SliderTemplate.View = BaseView.extend({

    className: "mb-slider",

    initialize: function() {
      BaseView.prototype.initialize.apply(this, arguments);
      this.listenTo(this.model, "change:selection", this.update);
      this.strip = new ListView({
        model: this.model,
        className: "mb-strip"
      });
      this.$el.addClass(this.options.className || this.className);
      this.el.appendChild(this.strip.el);
    },

    setModel: function () {
      BaseView.prototype.setModel.apply(this, arguments);
      if (this.strip) {
        this.strip.setModel(this.model);
      }
    },

    update: function () {
      var index = this.model.selectionIndex(),
          offset = -100 * index;

      if (offset > 0) offset = 0;

      this.strip.el.style.left = offset + "%";
    },
    
    remove: function() {
      this.strip.remove.apply(this.strip, arguments);
      BaseView.prototype.remove.apply(this, arguments);
    }

  });

  return SliderTemplate;
});

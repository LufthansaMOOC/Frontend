/*========================================================================
* $Id: stepper.js 82869 2015-02-06 08:46:39Z michael.biebl $
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
    "api/v2/search",
    "client/template",
    "component!base",
    "client/templateregistry",
    "i18n/i18n",
    "mustache",
    "client/resourceinfo",
    "jquery"
  ], function(
    Search,
    Template,
    ComponentBase,
    TemplateRegistry,
    i18n,
    Mustache,
    ResourceInfo,
    $
  ) {

    var LEFT = 37,
        RIGHT = 39;


    var StepperTemplate = Template.extend({
        hasContent: function() { return true; }
    });

  StepperTemplate.DEFAULT_TEMPLATE = 
    '<div class="mb-stepper">' + 
      '<a style="display: none;" href="#" class="mb-stepper-left" data-action-object="{&quot;stepPrevious&quot;: {}}"><img src="' + ResourceInfo.scriptLocation + '../client/component/stepper/img/arrow-left.png"></a>' +
      '<a style="display: none;" href="#" class="mb-stepper-right" data-action-object="{&quot;stepNext&quot;: {}}"><img src="' + ResourceInfo.scriptLocation + '../client/component/stepper/img/arrow-right.png"></a>' + 
    '</div>';

  StepperTemplate.View = ComponentBase.extend({
    initialize: function() {
      ComponentBase.prototype.initialize.apply(this, arguments);
      // TODO: make optional
      var that = this;
      $(document.body).bind("keydown", function (e) {
          switch (e.keyCode) {
           case LEFT: that.left(); break;
           case RIGHT: that.right(); break;
          }
      });
      this.model.on("change", this.render, this);
    },

    left: function () {
      if (!this.state || this.state.first) return;
      this.$el.find(".mb-stepper-left").click();
    },

    right: function () {
      if (!this.state || this.state.last) return;
      this.$el.find(".mb-stepper-right").click();
    },

    update: function (state) {
      this.state = state;
      if (state.first) {
        $(".mb-stepper-left", this.el).fadeOut();
      }
      else {
        $(".mb-stepper-left", this.el).fadeIn();
      }

      if (state.last) {
        $(".mb-stepper-right", this.el).fadeOut();
      }
      else {
        $(".mb-stepper-right", this.el).fadeIn();
      }
    },
    
    render: function() {
      /*if (!this.model.get("resultset.prev_avail")) {
        $("> .mb-previous", this.el).hide();
      }
      else {
        $("> .mb-previous", this.el).show();
      }
      
      if (!this.model.get("resultset.next_avail")) {
        $("> .mb-next", this.el).hide();
      }
      else {
        $("> .mb-next", this.el).show();
      }*/
      return this;
    }
  });

  return StepperTemplate;
});

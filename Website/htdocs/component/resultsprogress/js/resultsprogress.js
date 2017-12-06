/*========================================================================
* $Id: results.js 81503 2014-10-14 06:36:09Z jakob.praher $
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
    "i18n/i18n",
    "api/v2/search",
    "client/template",
    "component!base",
    "client/templateregistry",
    "utils/trace",
    "jquery",
    "underscore"
  ], function(
    i18n,
    Search,
    Template,
    ComponentBase,
    TemplateRegistry,
    Trace,
    $,
    _
  ) {


    var label = i18n("preview");

    var ResultsProgressTemplate = Template.extend({

      initialize: function () {
        Template.prototype.initialize.apply(this, _.toArray(arguments));
        this.$el = $(this.el);
      },

      schema: new Template.Schema({
        inputAttributes: {          
        }
      }),
    
      hasContent: function() { return false; },

      createView: function(options)  {
        var view = new ResultsProgressView(_.extend({}, options, {
              application: options.application,
              template: this,
              el: this.el
        }));
        this.instances.push(view);
        return view;
      }
  });

  var ResultsProgressView = ComponentBase.extend({

    // this.options
    // this.el
    // this.model

    initialize: function(args) {
      ComponentBase.prototype.initialize.apply(this, _.toArray(arguments));
      this.render();
    },

    setModel: function (model) {
      this.resultsetModel = this.model.submodel("resultset");
      this.resultsetModel.on("change", this.renderBar, this);
      ComponentBase.prototype.setModel.apply(this, arguments);
    },

    computing: function () {
      this.pagingAllowed = false;
      ComponentBase.prototype.computing.apply(this, arguments);
    },
  
    percentage: function() {
      var resultsLength = this.model.get("resultset.results").length;
      var estimatedCount = this.model.get("estimated_count");
      
      if (this.model.get("resultset.next_avail") === false) {
        if (!resultsLength) return null;
        return 100;
      }
      if (resultsLength > estimatedCount) return 100;
      if (estimatedCount && resultsLength) {
        var percent = resultsLength * 100 / estimatedCount;
        return Math.round(percent);
      }

      return null;
    },

    computed: function () {      
      ComponentBase.prototype.computed.apply(this, arguments);
      this.renderBar();
    },
   

    renderBar: function() {
      if (!this.el) return;

      if (this.progressBarEl) {
        this.el.removeChild(this.progressBarEl);
        this.progressBarEl = null;
      }

      var percent = null;
      try {
        percent = this.percentage();
      } catch (e) {
      }
      
      if (percent == null) {
        return;
      }

      var progressClass = "progress";
      if (percent < 100) {
        progressClass += " progress-striped active";
      }
      this.progressBarEl = this.make("div", {"class": progressClass});
      this.progressBarEl.appendChild(this.make(
        "div",
        {
          "class": "bar",
          "role": "progressbar",
          "aria-valuenow": percent,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "style": "width: " + percent + "%;"
        },
        percent + '%'
      ));

      this.el.appendChild(this.progressBarEl);
      
    },
        
    render: function() {
      this.renderBar();
      return this.el;
    },

    remove: function () {
      ComponentBase.prototype.remove.apply(this, arguments);
      this.dispose();
      return this;
    },

    dispose: function () {
      if (this.resultsetModel) {
        this.resultsetModel.dispose();
      }
    }
  });

  ResultsProgressTemplate.View = ResultsProgressView;

  return ResultsProgressTemplate;
});

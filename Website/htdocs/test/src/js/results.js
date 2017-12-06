/*========================================================================
* $Id: results.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "component!results",
    "backbone",
    "underscore"
  ], function (
    ResultsTemplate,
    Backbone,
    _
  ) {
    var root = document.getElementById("qunit-fixture"),
        resultsTemplate,
        model,
        view;

    module("Results", {
      setup: function () {
        resultsTemplate = new ResultsTemplate(root);
        model = {
          addResultCollection: function () {
          },
          nextPage: function () {
          },
          get: function () {
          }
        };
        _.extend(model, Backbone.Events);

        view = resultsTemplate.createView({
          application: {
            models: {}
          },
          model: model,
          node: {
            children: [{
              template: {
                createView: function (options) {
                  return new function () {
                    this.el = document.createElement("div");
                    this.render = function () {
                      this.el.innerHTML = options.model;
                      return this;
                    }
                  }();
                }
              }
            }]
          }
        });
      }
    });

    test( "Results rendering", function() {
      view.addOne(123, null, { at: 0 });

      equal(root.childNodes[0].innerHTML, "123", "child view is created");
    });

    test( "Results rendering with event", function() {
      // TODO: don't use collection directly
      view.collection.trigger("add", 123, view.collection, {});

      equal(root.childNodes[0].innerHTML, "123", "child view is created");
    });

    test( "Results rendering at correct position", function() {
      view.addOne(1, null, { at: 0 });
      view.addOne(3, null, { at: 1 });
      view.addOne(2, null, { at: 1 });

      equal(root.childNodes[0].innerHTML, "1", "1st element must contain 1");
      equal(root.childNodes[1].innerHTML, "2", "2nd element must contain 2");
      equal(root.childNodes[2].innerHTML, "3", "3rd element must contain 3");
    });
});

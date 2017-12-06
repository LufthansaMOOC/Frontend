/*========================================================================
* $Id: filteredfacets.js 84811 2015-06-22 05:54:05Z michael.biebl $
*
* Copyright © Mindbreeze Software GmbH, Linz, Austria, 2005-2014
*
* Der Nutzer des Computerprogramms anerkennt, dass der oben stehende
* Copyright-Vermerk im Sinn des Welturheberrechtsabkommens an der vom
* Urheber festgelegten Stelle in der Funktion des Computerprogramms
* angebracht bleibt, um den Vorbehalt des Urheberrechtes genuegend zum
* Ausdruck zu bringen. Dieser Urheberrechtsvermerk darf weder vom Kunden,
* Nutzer und/oder von Dritten entfernt, veraendert oder disloziert werden.
* =========================================================================*/


define ([
    "qunit",
    "jquery",
    "client/application",
    "component!filteredfacet",
    "test/helper"
  ], function(
    QUnit,
    $,
    Application,
    FilteredFacet,
    TestHelper
  ) {
    Mindbreeze.require(["component!inputdate", "component!suggest"], function () {

    QUnit.module("Filteredfacets");
    var data = {
      facets: [{
        id: "mes:date",
        configured: true,
        name: "Date",
        entries: [{
          html: "1",
          value: "1",
          query_expr: { unparsed: 1, id: "c1" },
          entries: [{
            html: "1.1",
            value: 1.1,
            query_expr: { unparsed: 1.1, id: "c11" }
          },{
            html: "1.2",
            value: 1.2,
            query_expr: { unparsed: 1.2, id: "c12" }
          }]
        }, {
          html: "2",
          value: 2,
          query_expr: { unparsed: 2, id: "c2" },
          entries: [{
            html: "2.1",
            value: 2.1,
            query_expr: { unparsed: 2.1, id: "c21" }
          },{
            html: "2.2",
            value: 2.2,
            query_expr: { unparsed: 2.2, id: "c22" }
          }]
        }]
      }]
    };

    QUnit.asyncTest("Options are passed correctly", function() {
        var dom = document.createElement("DIV");

        dom.innerHTML = '<div data-template="filteredfacets" data-user-input-isrange="true"></div>';

        new Application({
            channels: ["http://example1.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];
              application.models.search.output.load(data, { parse: true });
              TestHelper.retry(function () {
                if (!(view.children.instances[0].childView.userInputView && view.children.instances[0].childView.userInputView.options)) return false;

                equal(view.children.instances[0].childView.userInputView.options.isrange, "true");
                start();
              });
            }
        });
    });
  });

});

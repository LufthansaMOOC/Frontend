/*========================================================================
* $Id: constraints.js 98065 2017-05-11 15:06:51Z michael.biebl $
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


define ([
    "qunit",
    "client/application",
    "component!constraints",
    "underscore"
  ], function(
    QUnit,
    Application,
    ConstraintTemplate,
    _
  ) {

    var data = {
      "1": {
        "name": "1",
        "html": "1",
        "ids": [
          "1"
        ],
        "categories": [
          {
            "name": "Web1"
          }
        ],
        "query_expr": {
          "id": "c1",
          "unparsed": "QEDocuments1"
        },
        "source_ids": [
          "http://example1.mindbreeze.com"
        ]
      },
      "2": {
        "name": "2",
        "html": "2",
        "ids": [
          "2"
        ],
        "categories": [
          {
            "name": "Web2"
          }
        ],
        "query_expr": {
          "id": "c2",
          "unparsed": "QEDocuments2"
        },
        "source_ids": [
          "http://example2.mindbreeze.com"
        ]
      }
    }

    QUnit.asyncTest("QueryExprs are removed from source_context after data sources are disabled", function() {
        expect(4);
        var dom = document.createElement("DIV");

        dom.innerHTML = '<div data-template="view" data-id="main"><div data-template="constraints" data-model="userSourceInfo" data-path="sources.constraints"></div></div></div>';

        new Application({
            channels: ["http://example1.mindbreeze.com", "http://example2.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0].children[0]).instances.instances[0];

              application.models.userSourceInfo.load({
                sources: {
                  constraints: data
                }
              });

              _.defer(function () {
	              view.toggleFacetValue(true, view.collection.at(0), { silent: true });
  	            view.toggleFacetValue(true, view.collection.at(1), { silent: true });

	              application.models.channels.remove('http://example2.mindbreeze.com');

                ok(!!view.constraintsModel.get(view.filterID).filter_base.c2, "filter of example2 is active");
                ok(!!view.constraintsModel.get(view.filterID).filter_base.c1, "filter of example1 is active");

                view.collection.remove(view.collection.at(1));
                view.collection.remove(view.collection.at(0));

                _.defer(function () {
                  ok(!view.constraintsModel.get(view.filterID).filter_base.c2, "filter for removed channel is not active");
                  ok(!!view.constraintsModel.get(view.filterID).filter_base.c1, "filter for enabled channel is still active");

                  start();
                });
              });
            }
        });
    });
});

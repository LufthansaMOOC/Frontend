/*========================================================================
* $Id: savedsearches.js 98532 2017-05-31 13:11:18Z michael.biebl $
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
    "component!searchform"
  ], function(
    QUnit,
    $,
    Application,
    FilteredFacet
  ) {
    var savedSearches = localStorage.mbSavedSearches;
      localStorage.mbSavedSearches = JSON.stringify([{
          "name": "myquery old",
          "user": {
            "query": {
              "and": {
                "query": {
                  "unparsed": "myquery old"
                }
              }
            }
          },
          "edit":true
        },{
          "name": "myquery new",
          "request": {
            "user": {
              "query": {
                "and": {
                  "query": {
                    "unparsed": "myquery new",
                    "id": "query"
                  }
                }
              },
              "constraints": {}
            }
          },
          "edit":true
        }]);

      QUnit.module("SavedSearches");
      QUnit.asyncTest("serversaved vs. localStorage", function() {
          console.log(localStorage.mbSavedSearches);
          expect(3);
          var dom = document.createElement("DIV");

          dom.innerHTML = '<div data-template="savedsearches" data-serversaved="$$placeholder$$"></div>'

          new Application({
              channels: ["http://example1.mindbreeze.com"],
              rootEl: dom,
              startSearch: false,
              callback: function (application) {
                try {
                  var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0];
                  equal(view.options.serversaved, false, "serversaved default value is false");
                  deepEqual(application.models.savedSearches.at(0).getUser(), {query:{and:{query:{unparsed: "myquery old"}}}}, "user is parsed and return from old format");
                  deepEqual(application.models.savedSearches.at(1).getUser(), {constraints:{},query:{and:{query:{unparsed: "myquery new", id:"query"}}}}, "user is parsed and return from new format");
                  start();
                } finally {
                  localStorage.mbSavedSearches = savedSearches;
                }
              }
          });
      });
});

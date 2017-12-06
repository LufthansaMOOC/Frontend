/*========================================================================
* $Id: tabs.js 98065 2017-05-11 15:06:51Z michael.biebl $
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
    "jquery",
    "underscore",
    "client/application",
    "utils/localStorage",
    "component!tabs"
  ], function(
    QUnit,
    $,
    _,
    Application,
    localStorage,
    TabsTemplate
  ) {

    assertTabs("Everything tab IS added for datasource tabs when there ARE NO profile tabs", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "Everything", selected: true },
                 { name: "ds1" }
               ]
    );

    assertTabs("Everything tab IS NOT added if there ARE NO datasource tabs", { }, [], []);

    assertTabs("Everything tab IS NOT added if there ARE profile tabs", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "MyXyz", selected: true },
                 { name: "ds1" }
               ],
               [{
                   name: "MyXyz",
                   constraint: {
                     unparsed: "test"
                   }
               }]
             );

    assertTabs("Everything tab IS NOT added if there ARE configured tabs", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "Arztbriefe", selected: true },
                 { name: "Arzneimittel" },
                 { name: "ds1" }
               ],
               [],
               '<script type="text/x-mustache-template" data-tabconfig="true" data-name="Arztbriefe" data-constraint="categoryclass:HealthCareDocument"></script><script type="text/x-mustache-template" data-tabconfig="true" data-name="Arzneimittel" data-constraint="categoryclass:Medikation"></script>'
             );

    assertTabs("Everything tab IS NOT added if there ARE configured and profile tabs", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "MyXyz", selected: true },
                 { name: "Arztbriefe" },
                 { name: "Arzneimittel" },
                 { name: "ds1" }
               ],
               [{
                   name: "MyXyz",
                   constraint: {
                     unparsed: "test"
                   }
               }],
               '<script type="text/x-mustache-template" data-tabconfig="true" data-name="Arztbriefe" data-constraint="categoryclass:HealthCareDocument"></script><script type="text/x-mustache-template" data-tabconfig="true" data-name="Arzneimittel" data-constraint="categoryclass:Medikation"></script>'
             );
            
    // ------------------------ editable ---------------------
    
    assertTabs("Everything tab IS added for datasource tabs when there ARE NO profile tabs AND tabs ARE EDITABLE", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "Everything", selected: true },
                 { name: "ds1" },
                 { name: "test" }
               ],
               null,
               null,
               true
    );

    assertTabs("Everything tab IS added if there ARE NO datasource tabs AND tabs ARE EDITABLE", { }, [
       { name: "Everything", selected: true },
       { name: "test" }
      ], [], null, true);

    assertTabs("Everything tab IS NOT added if there ARE profile tabs AND tabs ARE EDITABLE", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "MyXyz", selected: true },
                 { name: "ds1" },
                 { name: "test" }
               ],
               [{
                   name: "MyXyz",
                   constraint: {
                     unparsed: "test"
                   }
               }],
               null,
               true
             );

    assertTabs("Everything tab IS NOT added if there ARE configured tabs AND tabs ARE EDITABLE", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "Arztbriefe", selected: true },
                 { name: "Arzneimittel" },
                 { name: "ds1" },
                 { name: "test" }
               ],
               [],
               '<script type="text/x-mustache-template" data-tabconfig="true" data-name="Arztbriefe" data-constraint="categoryclass:HealthCareDocument"></script><script type="text/x-mustache-template" data-tabconfig="true" data-name="Arzneimittel" data-constraint="categoryclass:Medikation"></script>',
               true
             );

    assertTabs("Everything tab IS NOT added if there ARE configured and profile tabs AND tabs ARE EDITABLE", {
                 ds1: {
                   query_expr: {
                     id: "ds1"
                   },
                   name: "ds1"
                 }
               },
               [
                 { name: "MyXyz", selected: true },
                 { name: "Arztbriefe" },
                 { name: "Arzneimittel" },
                 { name: "ds1" },
                 { name: "test" }
               ],
               [{
                   name: "MyXyz",
                   constraint: {
                     unparsed: "test"
                   }
               }],
               '<script type="text/x-mustache-template" data-tabconfig="true" data-name="Arztbriefe" data-constraint="categoryclass:HealthCareDocument"></script><script type="text/x-mustache-template" data-tabconfig="true" data-name="Arzneimittel" data-constraint="categoryclass:Medikation"></script>',
               true
             );
// -------------------------------- helper functions -----------------------------------------

    function assertTabs(name, dataSources, expectedTabs, searchSources, tabConfig, editable) {
      tabConfig = tabConfig || '';

      QUnit.asyncTest(name, function() {

          //var dom = document.createElement("DIV");
          //document.documentElement.appendChild(dom);
          var savedTabs = localStorage.mbSavedTabs;

          var dom = $.parseHTML('<div data-template="view" data-id="main"><div class="test_view" data-editable="' + (!!editable) + '" data-template="tabs" data-datasourcetabs="true" data-model="tabs">' + tabConfig + '</div></div>')[0];

          if (editable) {
            try {
              localStorage.mbSavedTabs = JSON.stringify([{"name":"test","constraint":{"unparsed":"test","name":"test"},"user_query":null,"edit":true,"editable":true,"customTab":true,"selected":false}]);
            } catch (e) {
            }
          }

          new Application({
              channels: [],
              rootEl: dom,
              startSearch: false,
              enableProfile: true,
              callback: function (application) {
                var view = application.templateTree.getTemplateByEl(dom.querySelectorAll(".test_view")[0]).instances[0];

                application.models.profile.load({
                    show_data_source_tabs: true,
                    search_sources: searchSources
                });

                application.models.userSourceInfo.load({
                    sources: {
                      data_sources: dataSources
                    }
                });

                
                _.defer(function () {
                  var view = application.templateTree.getTemplateByEl(dom.querySelectorAll(".test_view")[0]).instances.instances[0];
                  // console.log("test", name);
                  // console.log(dom.innerHTML);
                  equal(view.model.length, expectedTabs.length, "Number of tabs should be " + expectedTabs.length);
                  _.each(expectedTabs, function(expectedTab, index) {
                    if (view.model.length <= index) return;

                    var tab = view.model.models[index];
                    equal(tab.get("name"), expectedTab.name, expectedTab.name + " has to be tab #" + index);
                    equal(tab.get("selected"), !!expectedTab.selected, expectedTab.name + (expectedTab.selected ? " has to" : " must not") + " be selected");
                 });
                 start();
                 try {
                   localStorage.mbSavedTabs = savedTabs;
                 } catch (e) {
                 }
                });
              }
          });
     });
    }
});

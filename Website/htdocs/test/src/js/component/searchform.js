/*========================================================================
* $Id: searchform.js 84080 2015-04-29 18:59:12Z michael.biebl $
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

    QUnit.module("Searchform");
    QUnit.asyncTest("Inputmodel Changes Silently After Input Value Changes", function() {
        expect(1);
        var dom = document.createElement("DIV");

        dom.innerHTML = '<form data-template="searchform"><input name="query" data-template="suggest"></form>'

        new Application({
            channels: ["http://example1.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0],
                  suggestView = application.templateTree.getTemplateByEl(dom.getElementsByTagName("input")[0]);

                view.model.input.on("change", function () {
                    ok(false, "change event must not occur");
                });
                suggestView.el.value = "test";
                suggestView.$el.trigger("change");
                suggestView.$el.trigger("blur");

                equal(view.model.input.get(application.formqueryadapter.field("query").path.concat("unparsed")), "test", "Query is updated");
                start();
            }
        });
    });

    QUnit.asyncTest("Inputmodel Changes After Input Value Changes", function() {
        expect(2);
        var dom = document.createElement("DIV");

        dom.innerHTML = '<form data-template="searchform"><input name="query" data-template="suggest"></form>'

        new Application({
            channels: ["http://example1.mindbreeze.com"],
            rootEl: dom,
            startSearch: false,
            callback: function (application) {
              var view = application.templateTree.getTemplateByEl(dom.children[0]).instances.instances[0],
                  suggestView = application.templateTree.getTemplateByEl(dom.getElementsByTagName("input")[0]);

                var triggeredChange = false;
                view.model.input.on("change", function () {
                    ok(!triggeredChange, "change event must occur exactly once");
                    triggeredChange = true;
                });
                suggestView.el.value = "test";
                var e = $.Event("keypress");
                e.keyCode = 13;
                suggestView.$el.trigger(e);
                suggestView.$el.trigger("change");
                suggestView.$el.trigger("blur");

                equal(view.model.input.get(application.formqueryadapter.field("query").path.concat("unparsed")), "test", "Query is updated");
                start();
            }
        });
    });
});

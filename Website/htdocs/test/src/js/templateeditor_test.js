/*========================================================================
* $Id: templateeditor_test.js 74835 2013-09-05 20:50:30Z jakob.praher $
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
    "jquery",
    "editors/template/js/template",
    "client/template"
  ], function (
    $,
    TemplateEditor,
    Template
  ) {
    var el = document.getElementById("qunit-fixture"),
        template;

    module("Editor", {
      setup: function () {
      }
    });

    test("Basic editing of template", function() {
      template = new (Template.extend({
        schema: new Template.Schema({
          inputAttributes: {
            test: {
              type: "string"
            }
          }
        })
      }))(el);
      template.set("test", "test-value");
      template.set("test2", "test2-value");

      var editor = new TemplateEditor({
          value: template,
          model: null
      }),
      form = document.createElement("form");
      form.appendChild(editor.render().el);
      el.appendChild(form);

      equal(form.getElementsByTagName("input")[0].value, "test-value", "test-value is the value of the test input"); 
      
      form.getElementsByTagName("input")[0].value = "new-test-value";
      
      editor.on("change", function () {
        editor.update();
      });

      $(form.getElementsByTagName("input")[0]).trigger("change");

      equal(template.get("test"), "new-test-value", "test-value is the value of the test input"); 
      equal(template.get("test2"), "test2-value", "test-value is the value of the test input"); 
    });
});

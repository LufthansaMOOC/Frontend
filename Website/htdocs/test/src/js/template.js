/*========================================================================
* $Id: template.js 86255 2015-09-03 12:40:45Z michael.biebl $
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
    "client/template"
  ], function (
    Template
  ) {
    var el = document.getElementById("qunit-fixture"),
        template;

    module("Template", {
      setup: function () {
      }
    });

    test("Template attribute parsing", function() {
      el.setAttribute("data-test", "test-value");
      el.setAttribute("data-test2", "test2-value");

      template = new (Template.extend({
        schema: new Template.Schema({
          inputAttributes: {
            test: {
              type: "string"
            },
            testBoolean: {
              type: "boolean",
              "default": false
            }
          }
        })
      }))(el);

      equal(template.get("test"), "test-value", "test is part of attributes"); 
      
      equal(template.getInputAttributes().test, "test-value", "test is part of input attributes"); 
      
      equal(template.get("test2"), "test2-value", "test2 is part of attributes"); 
      
      equal(template.getInputAttributes().test2, undefined, "test2 is part of input attributes"); 

      equal(template.schema.parseAttribute(null, "testBoolean", false), false, "boolean default value is used");
      equal(template.schema.parseAttribute(null, "testBoolean", true), true, "boolean default value is used");
    });

    test("Serialization", function() {
      el.setAttribute("data-test", "test-value");
      el.setAttribute("data-test2", "test2-value");

      var CustomTemplate = Template.extend({
        schema: new Template.Schema({
          inputAttributes: {
            test: {
              type: "string"
            }
          }
        })
      });

      template = new CustomTemplate(el);
      template.set("test", "new-test-value");
      template.set("test2", "");

      var newEl = document.createElement("div");
      newEl.innerHTML = template.serialize();
      var newTemplate = new CustomTemplate(newEl.childNodes[0]);

      template.removeAttribute("test2");

      deepEqual(newTemplate.get(), template.get(), "reinitialized template must be the same as serialized"); 
    });
});

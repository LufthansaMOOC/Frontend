/*===========================================================================
* $Id: basic.js 98419 2017-05-29 08:58:04Z daniel.eppensteiner $
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
    "text!test/basic.html",
    "client/templatetree"
  ], function (
    basicHtml,
    TemplateTree
  ) {
    var root = document.getElementById("qunit-fixture"),
        templateTree,
        model = {
          on: function () {
          },

          get: function () {
          },

          off: function () {
          },

          set: function () {
          },

          addResultCollection: function () {
          }
        };
    
    function buildingTest () {
      equal(templateTree.rootNode.templateType, "search", "rootNode is of type search, given by argument");
      equal(templateTree.rootNode.children.length, 1, "rootNode has 1 child");
      equal(templateTree.rootNode.children[0].templateType, "view", "rootNode has 1 child of type 'view'");
      equal(templateTree.rootNode.children[0].children.length, 3, "view node has 3 children");
      equal(templateTree.rootNode.children[0].children[0].templateType, "results", "view node has 2 children of type 'results'");
      equal(templateTree.rootNode.children[0].children[1].templateType, "results", "view node has 2 children of type 'results'");
      equal(templateTree.rootNode.children[0].children[0].children.length, 1, "results node has 1 child");
      equal(templateTree.rootNode.children[0].children[0].children[0].templateType, "mustache", "results node has 1 child of type 'mustache'");
      equal((templateTree.rootNode.children[0].children[0].children[0].el.innerHTML + "").replace(/^\s+|\s+$/g, ""), "{{{title}}}", "mustache view has content of '{{{title}}}'");
      equal(templateTree.rootNode.children[0].children[1].children.length, 1, "results node has 1 child");
      equal(templateTree.rootNode.children[0].children[1].children[0].templateType, "mustache", "results node has 1 child of type 'mustache'");
    }
    
    function initializationTest () {
      templateTree.initialize(null, model, function () {
        equal(templateTree.rootNode.template.instances.length, 1, "1 view for root template");
        equal(templateTree.rootNode.children[0].template.instances.length, 1, "1 view for view template");
        equal(templateTree.rootNode.children[0].children[0].template.instances.length, 1, "1 view for results");
        equal(templateTree.rootNode.children[0].children[1].template.instances.length, 1, "1 view for results");
        equal(templateTree.rootNode.children[0].children[0].children[0].template.instances.length, 0, "result subviews are not instantiated");
        equal(templateTree.rootNode.children[0].children[1].children[0].template.instances.length, 0, "result subviews are not instantiated");
        start();
      });
    }
    
    function reinitializationTest () {
      templateTree.initialize(null, model, function () {
          templateTree.destroy(function () {
              templateTree = new TemplateTree(root, "search");
              templateTree.initialize(null, model, function () {
                  equal(templateTree.rootNode.template.instances.length, 1, "1 view for root template");
                  equal(templateTree.rootNode.children[0].template.instances.length, 1, "1 view for view template");
                  equal(templateTree.rootNode.children[0].children[0].template.instances.length, 1, "1 view for results");
                  equal(templateTree.rootNode.children[0].children[1].template.instances.length, 1, "1 view for results");
                  equal(templateTree.rootNode.children[0].children[0].children[0].template.instances.length, 0, "result subviews are not instantiated");
                  equal(templateTree.rootNode.children[0].children[1].children[0].template.instances.length, 0, "result subviews are not instantiated");
                  start();
              });
          });
      });
    }

    function mustachePropertiesTest () {
      templateTree.initialize(null, model, function () {
        deepEqual(templateTree.rootNode.children[0].children[0].children[0].template.properties, 
            {"title": {"format": "HTML"}}, "first mustache template has title property");
        
        deepEqual(templateTree.rootNode.children[0].children[1].children[0].template.properties, 
            {
              "Author": {
                "format": "PROPERTY"
              },
              "breadcrumbs": {
                "format": "PROPERTY"
              },
              "content": {
                "format": "HTML"
              },
              "mesthumbnailurl": {
                "format": "PROPERTY"
              },
              "title": {
                "format": "HTML"
              }
            },            
            "more complex mustache template");
        
        deepEqual(templateTree.rootNode.children[0].children[2].children[0].template.properties, 
            {
              "actions": {
                "format": "PROPERTY"
              },
              "actions[0]": {
                "format": "HTML"
              },
              "content": {
                "format": "HTML"
              },
              "store:modificationdate[0]": {
                "format": "VALUE"
              }
            },            
            "third mustache neseted properties are not demanded.");
        start();
      });
    }

    module("Template Trees", {
      setup: function () {
        root.innerHTML = basicHtml;

        templateTree = new TemplateTree(root, "search");
      }
    });

    test("Template Tree Building", buildingTest);
    asyncTest("Template Tree Initialization", initializationTest);
    asyncTest("Template Tree Reinitialization", reinitializationTest);
    asyncTest("Mustache properties", mustachePropertiesTest);

    module("Template Trees with String & Container", {
      setup: function () {
        root.innerHTML = "";

        templateTree = new TemplateTree(root, "search", basicHtml);
      }
    });

    test("Template Tree Building", buildingTest);
    asyncTest("Template Tree Initialization", initializationTest);
    asyncTest("Template Tree Reinitialization", reinitializationTest);
    asyncTest("Mustache properties", mustachePropertiesTest);

    module("Template Trees with initializationPromises", {
      setup: function () {
        root.innerHTML = "";

        templateTree = new TemplateTree(root, "search", '<div data-template="initializationPromise"></div>');
      }
    });
    asyncTest("Template Tree Building with initializationPromises", function buildingTest () {
      Mindbreeze.define(
        "component!initializationPromise",
        [
          "client/template",
          "service/channel"
        ], function (
          Template,
          Channel
        ) {

          var InitializationPromiseTemplate =  Template.extend({
            initialize: function () {
              var that = this;
              this.initializationPromise = new Channel.DeferredCallFinished();
              Template.prototype.initialize.apply(this, arguments);
              window.setTimeout(function () {
                that.testInitialize = true;
                that.initializationPromise.triggerDone();
              }, 100);
            }
          });

          InitializationPromiseTemplate.View = function () {};

          return InitializationPromiseTemplate;

      });

      templateTree.initialize(null, model, function () {
        equal(templateTree.rootNode.template.children[0].template.testInitialize, true, "callback is invoked when initializationPromise is resolved");
        start();
      });
    });
});
